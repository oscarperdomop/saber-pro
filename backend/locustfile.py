"""
locustfile.py — Simulador de Carga: Viaje Completo del Estudiante
=================================================================
Arquitectura:
  - FastHttpUser  : cliente HTTP de alta performance (geventhttpclient).
  - on_start      : login único por VU; token Bearer persiste en headers.
  - @task         : flujo determinista de un examen completo.

Env vars relevantes:
  LOCUST_HOST           → URL base del backend        (default: http://127.0.0.1:8000)
  TEST_USER_EMAIL       → email fijo (opcional)
  TEST_USER_PASSWORD    → password fijo (opcional)
  TEST_USER_PREFIX      → prefijo email pool           (default: test)
  TEST_USER_DOMAIN      → dominio email pool           (default: usco.edu.co)
  TEST_USER_START       → primer índice del pool       (default: 1)
  TEST_USER_END         → último índice del pool       (default: 100)
  TARGET_SIMULACRO_TITLE→ título del simulacro objetivo(default: Test carga y estres)
  MAX_PREGUNTAS         → preguntas a responder por VU (default: 0 = todas)
  THINK_TIME_MIN        → segundos mínimos de "lectura" (default: 5)
  THINK_TIME_MAX        → segundos máximos de "lectura" (default: 15)
"""

from __future__ import annotations

import os
import random
import time
import unicodedata
from collections import defaultdict
from typing import Any

from locust import between, task
from locust.contrib.fasthttp import FastHttpUser


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize(value: str) -> str:
    """Elimina tildes, normaliza mayúsculas y colapsa espacios."""
    nfkd = unicodedata.normalize("NFKD", value or "")
    no_accents = "".join(ch for ch in nfkd if not unicodedata.combining(ch))
    return " ".join(no_accents.lower().strip().split())


def _get_env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


# ---------------------------------------------------------------------------
# Usuario Virtual
# ---------------------------------------------------------------------------

