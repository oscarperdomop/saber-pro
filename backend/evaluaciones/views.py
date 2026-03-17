import json
import re
from decimal import Decimal

import google.generativeai as genai
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Categoria,
    Competencia,
    IntentoExamen,
    IntentoModulo,
    ModuloPrueba,
    OpcionRespuesta,
    PlantillaExamen,
    Pregunta,
    RespuestaEstudiante,
)
from .serializers import (
    CategoriaAdminSerializer,
    CalificarEnsayoSerializer,
    CompetenciaAdminSerializer,
    EnsayoPendienteSerializer,
    IntentoExamenSerializer,
    ModuloSerializer,
    PlantillaExamenAdminSerializer,
    PlantillaExamenEstudianteSerializer,
    PreguntaAdminSerializer,
    RevisionRespuestaSerializer,
    RespuestaEstudianteDetalleSerializer,
    RespuestaEstudianteUpdateSerializer,
)


class GenerarOpcionesIAView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @staticmethod
    def _clean_json_response(texto):
        contenido = (texto or '').strip()

        if contenido.startswith('```json'):
            contenido = contenido.removeprefix('```json').strip()
        elif contenido.startswith('```'):
            contenido = contenido.removeprefix('```').strip()

        if contenido.endswith('```'):
            contenido = contenido.removesuffix('```').strip()

        return contenido

    @staticmethod
    def _resolver_modelo_gemini():
        modelos_disponibles = []
        for model in genai.list_models():
            supported = list(getattr(model, 'supported_generation_methods', []) or [])
            if 'generateContent' in supported:
                modelos_disponibles.append(getattr(model, 'name', ''))

        if not modelos_disponibles:
            raise ValueError('No hay modelos Gemini con soporte generateContent en esta cuenta/API key.')

        override_model = str(getattr(settings, 'GEMINI_MODEL', '') or '').strip()
        if override_model:
            candidate = override_model if override_model.startswith('models/') else f'models/{override_model}'
            if candidate in modelos_disponibles:
                return candidate, modelos_disponibles

        preferidos = [
            'models/gemini-2.5-flash',
            'models/gemini-2.0-flash',
            'models/gemini-2.0-flash-lite',
            'models/gemini-1.5-flash-latest',
            'models/gemini-1.5-flash',
        ]

        for candidato in preferidos:
            if candidato in modelos_disponibles:
                return candidato, modelos_disponibles

        return modelos_disponibles[0], modelos_disponibles

    def post(self, request):
        modelos_disponibles = []
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)

            enunciado = str(request.data.get('enunciado') or '').strip()
            contexto = str(request.data.get('contexto') or '').strip()

            if not enunciado:
                return Response(
                    {'detalle': 'El campo enunciado es obligatorio para generar opciones con IA.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            prompt_text = f"""
Eres un experto pedagogo creador de exámenes tipo ICFES Saber Pro en Colombia.
Dado el siguiente enunciado y contexto, genera 4 opciones de respuesta.
Solo 1 debe ser correcta, y las otras 3 deben ser distractores plausibles que evalúen errores comunes del estudiante.
Devuelve el resultado ESTRICTAMENTE como un array de objetos JSON con esta estructura exacta, sin texto adicional, sin formato markdown:
[
    {{"texto": "opción correcta aquí", "es_correcta": true}},
    {{"texto": "distractor 1", "es_correcta": false}},
    {{"texto": "distractor 2", "es_correcta": false}},
    {{"texto": "distractor 3", "es_correcta": false}}
]

Contexto: {contexto if contexto else 'Ninguno'}
Enunciado: {enunciado}
"""

            modelo_nombre, modelos_disponibles = self._resolver_modelo_gemini()
            model = genai.GenerativeModel(modelo_nombre)
            response = model.generate_content(prompt_text)
            raw_text = getattr(response, 'text', '') or ''

            cleaned_text = self._clean_json_response(raw_text)
            opciones = json.loads(cleaned_text)

            if not isinstance(opciones, list):
                raise ValueError('La IA no devolvio un array JSON valido.')

            opciones_normalizadas = []
            for opcion in opciones:
                if not isinstance(opcion, dict):
                    continue
                opciones_normalizadas.append(
                    {
                        'texto': str(opcion.get('texto') or '').strip(),
                        'es_correcta': bool(opcion.get('es_correcta', False)),
                    }
                )

            if not opciones_normalizadas:
                raise ValueError('La IA devolvio opciones vacias o con formato invalido.')

            return Response(opciones_normalizadas, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {
                    'detalle': 'No fue posible generar opciones con IA.',
                    'error': str(e),
                    'sugerencia_modelo': 'Configura GEMINI_MODEL en backend/.env con un modelo disponible.',
                    'modelos_disponibles': modelos_disponibles[:10],
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PreguntaAdminViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.all().order_by('created_at', 'id')
    serializer_class = PreguntaAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    _option_pattern = re.compile(r'^opciones\[(\d+)\]\[(id|texto|es_correcta|imagen)\]$')

    def get_queryset(self):
        queryset = Pregunta.objects.all().order_by('created_at', 'id')
        incluir_archivadas = str(
            self.request.query_params.get('incluir_archivadas')
            or self.request.query_params.get('include_archivadas')
            or ''
        ).strip().lower() in ['1', 'true', 'yes']

        if self.action == 'list' and not incluir_archivadas:
            queryset = queryset.exclude(estado='Archivada')

        return queryset

    @staticmethod
    def _map_dificultad(dificultad):
        return {
            'Facil': 'Facil',
            'Media': 'Medio',
            'Alta': 'Dificil',
            'Medio': 'Medio',
            'Dificil': 'Dificil',
        }.get(str(dificultad or '').strip(), 'Medio')

    @staticmethod
    def _to_bool(value):
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ['1', 'true', 'yes', 'on']

    def _extract_opciones_formdata(self, request):
        grouped = {}
        found = False

        for key in request.data.keys():
            match = self._option_pattern.match(str(key))
            if not match:
                continue
            found = True
            index = int(match.group(1))
            field = match.group(2)
            grouped.setdefault(index, {})
            grouped[index][field] = request.data.get(key)

        for key in request.FILES.keys():
            match = self._option_pattern.match(str(key))
            if not match:
                continue
            found = True
            index = int(match.group(1))
            field = match.group(2)
            grouped.setdefault(index, {})
            grouped[index][field] = request.FILES.get(key)

        if not found:
            return None

        opciones = []
        for index in sorted(grouped.keys()):
            data = grouped[index]
            opcion_id = str(data.get('id') or '').strip() or None
            texto = str(data.get('texto') or '').strip()
            es_correcta = self._to_bool(data.get('es_correcta'))
            imagen = data.get('imagen')

            if not texto and not imagen and not opcion_id:
                continue

            opciones.append(
                {
                    'id': opcion_id,
                    'texto': texto or None,
                    'es_correcta': es_correcta,
                    'imagen': imagen,
                }
            )

        return opciones

    @staticmethod
    def _extract_base_data(request):
        allowed_fields = [
            'modulo',
            'modulo_id',
            'categoria',
            'competencia',
            'nivel_dificultad',
            'dificultad',
            'tipo_pregunta',
            'contexto_texto',
            'enunciado',
            'justificacion',
            'limite_palabras',
            'rubrica_evaluacion',
            'estado',
            'version_original',
        ]
        data = {}
        for field in allowed_fields:
            if field in request.data:
                data[field] = request.data.get(field)

        if 'contexto_imagen' in request.FILES:
            data['contexto_imagen'] = request.FILES.get('contexto_imagen')

        return data

    @staticmethod
    def _validate_manual_options(tipo_pregunta, opciones):
        if tipo_pregunta == 'Ensayo':
            return None

        if len(opciones) < 2:
            return Response(
                {'opciones': ['Debes agregar al menos dos opciones para una pregunta de opcion multiple.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not any(opcion.get('es_correcta') for opcion in opciones):
            return Response(
                {'opciones': ['Debes marcar al menos una opcion correcta.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return None

    @staticmethod
    def _replace_opciones(pregunta, opciones):
        existing_by_id = {str(opcion.id): opcion for opcion in pregunta.opciones.all()}
        pregunta.opciones.all().delete()
        for opcion in opciones:
            opcion_id = str(opcion.get('id') or '').strip()
            imagen = opcion.get('imagen')
            if not imagen and opcion_id and opcion_id in existing_by_id:
                imagen = existing_by_id[opcion_id].imagen

            OpcionRespuesta.objects.create(
                pregunta=pregunta,
                texto=opcion.get('texto'),
                es_correcta=bool(opcion.get('es_correcta')),
                imagen=imagen,
            )

    @staticmethod
    def _hydrate_missing_option_images(opciones, source_pregunta):
        existing_by_id = {str(opcion.id): opcion for opcion in source_pregunta.opciones.all()}
        hydrated = []

        for opcion in opciones:
            opcion_copy = {**opcion}
            opcion_id = str(opcion_copy.get('id') or '').strip()
            if not opcion_copy.get('imagen') and opcion_id and opcion_id in existing_by_id:
                opcion_copy['imagen'] = existing_by_id[opcion_id].imagen
            hydrated.append(opcion_copy)

        return hydrated

    @staticmethod
    def _clone_opciones(instance):
        return [
            {
                'texto': opcion.texto,
                'es_correcta': opcion.es_correcta,
                'imagen': opcion.imagen if opcion.imagen else None,
            }
            for opcion in instance.opciones.all()
        ]

    def create(self, request, *args, **kwargs):
        opciones_formdata = self._extract_opciones_formdata(request)
        if opciones_formdata is None:
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        else:
            data = self._extract_base_data(request)

        modulo_valor = data.get('modulo') or data.get('modulo_id')
        if modulo_valor and not data.get('modulo'):
            data['modulo'] = modulo_valor

        if data.get('dificultad') and not data.get('nivel_dificultad'):
            data['nivel_dificultad'] = self._map_dificultad(data.get('dificultad'))

        serializer = self.get_serializer(
            data=data,
            context={
                **self.get_serializer_context(),
                'skip_options_validation': opciones_formdata is not None,
            },
        )
        serializer.is_valid(raise_exception=True)
        tipo_pregunta = str(data.get('tipo_pregunta') or 'Opcion Multiple')

        if opciones_formdata is not None:
            validation_error = self._validate_manual_options(tipo_pregunta, opciones_formdata)
            if validation_error is not None:
                return validation_error

        self.perform_create(serializer)
        pregunta = serializer.instance

        if opciones_formdata is not None:
            if tipo_pregunta == 'Ensayo':
                pregunta.opciones.all().delete()
            else:
                self._replace_opciones(pregunta, opciones_formdata)

        response_data = self.get_serializer(pregunta).data
        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        if instance.estado == 'Archivada':
            return Response(
                {'detalle': 'Las preguntas archivadas son de solo lectura y no pueden modificarse.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        opciones_formdata = self._extract_opciones_formdata(request)

        if opciones_formdata is None:
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        else:
            data = self._extract_base_data(request)

        modulo_valor = data.get('modulo') or data.get('modulo_id')
        if modulo_valor and not data.get('modulo'):
            data['modulo'] = modulo_valor

        if data.get('dificultad') and not data.get('nivel_dificultad'):
            data['nivel_dificultad'] = self._map_dificultad(data.get('dificultad'))

        serializer = self.get_serializer(
            instance,
            data=data,
            partial=partial,
            context={
                **self.get_serializer_context(),
                'skip_options_validation': opciones_formdata is not None,
            },
        )
        serializer.is_valid(raise_exception=True)

        tipo_pregunta = str(
            data.get('tipo_pregunta')
            or ('Ensayo' if instance.limite_palabras is not None else 'Opcion Multiple')
        )

        if opciones_formdata is not None:
            validation_error = self._validate_manual_options(tipo_pregunta, opciones_formdata)
            if validation_error is not None:
                return validation_error

        tiene_respuestas = RespuestaEstudiante.objects.filter(pregunta=instance).exists()
        if tiene_respuestas:
            with transaction.atomic():
                estado_previo = instance.estado
                instance.estado = 'Archivada'
                instance.save(update_fields=['estado', 'updated_at'])

                data_version = {
                    'modulo_id': data.get('modulo_id') or data.get('modulo') or instance.modulo_id,
                    'categoria': data.get('categoria', instance.categoria_id),
                    'competencia': data.get('competencia', instance.competencia_id),
                    'nivel_dificultad': data.get('nivel_dificultad', instance.nivel_dificultad),
                    'tipo_pregunta': data.get(
                        'tipo_pregunta',
                        'Ensayo' if instance.limite_palabras is not None else 'Opcion Multiple',
                    ),
                    'contexto_texto': (
                        data.get('contexto_texto') if 'contexto_texto' in data else instance.contexto_texto
                    ),
                    'enunciado': data.get('enunciado', instance.enunciado),
                    'justificacion': (
                        data.get('justificacion') if 'justificacion' in data else instance.justificacion
                    ),
                    'limite_palabras': (
                        data.get('limite_palabras') if 'limite_palabras' in data else instance.limite_palabras
                    ),
                    'rubrica_evaluacion': (
                        data.get('rubrica_evaluacion')
                        if 'rubrica_evaluacion' in data
                        else instance.rubrica_evaluacion
                    ),
                    'estado': data.get('estado', estado_previo),
                    'version_original': data.get('version_original')
                    or instance.version_original_id
                    or instance.id,
                }

                if 'contexto_imagen' in data:
                    data_version['contexto_imagen'] = data.get('contexto_imagen')
                elif instance.contexto_imagen:
                    data_version['contexto_imagen'] = instance.contexto_imagen

                opciones_version = (
                    opciones_formdata if opciones_formdata is not None else self._clone_opciones(instance)
                )
                opciones_version = self._hydrate_missing_option_images(opciones_version, instance)

                validation_error = self._validate_manual_options(
                    str(data_version.get('tipo_pregunta') or 'Opcion Multiple'),
                    opciones_version,
                )
                if validation_error is not None:
                    return validation_error

                serializer_version = self.get_serializer(
                    data=data_version,
                    context={
                        **self.get_serializer_context(),
                        'skip_options_validation': True,
                    },
                )
                serializer_version.is_valid(raise_exception=True)
                serializer_version.save()
                pregunta_nueva = serializer_version.instance

                if str(data_version.get('tipo_pregunta')) == 'Ensayo':
                    pregunta_nueva.opciones.all().delete()
                else:
                    self._replace_opciones(pregunta_nueva, opciones_version)

                return Response(
                    {
                        'mensaje': (
                            'Se creó una nueva versión porque la original ya tenía respuestas.'
                        ),
                        'versionada': True,
                        'nueva_pregunta': self.get_serializer(pregunta_nueva).data,
                    },
                    status=status.HTTP_201_CREATED,
                )

        self.perform_update(serializer)
        pregunta = serializer.instance

        if opciones_formdata is not None:
            if tipo_pregunta == 'Ensayo':
                pregunta.opciones.all().delete()
            else:
                self._replace_opciones(pregunta, opciones_formdata)

        return Response(self.get_serializer(pregunta).data)


class ModuloAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloPrueba.objects.all().order_by('nombre')
    serializer_class = ModuloSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class CategoriaAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CategoriaAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Categoria.objects.select_related('modulo').all().order_by('nombre')
        modulo_id = self.request.query_params.get('modulo_id')
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        categoria = self.get_object()

        if Pregunta.objects.filter(categoria=categoria).exists():
            return Response(
                {'detalle': 'No se puede eliminar la categoria porque tiene preguntas asociadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class CompetenciaAdminViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = CompetenciaAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = Competencia.objects.select_related('modulo').all().order_by('nombre')
        modulo_id = self.request.query_params.get('modulo_id')
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        competencia = self.get_object()

        if Pregunta.objects.filter(competencia=competencia).exists():
            return Response(
                {'detalle': 'No se puede eliminar la competencia porque tiene preguntas asociadas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


class PlantillaExamenAdminViewSet(viewsets.ModelViewSet):
    queryset = PlantillaExamen.objects.all()
    serializer_class = PlantillaExamenAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        queryset = PlantillaExamen.objects.all()
        incluir_archivados = (
            str(self.request.query_params.get('incluir_archivados', 'false')).strip().lower()
            in ['1', 'true', 'yes']
        )

        if self.action == 'list' and not incluir_archivados:
            queryset = queryset.exclude(estado='Archivado')

        return queryset

    @staticmethod
    def _has_intentos(instance):
        if getattr(instance, 'intentos', None):
            return instance.intentos.exists()
        return IntentoExamen.objects.filter(plantilla_examen=instance).exists()

    @staticmethod
    def _resolver_nombre_estudiante(estudiante):
        nombres = str(getattr(estudiante, 'nombres', '') or '').strip()
        apellidos = str(getattr(estudiante, 'apellidos', '') or '').strip()
        full_name = f'{nombres} {apellidos}'.strip()
        if full_name:
            return full_name
        return str(getattr(estudiante, 'correo_institucional', '') or 'Estudiante')

    @staticmethod
    def _calcular_puntaje_intento(intento):
        respuestas = list(intento.respuestas.all())
        total_preguntas = len(respuestas)
        if total_preguntas == 0:
            return 0

        aciertos_multiples = sum(
            1
            for respuesta in respuestas
            if respuesta.opcion_seleccionada_id and respuesta.opcion_seleccionada.es_correcta
        )

        puntaje_ensayos = Decimal('0')
        for respuesta in respuestas:
            if respuesta.pregunta.limite_palabras is not None and respuesta.puntaje_calificado is not None:
                puntaje_ensayos += respuesta.puntaje_calificado

        total_aciertos = Decimal(aciertos_multiples) + puntaje_ensayos
        return round((float(total_aciertos) / total_preguntas) * 300)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._has_intentos(instance):
            raise ValidationError(
                {'detail': 'No se puede editar un simulacro que ya tiene intentos de estudiantes.'}
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if self._has_intentos(instance):
            raise ValidationError(
                {'detail': 'No se puede eliminar un simulacro que ya tiene intentos de estudiantes.'}
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def archivar(self, request, pk=None):
        simulacro = self.get_object()
        simulacro.estado = 'Archivado'
        simulacro.save(update_fields=['estado', 'updated_at'])
        return Response({'detail': 'Simulacro archivado correctamente.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def resultados(self, request, pk=None):
        simulacro = self.get_object()
        intentos = (
            IntentoExamen.objects.filter(plantilla_examen=simulacro, estado='Finalizado')
            .select_related('estudiante__programa')
            .prefetch_related('respuestas__opcion_seleccionada', 'respuestas__pregunta')
        )

        data = []
        for intento in intentos:
            estudiante = intento.estudiante
            programa = getattr(estudiante, 'programa', None)
            puntaje_global = self._calcular_puntaje_intento(intento)
            data.append(
                {
                    'estudiante_nombre': self._resolver_nombre_estudiante(estudiante),
                    'programa_nombre': getattr(programa, 'nombre', None) or 'N/A',
                    'fecha_fin': intento.fecha_finalizacion.isoformat()
                    if intento.fecha_finalizacion
                    else None,
                    'puntaje_global': puntaje_global,
                }
            )

        data.sort(
            key=lambda item: (
                -float(item.get('puntaje_global', 0)),
                str(item.get('fecha_fin') or ''),
            ),
        )

        return Response(data, status=status.HTTP_200_OK)


class EstudianteExamenViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlantillaExamenEstudianteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        programa_id = getattr(self.request.user, 'programa_id', None)
        now = timezone.now()
        queryset = PlantillaExamen.objects.filter(
            estado='Activo',
            fecha_inicio__lte=now,
            fecha_fin__gte=now,
        )

        if programa_id:
            return queryset.filter(
                Q(programas_destino=programa_id) | Q(programas_destino__isnull=True)
            ).distinct()

        return queryset.filter(programas_destino__isnull=True).distinct()

    @action(detail=True, methods=['post'])
    def iniciar_intento(self, request, pk=None):
        plantilla = self.get_object()

        if IntentoExamen.objects.filter(
            estudiante=request.user,
            plantilla_examen=plantilla,
        ).exists():
            return Response({'detalle': 'Intento ya iniciado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                intento = IntentoExamen.objects.create(
                    estudiante=request.user,
                    plantilla_examen=plantilla,
                )

                modulos_creados = set()
                preguntas_agregadas = set()

                for regla in plantilla.reglas.select_related('modulo', 'categoria').all():
                    preguntas_qs = Pregunta.objects.filter(
                        modulo=regla.modulo,
                        estado='Publicada',
                    )

                    if regla.nivel_dificultad and regla.nivel_dificultad != 'Balanceada':
                        preguntas_qs = preguntas_qs.filter(nivel_dificultad=regla.nivel_dificultad)

                    if regla.categoria_id:
                        preguntas_qs = preguntas_qs.filter(categoria=regla.categoria)

                    preguntas = list(preguntas_qs.order_by('?')[: regla.cantidad_preguntas])

                    if len(preguntas) < regla.cantidad_preguntas:
                        raise ValueError(
                            f'No hay suficientes preguntas publicadas para la regla {regla.id}.'
                        )

                    if regla.modulo_id not in modulos_creados:
                        IntentoModulo.objects.create(
                            intento=intento,
                            modulo=regla.modulo,
                            estado='Pendiente',
                        )
                        modulos_creados.add(regla.modulo_id)

                    for pregunta in preguntas:
                        if pregunta.id in preguntas_agregadas:
                            continue
                        RespuestaEstudiante.objects.create(
                            intento=intento,
                            pregunta=pregunta,
                        )
                        preguntas_agregadas.add(pregunta.id)

        except ValueError as exc:
            return Response({'detalle': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'intento_id': str(intento.id)}, status=status.HTTP_201_CREATED)


class IntentoExamenViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IntentoExamenSerializer

    def get_queryset(self):
        return IntentoExamen.objects.filter(estudiante=self.request.user)

    @action(detail=True, methods=['get'])
    def cargar_respuestas(self, request, pk=None):
        intento = self.get_object()
        modulo_id = request.query_params.get('modulo')

        respuestas = RespuestaEstudiante.objects.filter(intento=intento).select_related('pregunta')
        if modulo_id:
            respuestas = respuestas.filter(pregunta__modulo_id=modulo_id)

        serializer = RespuestaEstudianteDetalleSerializer(respuestas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def finalizar(self, request, pk=None):
        intento = self.get_object()

        if intento.estado == 'En Progreso':
            ensayos_pendientes = intento.respuestas.filter(
                pregunta__limite_palabras__isnull=False,
                puntaje_calificado__isnull=True,
            ).exists()

            intento.estado = 'Pendiente Calificacion' if ensayos_pendientes else 'Finalizado'
            intento.fecha_finalizacion = timezone.now()
            intento.save()

        return Response({'estado': intento.estado})

    @action(detail=True, methods=['get'])
    def resumen_resultados(self, request, pk=None):
        try:
            intento = (
                IntentoExamen.objects.select_related('plantilla_examen')
                .prefetch_related('respuestas__opcion_seleccionada', 'respuestas__pregunta')
                .get(pk=pk, estudiante=request.user)
            )
        except IntentoExamen.DoesNotExist:
            return Response({'detalle': 'Intento no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        plantilla = intento.plantilla_examen
        now = timezone.now()
        if not plantilla.mostrar_resultados_inmediatos and now < plantilla.fecha_fin:
            return Response(
                {'detalle': 'Los resultados estaran disponibles cuando cierre el examen.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        respuestas = list(intento.respuestas.all())
        total_preguntas = len(respuestas)
        ensayos_pendientes = intento.respuestas.filter(
            pregunta__limite_palabras__isnull=False,
            puntaje_calificado__isnull=True,
        ).exists()

        if total_preguntas == 0:
            return Response(
                {
                    'intento_id': str(intento.id),
                    'estado_calificacion': 'Parcial' if ensayos_pendientes else 'Definitiva',
                    'puntaje_saber_pro': 0,
                    'total_preguntas': 0,
                    'aciertos_brutos': 0,
                    'detalle_respuestas': [],
                    'puntajes_por_modulo': [],
                },
                status=status.HTTP_200_OK,
            )

        aciertos_multiples = 0
        puntaje_ensayos = Decimal('0')

        for respuesta in respuestas:
            if respuesta.opcion_seleccionada_id and respuesta.opcion_seleccionada.es_correcta:
                aciertos_multiples += 1

            if respuesta.pregunta.limite_palabras is not None and respuesta.puntaje_calificado is not None:
                puntaje_ensayos += respuesta.puntaje_calificado

        total_aciertos = Decimal(aciertos_multiples) + puntaje_ensayos
        puntaje_normalizado = round((float(total_aciertos) / total_preguntas) * 300)

        modulos_data = []
        modulos_stats = intento.respuestas.values('pregunta__modulo__nombre').annotate(
            total=Count('id'),
            aciertos=Count('id', filter=Q(opcion_seleccionada__es_correcta=True)),
        )

        for mod in modulos_stats:
            nombre = mod['pregunta__modulo__nombre'] or 'General'
            total_mod = mod['total']
            aciertos_mod = mod['aciertos']
            puntaje_mod = round((aciertos_mod / total_mod) * 300) if total_mod > 0 else 0
            percentil = round((puntaje_mod / 300) * 100)
            modulos_data.append(
                {
                    'modulo': nombre,
                    'puntaje': puntaje_mod,
                    'percentil': percentil,
                }
            )

        return Response(
            {
                'intento_id': str(intento.id),
                'estado_calificacion': 'Parcial' if ensayos_pendientes else 'Definitiva',
                'puntaje_saber_pro': puntaje_normalizado,
                'total_preguntas': total_preguntas,
                'aciertos_brutos': float(total_aciertos),
                'detalle_respuestas': RevisionRespuestaSerializer(respuestas, many=True).data,
                'puntajes_por_modulo': modulos_data,
            },
            status=status.HTTP_200_OK,
        )


class RespuestaEstudianteViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = RespuestaEstudiante.objects.all()
    serializer_class = RespuestaEstudianteUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RespuestaEstudiante.objects.filter(intento__estudiante=self.request.user)


class EvaluacionEnsayoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EnsayoPendienteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return RespuestaEstudiante.objects.filter(
            pregunta__limite_palabras__isnull=False,
            texto_respuesta_abierta__isnull=False,
            puntaje_calificado__isnull=True,
        ).select_related('pregunta', 'evaluador')

    @action(detail=True, methods=['post'])
    def asignar_ensayo(self, request, pk=None):
        with transaction.atomic():
            try:
                ensayo = self.get_queryset().select_for_update().get(pk=pk)
            except RespuestaEstudiante.DoesNotExist:
                return Response({'detalle': 'Ensayo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            if ensayo.evaluador and ensayo.evaluador != request.user:
                return Response(
                    {'detalle': 'Este ensayo ya esta siendo evaluado por otro profesor'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ensayo.evaluador = request.user
            ensayo.save(update_fields=['evaluador'])

        return Response(
            {'mensaje': 'Ensayo asignado exitosamente'},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def calificar(self, request, pk=None):
        serializer = CalificarEnsayoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ensayo = self.get_object()

        if ensayo.evaluador != request.user:
            return Response(
                {'detalle': 'No tienes permiso para calificar este ensayo'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ensayo.puntaje_calificado = serializer.validated_data['puntaje']
        ensayo.save(update_fields=['puntaje_calificado'])

        return Response(
            {'mensaje': 'Calificacion guardada'},
            status=status.HTTP_200_OK,
        )


class AnaliticasAdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def kpis_globales(self, request):
        simulacro_id = request.query_params.get('simulacro_id')

        intentos = IntentoExamen.objects.filter(estado__in=['Finalizado', 'Pendiente Calificacion'])
        if simulacro_id:
            intentos = intentos.filter(plantilla_examen_id=simulacro_id)

        total_intentos = intentos.count()

        participacion_programas = (
            intentos.values('estudiante__programa__nombre')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        preguntas_criticas = (
            RespuestaEstudiante.objects.filter(intento__in=intentos)
            .values('pregunta__enunciado')
            .annotate(
                total_veces=Count('id'),
                veces_incorrecta=Count(
                    'id',
                    filter=Q(
                        opcion_seleccionada__es_correcta=False,
                        puntaje_calificado__isnull=True,
                    ),
                ),
            )
            .order_by('-veces_incorrecta')[:5]
        )

        return Response(
            {
                'total_evaluaciones_finalizadas': total_intentos,
                'participacion_por_programa': list(participacion_programas),
                'top_preguntas_criticas': list(preguntas_criticas),
            },
            status=status.HTTP_200_OK,
        )
