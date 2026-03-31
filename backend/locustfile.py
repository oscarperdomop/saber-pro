import os
import random
import unicodedata
from collections import defaultdict
from typing import Any

from locust import HttpUser, between, task


class EstudianteSimulado(HttpUser):
    """
    Flujo alineado a rutas reales:
    - Login: /api/auth/login/
    - Examenes: /api/evaluaciones/estudiante/examenes/
    - Intentos: /api/evaluaciones/estudiante/mis-intentos/
    - Cargar respuestas: /api/evaluaciones/estudiante/mis-intentos/{id}/cargar_respuestas/
    - Guardar respuesta: /api/evaluaciones/estudiante/respuestas/{id}/
    - Finalizar simulacro: /api/evaluaciones/estudiante/mis-intentos/{id}/finalizar/
    """

    host = os.getenv('LOCUST_HOST', 'http://127.0.0.1:8000')
    wait_time = between(1, 2)

    @staticmethod
    def _normalize_text(value: str) -> str:
        normalized = unicodedata.normalize('NFKD', value or '')
        no_accents = ''.join(ch for ch in normalized if not unicodedata.combining(ch))
        return ' '.join(no_accents.lower().strip().split())

    def on_start(self) -> None:
        self._flujo_ejecutado = False
        self._can_run = True
        self._login_ok = False
        self._intento_id: str | None = None

        fixed_email = str(os.getenv('TEST_USER_EMAIL', '')).strip()
        fixed_password = str(os.getenv('TEST_USER_PASSWORD', '')).strip()

        if fixed_email and fixed_password:
            email = fixed_email
            password = fixed_password
        else:
            user_start = int(os.getenv('TEST_USER_START', '1'))
            user_end = int(os.getenv('TEST_USER_END', '100'))
            idx = random.randint(user_start, user_end)
            prefix = os.getenv('TEST_USER_PREFIX', 'test')
            domain = os.getenv('TEST_USER_DOMAIN', 'usco.edu.co')
            email = f'{prefix}{idx}@{domain}'
            password = str(1234567890 + idx - 1)

        payload = {'correo_institucional': email, 'password': password}
        with self.client.post('/api/auth/login/', json=payload, catch_response=True) as response:
            if response.status_code != 200:
                response.failure(
                    f'Login fallo para {email}. status={response.status_code} body={response.text}'
                )
                self._can_run = False
                return

            data = response.json()
            token = data.get('access')
            if not token:
                response.failure(f'Login sin token access para {email}. body={response.text}')
                self._can_run = False
                return

            self.client.headers.update({'Authorization': f'Bearer {token}'})
            self._login_ok = True
            response.success()

    def _get_json(self, path: str, *, params: dict[str, Any] | None = None) -> list[Any] | dict[str, Any]:
        response = self.client.get(path, params=params)
        if response.status_code != 200:
            return {}
        try:
            return response.json()
        except ValueError:
            return {}

    def _resolver_intento(self) -> str | None:
        examenes = self._get_json('/api/evaluaciones/estudiante/examenes/')
        if not isinstance(examenes, list) or len(examenes) == 0:
            return None

        objetivo_titulo = self._normalize_text(
            os.getenv('TARGET_SIMULACRO_TITLE', 'Test carga y estres')
        )
        examenes_objetivo = [
            examen
            for examen in examenes
            if self._normalize_text(str(examen.get('titulo') or '')) == objetivo_titulo
        ]
        if not examenes_objetivo:
            # Fallback por coincidencia parcial.
            examenes_objetivo = [
                examen
                for examen in examenes
                if objetivo_titulo in self._normalize_text(str(examen.get('titulo') or ''))
            ]

        if not examenes_objetivo:
            return None

        plantillas_objetivo_ids = {str(examen.get('id')) for examen in examenes_objetivo if examen.get('id')}
        if not plantillas_objetivo_ids:
            return None

        intentos = self._get_json('/api/evaluaciones/estudiante/mis-intentos/')
        intentos_list = intentos if isinstance(intentos, list) else []

        # 1) Retoma intento en progreso del simulacro objetivo.
        for intento in intentos_list:
            if (
                str(intento.get('plantilla_examen')) in plantillas_objetivo_ids
                and intento.get('estado') == 'En Progreso'
                and intento.get('id')
            ):
                return str(intento['id'])

        # 2) Construye índice de intentos por plantilla.
        intentos_por_plantilla: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for intento in intentos_list:
            plantilla = intento.get('plantilla_examen')
            if plantilla and str(plantilla) in plantillas_objetivo_ids:
                intentos_por_plantilla[str(plantilla)].append(intento)

        # 3) Prueba iniciar en plantilla objetivo no terminal.
        candidatas: list[str] = []
        for examen in examenes_objetivo:
            plantilla_id = str(examen.get('id'))
            intentos_plantilla = intentos_por_plantilla.get(plantilla_id, [])

            en_progreso = next(
                (
                    intento
                    for intento in intentos_plantilla
                    if intento.get('estado') == 'En Progreso' and intento.get('id')
                ),
                None,
            )
            if en_progreso:
                return str(en_progreso['id'])

            estado_terminal = any(
                intento.get('estado') in ('Finalizado', 'Pendiente Calificacion')
                for intento in intentos_plantilla
            )
            if estado_terminal:
                continue

            candidatas.append(plantilla_id)

        for plantilla_id in candidatas:
            with self.client.post(
                f'/api/evaluaciones/estudiante/examenes/{plantilla_id}/iniciar_intento/',
                catch_response=True,
            ) as response:
                if response.status_code in (200, 201):
                    data = response.json()
                    intento_id = data.get('intento_id') or data.get('id')
                    if intento_id:
                        response.success()
                        return str(intento_id)
                    response.failure(f'Respuesta sin intento_id: {response.text}')
                    continue

                # 400 esperables de negocio:
                # - intento ya iniciado
                # - no hay suficientes preguntas publicadas
                # En ambos casos: intentar con otra plantilla.
                if response.status_code == 400:
                    if 'iniciado' in response.text.lower():
                        response.success()
                        refresh = self._get_json('/api/evaluaciones/estudiante/mis-intentos/')
                        if isinstance(refresh, list):
                            for intento in refresh:
                                if (
                                    str(intento.get('plantilla_examen')) == plantilla_id
                                    and intento.get('estado') == 'En Progreso'
                                    and intento.get('id')
                                ):
                                    return str(intento['id'])
                    else:
                        response.success()
                    continue

                response.failure(
                    f'No se pudo iniciar intento. status={response.status_code} body={response.text}'
                )

        return None

    def _responder_todas_las_preguntas(self, intento_id: str) -> bool:
        respuestas_data = self._get_json(
            f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/'
        )
        if not isinstance(respuestas_data, list):
            return False

        por_modulo: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for respuesta in respuestas_data:
            pregunta = respuesta.get('pregunta') or {}
            modulo_id = str(pregunta.get('modulo_id') or 'sin_modulo')
            por_modulo[modulo_id].append(respuesta)

        for modulo_id, respuestas_modulo in por_modulo.items():
            # Simula navegación por módulo (pantalla del motor).
            self.client.get(
                f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/',
                params={'modulo': modulo_id},
            )

            for respuesta in respuestas_modulo:
                respuesta_id = respuesta.get('id')
                pregunta = respuesta.get('pregunta') or {}
                opciones = pregunta.get('opciones') or []

                if not respuesta_id or not isinstance(opciones, list) or len(opciones) == 0:
                    continue

                if respuesta.get('opcion_seleccionada'):
                    continue

                opcion = random.choice(opciones)
                opcion_id = opcion.get('id')
                if not opcion_id:
                    continue

                payload = {'opcion_seleccionada': opcion_id}
                with self.client.patch(
                    f'/api/evaluaciones/estudiante/respuestas/{respuesta_id}/',
                    json=payload,
                    catch_response=True,
                ) as patch_response:
                    if patch_response.status_code in (200, 202):
                        patch_response.success()
                    else:
                        patch_response.failure(
                            f'Error guardando respuesta {respuesta_id}. '
                            f'status={patch_response.status_code} body={patch_response.text}'
                        )

            # Finalizar módulo no tiene endpoint dedicado en backend actual.
            # Se deja la validación por recarga del módulo.
            self.client.get(
                f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/',
                params={'modulo': modulo_id},
            )

        # Verificacion final: no dejar preguntas sin responder.
        resumen_final = self._get_json(
            f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/'
        )
        if isinstance(resumen_final, list):
            for respuesta in resumen_final:
                if respuesta.get('opcion_seleccionada'):
                    continue
                respuesta_id = respuesta.get('id')
                pregunta = respuesta.get('pregunta') or {}
                opciones = pregunta.get('opciones') or []
                if not respuesta_id or not isinstance(opciones, list) or len(opciones) == 0:
                    continue
                opcion = random.choice(opciones)
                opcion_id = opcion.get('id')
                if not opcion_id:
                    continue
                self.client.patch(
                    f'/api/evaluaciones/estudiante/respuestas/{respuesta_id}/',
                    json={'opcion_seleccionada': opcion_id},
                )

        return True

    @task
    def flujo_examen_completo(self) -> None:
        if self._flujo_ejecutado or not self._can_run:
            return

        if not self._login_ok:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        intento_id = self._resolver_intento()
        if not intento_id:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        self._intento_id = intento_id

        ok = self._responder_todas_las_preguntas(intento_id)
        if not ok:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        with self.client.post(
            f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/finalizar/',
            catch_response=True,
        ) as response:
            if response.status_code in (200, 201):
                response.success()
            else:
                response.failure(
                    f'Error finalizando intento {intento_id}. '
                    f'status={response.status_code} body={response.text}'
                )

        self.client.get(f'/api/evaluaciones/estudiante/mis-intentos/{intento_id}/resumen_resultados/')

        self._flujo_ejecutado = True
        self._can_run = False