class EstudianteSimulado(FastHttpUser):
    """
    Simula el viaje completo de un estudiante en una sesión de examen:
      1. Login (on_start, una sola vez por VU).
      2. Listing de simulacros disponibles.
      3. Inicio atómico de IntentoExamen (tolerante a race-condition 200/201).
      4. Carga de respuestas del intento.
      5. Iteración por preguntas con think-time realista.
      6. Finalización del examen.
      7. Consulta del resumen de resultados.
    """

    host: str = os.getenv("LOCUST_HOST", "http://127.0.0.1:8000")

    # wait_time entre repeticiones del @task (no entre preguntas individuales).
    # Se usa between corto porque el think-time real está dentro del task.
    wait_time = between(1, 3)

    # ------------------------------------------------------------------
    # Estado por instancia (VU)
    # ------------------------------------------------------------------
    _can_run: bool
    _login_ok: bool
    _flujo_ejecutado: bool
    _intento_id: str | None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def on_start(self) -> None:
        """Inicializa el VU y hace login (una sola vez por VU)."""
        self._can_run = True
        self._login_ok = False
        self._flujo_ejecutado = False
        self._intento_id = None

        email, password = self._resolver_credenciales()
        self._hacer_login(email, password)

    # ------------------------------------------------------------------
    # Autenticación
    # ------------------------------------------------------------------

    @staticmethod
    def _resolver_credenciales() -> tuple[str, str]:
        fixed_email = str(os.getenv("TEST_USER_EMAIL", "")).strip()
        fixed_password = str(os.getenv("TEST_USER_PASSWORD", "")).strip()

        if fixed_email and fixed_password:
            return fixed_email, fixed_password

        start = _get_env_int("TEST_USER_START", 1)
        end = _get_env_int("TEST_USER_END", 100)
        idx = random.randint(start, end)
        prefix = os.getenv("TEST_USER_PREFIX", "test")
        domain = os.getenv("TEST_USER_DOMAIN", "usco.edu.co")
        email = f"{prefix}{idx}@{domain}"
        password = str(1_234_567_890 + idx - 1)
        return email, password

    def _hacer_login(self, email: str, password: str) -> None:
        """
        POST /api/auth/login/
        Guarda el access token en los headers HTTP del cliente.
        Rate-limit: al ser on_start(), cada VU ejecuta esto UNA sola vez.
        """
        payload = {"correo_institucional": email, "password": password}
        with self.client.post(
            "/api/auth/login/",
            json=payload,
            catch_response=True,
            name="/api/auth/login/",
        ) as resp:
            if resp.status_code != 200:
                resp.failure(
                    f"[LOGIN_FAIL] {email} → HTTP {resp.status_code}: {resp.text[:200]}"
                )
                self._can_run = False
                return

            data = resp.json()
            token = data.get("access")
            if not token:
                resp.failure(
                    f"[LOGIN_NO_TOKEN] {email} → body={resp.text[:200]}"
                )
                self._can_run = False
                return

            # Token persiste en cada petición posterior de este VU.
            self.client.headers["Authorization"] = f"Bearer {token}"
            self._login_ok = True
            resp.success()

    # ------------------------------------------------------------------
    # Helpers HTTP
    # ------------------------------------------------------------------

    def _get_json(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        name: str | None = None,
    ) -> list[Any] | dict[str, Any]:
        resp = self.client.get(path, params=params, name=name or path)
        if resp.status_code != 200:
            return {}
        try:
            return resp.json()
        except ValueError:
            return {}

    # ------------------------------------------------------------------
    # Resolución / inicio del IntentoExamen
    # ------------------------------------------------------------------

    def _resolver_intento(self) -> str | None:
        """
        Localiza o crea un IntentoExamen válido para el simulacro objetivo.
        Lógica:
          1. Retoma intento "En Progreso" existente.
          2. Si no hay, intenta iniciar uno nuevo (POST atómico).
          3. Tolera 400 "ya iniciado" y recupera el id desde mis-intentos.
        """
        examenes = self._get_json(
            "/api/evaluaciones/estudiante/examenes/",
            name="/api/evaluaciones/estudiante/examenes/ [list]",
        )
        if not isinstance(examenes, list) or not examenes:
            return None

        titulo_objetivo = _normalize(
            os.getenv("TARGET_SIMULACRO_TITLE", "Test carga y estres")
        )

        examenes_objetivo = [
            e for e in examenes
            if _normalize(str(e.get("titulo") or "")) == titulo_objetivo
        ]

        # Fallback: coincidencia parcial.
        if not examenes_objetivo:
            examenes_objetivo = [
                e for e in examenes
                if titulo_objetivo in _normalize(str(e.get("titulo") or ""))
            ]

        if not examenes_objetivo:
            return None

        ids_objetivo = {str(e.get("id")) for e in examenes_objetivo if e.get("id")}
        if not ids_objetivo:
            return None

        # --- 1. Intento en progreso existente ---
        intentos = self._get_json(
            "/api/evaluaciones/estudiante/mis-intentos/",
            name="/api/evaluaciones/estudiante/mis-intentos/ [list]",
        )
        intentos_list: list[dict[str, Any]] = (
            intentos if isinstance(intentos, list) else []
        )

        for intento in intentos_list:
            if (
                str(intento.get("plantilla_examen")) in ids_objetivo
                and intento.get("estado") == "En Progreso"
                and intento.get("id")
            ):
                return str(intento["id"])

        # --- 2. Índice de intentos por plantilla ---
        por_plantilla: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for intento in intentos_list:
            pid = str(intento.get("plantilla_examen") or "")
            if pid in ids_objetivo:
                por_plantilla[pid].append(intento)

        # --- 3. Iniciar intento en plantilla sin estado terminal ---
        candidatas = [
            str(e.get("id"))
            for e in examenes_objetivo
            if str(e.get("id")) not in {
                str(e.get("id"))
                for pid, intentos_p in por_plantilla.items()
                for e in intentos_p
                if e.get("estado") in ("Finalizado", "Pendiente Calificacion")
            }
            and not any(
                i.get("estado") in ("Finalizado", "Pendiente Calificacion")
                for i in por_plantilla.get(str(e.get("id")), [])
            )
        ]

        for plantilla_id in candidatas:
            with self.client.post(
                f"/api/evaluaciones/estudiante/examenes/{plantilla_id}/iniciar_intento/",
                catch_response=True,
                name="/api/evaluaciones/estudiante/examenes/{id}/iniciar_intento/",
            ) as resp:
                # Blindaje atómico: 200 o 201 = OK
                if resp.status_code in (200, 201):
                    data = resp.json()
                    intento_id = data.get("intento_id") or data.get("id")
                    if intento_id:
                        resp.success()
                        return str(intento_id)
                    resp.failure(f"[INTENTO_SIN_ID] plantilla={plantilla_id} body={resp.text[:200]}")
                    continue

                # 400 esperado de negocio: "ya iniciado" → buscar id en mis-intentos.
                if resp.status_code == 400:
                    if "iniciado" in resp.text.lower():
                        resp.success()
                        refresh = self._get_json(
                            "/api/evaluaciones/estudiante/mis-intentos/",
                            name="/api/evaluaciones/estudiante/mis-intentos/ [list]",
                        )
                        if isinstance(refresh, list):
                            for intento in refresh:
                                if (
                                    str(intento.get("plantilla_examen")) == plantilla_id
                                    and intento.get("estado") == "En Progreso"
                                    and intento.get("id")
                                ):
                                    return str(intento["id"])
                    else:
                        # 400 por falta de preguntas u otra regla de negocio → OK esperado.
                        resp.success()
                    continue

                resp.failure(
                    f"[INICIAR_INTENTO_ERROR] plantilla={plantilla_id} "
                    f"HTTP {resp.status_code}: {resp.text[:200]}"
                )

        return None

    # ------------------------------------------------------------------
    # Responder preguntas (con think-time realista)
    # ------------------------------------------------------------------

    def _responder_preguntas(self, intento_id: str) -> bool:
        """
        1. Carga la lista de respuestas del intento (cargar_respuestas/).
        2. Agrupa por módulo para simular la navegación real del motor.
        3. Para cada pregunta sin responder:
             - Aplica think-time (sleep aleatorio ∈ [THINK_TIME_MIN, THINK_TIME_MAX]).
             - Selecciona una opción aleatoria y hace PATCH.
        4. Barrido final para garantizar que no queden preguntas sin respuesta.
        """
        think_min = _get_env_int("THINK_TIME_MIN", 5)
        think_max = _get_env_int("THINK_TIME_MAX", 15)
        max_preguntas = _get_env_int("MAX_PREGUNTAS", 0)  # 0 = todas

        respuestas_data = self._get_json(
            f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/",
            name="/api/evaluaciones/estudiante/mis-intentos/{id}/cargar_respuestas/",
        )
        if not isinstance(respuestas_data, list):
            return False

        # Acotar subconjunto si MAX_PREGUNTAS está configurado.
        universo = list(respuestas_data)
        if max_preguntas > 0:
            universo = universo[:max_preguntas]

        # Agrupar por módulo.
        por_modulo: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for item in universo:
            pregunta = item.get("pregunta") or {}
            mod_id = str(pregunta.get("modulo_id") or "sin_modulo")
            por_modulo[mod_id].append(item)

        for mod_id, items_modulo in por_modulo.items():
            # Simula entrada al módulo (GET).
            self.client.get(
                f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/",
                params={"modulo": mod_id},
                name="/api/evaluaciones/estudiante/mis-intentos/{id}/cargar_respuestas/?modulo=",
            )

            for item in items_modulo:
                respuesta_id = item.get("id")
                pregunta = item.get("pregunta") or {}
                opciones = pregunta.get("opciones") or []

                # Salta si ya fue respondida o le faltan datos.
                if (
                    not respuesta_id
                    or not isinstance(opciones, list)
                    or not opciones
                    or item.get("opcion_seleccionada")
                ):
                    continue

                # Think-time: simula que el estudiante lee la pregunta.
                think = random.uniform(think_min, think_max)
                time.sleep(think)

                opcion_id = random.choice(opciones).get("id")
                if not opcion_id:
                    continue

                with self.client.patch(
                    f"/api/evaluaciones/estudiante/respuestas/{respuesta_id}/",
                    json={"opcion_seleccionada": opcion_id},
                    catch_response=True,
                    name="/api/evaluaciones/estudiante/respuestas/{id}/",
                ) as patch_resp:
                    if patch_resp.status_code in (200, 202):
                        patch_resp.success()
                    else:
                        patch_resp.failure(
                            f"[RESPUESTA_ERROR] id={respuesta_id} "
                            f"HTTP {patch_resp.status_code}: {patch_resp.text[:200]}"
                        )

            # Re-carga del módulo al terminar (simula validación de progreso).
            self.client.get(
                f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/",
                params={"modulo": mod_id},
                name="/api/evaluaciones/estudiante/mis-intentos/{id}/cargar_respuestas/?modulo=",
            )

        # --- Barrido final para no dejar sin respuesta ---
        resumen = self._get_json(
            f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/cargar_respuestas/",
            name="/api/evaluaciones/estudiante/mis-intentos/{id}/cargar_respuestas/ [final]",
        )
        if isinstance(resumen, list):
            for item in resumen:
                if item.get("opcion_seleccionada"):
                    continue
                respuesta_id = item.get("id")
                opciones = (item.get("pregunta") or {}).get("opciones") or []
                if not respuesta_id or not opciones:
                    continue
                opcion_id = random.choice(opciones).get("id")
                if not opcion_id:
                    continue
                self.client.patch(
                    f"/api/evaluaciones/estudiante/respuestas/{respuesta_id}/",
                    json={"opcion_seleccionada": opcion_id},
                    name="/api/evaluaciones/estudiante/respuestas/{id}/ [final]",
                )

        return True

    # ------------------------------------------------------------------
    # @task principal
    # ------------------------------------------------------------------

    @task
    def flujo_examen_completo(self) -> None:
        """
        Ejecuta el viaje completo del estudiante (una sola vez por VU).
        Tras finalizar, el VU queda en idle (sin más peticiones).
        """
        if self._flujo_ejecutado or not self._can_run or not self._login_ok:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        # 1. Obtener / crear IntentoExamen
        intento_id = self._resolver_intento()
        if not intento_id:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        self._intento_id = intento_id

        # 2. Responder preguntas con think-time
        ok = self._responder_preguntas(intento_id)
        if not ok:
            self._flujo_ejecutado = True
            self._can_run = False
            return

        # 3. Finalizar examen
        with self.client.post(
            f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/finalizar/",
            catch_response=True,
            name="/api/evaluaciones/estudiante/mis-intentos/{id}/finalizar/",
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                resp.failure(
                    f"[FINALIZAR_ERROR] intento={intento_id} "
                    f"HTTP {resp.status_code}: {resp.text[:200]}"
                )

        # 4. Consulta de resultados (simula la pantalla de cierre).
        self.client.get(
            f"/api/evaluaciones/estudiante/mis-intentos/{intento_id}/resumen_resultados/",
            name="/api/evaluaciones/estudiante/mis-intentos/{id}/resumen_resultados/",
        )

        self._flujo_ejecutado = True
        self._can_run = False
