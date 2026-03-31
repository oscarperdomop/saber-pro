import json
import re
import uuid
from io import StringIO
import unicodedata
from decimal import Decimal

import google.generativeai as genai
import pandas as pd
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Case, Count, ExpressionWrapper, F, FloatField, Q, Value, When
from django.db.models.functions import Cast
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
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
from users.models import ProgramaAcademico, Usuario
from .utils import autocompletar_distractores
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
            'codigo_latex',
            'soporte_multimedia',
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
        if 'imagen_grafica' in request.FILES:
            data['imagen_grafica'] = request.FILES.get('imagen_grafica')

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

    @staticmethod
    def _clean_cell(value):
        if value is None:
            return ''
        try:
            if pd.isna(value):
                return ''
        except TypeError:
            pass
        text = str(value).strip()
        if text.lower() in ['nan', 'none', '<na>']:
            return ''
        if text.endswith('.0') and text.replace('.', '', 1).isdigit():
            return text[:-2]
        return text

    @staticmethod
    def _normalize_lookup_text(value):
        text = str(value or '').strip().lower()
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(char for char in text if not unicodedata.combining(char))
        return ' '.join(text.split())

    @staticmethod
    def _normalize_column_name(value):
        text = str(value or '').replace('\ufeff', '').strip()
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(char for char in text if not unicodedata.combining(char))
        text = text.upper()
        text = re.sub(r'[^A-Z0-9]+', '_', text).strip('_')
        return text

    @classmethod
    def _read_cell(cls, row, *keys):
        for key in keys:
            normalized_key = cls._normalize_column_name(key)
            if normalized_key not in row:
                continue
            value = cls._clean_cell(row.get(normalized_key))
            if value:
                return value
        return ''

    @staticmethod
    def _resolve_modulo(raw_modulo):
        modulo_raw = str(raw_modulo or '').strip()
        if not modulo_raw:
            return None

        if modulo_raw.isdigit():
            return ModuloPrueba.objects.filter(id=int(modulo_raw)).first()

        modulo = ModuloPrueba.objects.filter(nombre__iexact=modulo_raw).first()
        if modulo:
            return modulo

        objetivo = PreguntaAdminViewSet._normalize_lookup_text(modulo_raw)
        for candidato in ModuloPrueba.objects.all():
            if PreguntaAdminViewSet._normalize_lookup_text(candidato.nombre) == objetivo:
                return candidato

        return None

    @staticmethod
    def _resolve_categoria(modulo, categoria_default, raw_categoria):
        categoria_raw = str(raw_categoria or '').strip()
        if not categoria_raw:
            return categoria_default

        if categoria_raw.isdigit():
            return Categoria.objects.filter(id=int(categoria_raw), modulo=modulo).first()

        categoria = Categoria.objects.filter(modulo=modulo, nombre__iexact=categoria_raw).first()
        if categoria:
            return categoria

        objetivo = PreguntaAdminViewSet._normalize_lookup_text(categoria_raw)
        for candidato in Categoria.objects.filter(modulo=modulo):
            if PreguntaAdminViewSet._normalize_lookup_text(candidato.nombre) == objetivo:
                return candidato

        return None

    @staticmethod
    def _resolve_competencia(modulo, competencia_default, raw_competencia):
        competencia_raw = str(raw_competencia or '').strip()
        if not competencia_raw:
            return competencia_default

        if competencia_raw.isdigit():
            return Competencia.objects.filter(id=int(competencia_raw), modulo=modulo).first()

        competencia = Competencia.objects.filter(modulo=modulo, nombre__iexact=competencia_raw).first()
        if competencia:
            return competencia

        objetivo = PreguntaAdminViewSet._normalize_lookup_text(competencia_raw)
        for candidato in Competencia.objects.filter(modulo=modulo):
            if PreguntaAdminViewSet._normalize_lookup_text(candidato.nombre) == objetivo:
                return candidato

        return None

    @classmethod
    def _read_bulk_file(cls, archivo):
        nombre_archivo = str(getattr(archivo, 'name', '') or '').lower()
        if nombre_archivo.endswith('.xlsx') or nombre_archivo.endswith('.xls'):
            df = pd.read_excel(archivo)
        elif nombre_archivo.endswith('.csv'):
            archivo.seek(0)
            raw_content = archivo.read()

            if isinstance(raw_content, bytes):
                decoded = None
                for encoding in ('utf-8-sig', 'utf-8', 'latin-1'):
                    try:
                        decoded = raw_content.decode(encoding)
                        break
                    except UnicodeDecodeError:
                        continue
                if decoded is None:
                    raise ValueError(
                        'No se pudo leer el CSV. Verifica que este guardado en UTF-8 o Latin-1.'
                    )
                csv_text = decoded
            else:
                csv_text = str(raw_content or '')

            lines = csv_text.splitlines()
            if lines and lines[0].strip().lower().startswith('sep='):
                lines = lines[1:]
            csv_text = '\n'.join(lines)

            sample_line = next((line for line in lines if line.strip()), '')
            if sample_line.count(';') >= sample_line.count(','):
                delimiter = ';'
            else:
                delimiter = ','

            df = pd.read_csv(StringIO(csv_text), sep=delimiter, engine='python')
        else:
            raise ValueError('Formato no soportado. Usa .xlsx, .xls o .csv.')

        # Normaliza nombres de columnas para tolerar BOM, tildes, espacios y variantes.
        df.columns = [cls._normalize_column_name(column) for column in df.columns]

        return df

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
                    'codigo_latex': (
                        data.get('codigo_latex') if 'codigo_latex' in data else instance.codigo_latex
                    ),
                    'soporte_multimedia': (
                        data.get('soporte_multimedia')
                        if 'soporte_multimedia' in data
                        else instance.soporte_multimedia
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
                if 'imagen_grafica' in data:
                    data_version['imagen_grafica'] = data.get('imagen_grafica')
                elif instance.imagen_grafica:
                    data_version['imagen_grafica'] = instance.imagen_grafica

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

    @action(detail=False, methods=['get'], url_path='plantilla-carga')
    def plantilla_carga(self, _request):
        rows = [
            [
                'Razonamiento Cuantitativo',
                'Resuelve: $x^2 - x - 6 = 0$. Cual es una raiz?',
                'Álgebra y cálculo',
                'Interpretacion y representacion',
                '3',
                '',
                '',
                '',
                'Media',
                'Publicada',
            ],
            [
                'Razonamiento Cuantitativo',
                'En un triangulo rectangulo, calcula la hipotenusa.',
                'Geometría',
                'Resolucion de problemas',
                '10',
                '8',
                '9',
                '12',
                'Media',
                'Borrador',
            ],
            [
                'Razonamiento Cuantitativo',
                'El promedio de 4, 6 y 8 es:',
                'Estadística',
                'Formulacion y ejecucion',
                '6',
                '5',
                '7',
                '8',
                'Facil',
                'Publicada',
            ],
            [
                'Lectura Crítica',
                'Segun el texto, cual es la idea principal?',
                'Lectura Critica',
                'Comprension e interpretacion textual',
                'La idea central del autor',
                '',
                '',
                '',
                'Media',
                'Publicada',
            ],
        ]

        header = (
            'MODULO;ENUNCIADO;CATEGORIA;COMPETENCIA;OPCION_CORRECTA;DISTRACTOR_1;'
            'DISTRACTOR_2;DISTRACTOR_3;DIFICULTAD;ESTADO\r\n'
        )
        sample_csv = '\r\n'.join(';'.join(row) for row in rows)
        content = '\ufeffsep=;\r\n' + header + sample_csv + '\r\n'

        response = HttpResponse(content, content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = (
            'attachment; filename="Plantilla_Carga_Masiva_Preguntas.csv"'
        )
        return response

    @action(
        detail=False,
        methods=['post'],
        parser_classes=[MultiPartParser, FormParser],
        url_path='carga-masiva',
    )
    def carga_masiva(self, request):
        archivo = request.FILES.get('archivo') or request.FILES.get('file')
        if not archivo:
            return Response(
                {'detalle': "Debes enviar un archivo en el campo 'archivo' o 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        modulo_id = str(request.data.get('modulo_id') or '').strip()
        modulo_forzado = None
        if modulo_id:
            try:
                modulo_forzado = ModuloPrueba.objects.get(id=int(modulo_id))
            except (TypeError, ValueError, ModuloPrueba.DoesNotExist):
                return Response(
                    {'detalle': 'Modulo invalido.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        categoria_forzada = None
        competencia_forzada = None
        categoria_id = str(request.data.get('categoria_id') or '').strip()
        competencia_id = str(request.data.get('competencia_id') or '').strip()

        if (categoria_id or competencia_id) and modulo_forzado is None:
            return Response(
                {
                    'detalle': (
                        'Para sobrescribir categoria o competencia debes seleccionar '
                        'un modulo global en el modal.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if categoria_id:
            categoria_forzada = Categoria.objects.filter(
                id=categoria_id,
                modulo=modulo_forzado,
            ).first()
            if categoria_forzada is None:
                return Response(
                    {'detalle': 'La categoria seleccionada no pertenece al modulo indicado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if competencia_id:
            competencia_forzada = Competencia.objects.filter(
                id=competencia_id,
                modulo=modulo_forzado,
            ).first()
            if competencia_forzada is None:
                return Response(
                    {'detalle': 'La competencia seleccionada no pertenece al modulo indicado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            df = self._read_bulk_file(archivo)
        except Exception as exc:
            return Response({'detalle': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        estado_default = str(request.data.get('estado') or 'Publicada').strip() or 'Publicada'
        dificultad_default = self._map_dificultad(request.data.get('dificultad') or 'Media')
        nuevo_lote = uuid.uuid4()

        preguntas_creadas = 0
        filas_con_ia = 0
        filas_omitidas = 0
        errores = []

        for index, row in df.iterrows():
            fila_excel = index + 2
            try:
                with transaction.atomic():
                    enunciado = self._read_cell(row, 'ENUNCIADO')
                    opcion_correcta = self._read_cell(
                        row,
                        'OPCION_CORRECTA',
                        'RESPUESTA_CORRECTA',
                    )
                    modulo_row = self._read_cell(row, 'MODULO_ID', 'MODULO')
                    categoria_row = self._read_cell(row, 'CATEGORIA_ID', 'CATEGORIA')
                    competencia_row = self._read_cell(
                        row,
                        'COMPETENCIA_ID',
                        'COMPETENCIA',
                    )
                    distractor_1 = self._read_cell(row, 'DISTRACTOR_1')
                    distractor_2 = self._read_cell(row, 'DISTRACTOR_2')
                    distractor_3 = self._read_cell(row, 'DISTRACTOR_3')

                    # Ignora filas totalmente vacias (comunes al final de archivos CSV/XLSX).
                    if not any(
                        [
                            enunciado,
                            opcion_correcta,
                            modulo_row,
                            categoria_row,
                            competencia_row,
                            distractor_1,
                            distractor_2,
                            distractor_3,
                        ]
                    ):
                        filas_omitidas += 1
                        continue

                    modulo_final = modulo_forzado
                    if modulo_final is None:
                        modulo_final = self._resolve_modulo(modulo_row)

                    if modulo_final is None:
                        raise ValueError(
                            'No se pudo resolver el modulo para la fila. '
                            'Completa MODULO/MODULO_ID en el Excel o selecciona un modulo en el modal.'
                        )

                    if not enunciado or not opcion_correcta:
                        raise ValueError(
                            'Cada fila debe incluir ENUNCIADO y OPCION_CORRECTA.'
                        )

                    contexto_texto = self._read_cell(
                        row, 'CONTEXTO', 'contexto', 'CONTEXTO_TEXTO', 'contexto_texto'
                    )
                    estado = self._read_cell(row, 'ESTADO', 'estado') or estado_default
                    dificultad_val = (
                        self._read_cell(
                            row,
                            'DIFICULTAD',
                            'dificultad',
                            'NIVEL_DIFICULTAD',
                            'nivel_dificultad',
                        )
                        or dificultad_default
                    )
                    nivel_dificultad = self._map_dificultad(dificultad_val)

                    categoria = self._resolve_categoria(
                        modulo_final,
                        None,
                        categoria_row,
                    )
                    competencia = self._resolve_competencia(
                        modulo_final,
                        None,
                        competencia_row,
                    )

                    if categoria_forzada is not None:
                        categoria = categoria_forzada

                    if competencia_forzada is not None:
                        competencia = competencia_forzada

                    if not categoria:
                        raise ValueError(
                            'No se pudo resolver la categoria para la fila. '
                            'Completa CATEGORIA/CATEGORIA_ID en el Excel o selecciona una categoria en el modal.'
                        )
                    if not competencia:
                        raise ValueError(
                            'No se pudo resolver la competencia para la fila. '
                            'Completa COMPETENCIA/COMPETENCIA_ID en el Excel o selecciona una competencia en el modal.'
                        )

                    distractores_raw = [
                        distractor_1,
                        distractor_2,
                        distractor_3,
                    ]
                    distractores = [value for value in distractores_raw if value]

                    if len(distractores) < 3:
                        filas_con_ia += 1
                        sugeridos = autocompletar_distractores(
                            enunciado=enunciado,
                            opcion_correcta=opcion_correcta,
                            modulo_nombre=modulo_final.nombre,
                        )
                        for sugerido in sugeridos:
                            limpio = str(sugerido or '').strip()
                            if not limpio:
                                continue
                            if limpio.lower() == opcion_correcta.lower():
                                continue
                            if limpio.lower() in {d.lower() for d in distractores}:
                                continue
                            distractores.append(limpio)
                            if len(distractores) == 3:
                                break

                    while len(distractores) < 3:
                        distractores.append(f'Distractor generado {len(distractores) + 1}')

                    pregunta = Pregunta.objects.create(
                        modulo=modulo_final,
                        categoria=categoria,
                        competencia=competencia,
                        nivel_dificultad=nivel_dificultad,
                        contexto_texto=contexto_texto or None,
                        enunciado=enunciado,
                        estado=estado,
                        lote_id=nuevo_lote,
                        limite_palabras=None,
                    )

                    OpcionRespuesta.objects.create(
                        pregunta=pregunta,
                        texto=opcion_correcta,
                        es_correcta=True,
                    )
                    for distractor in distractores[:3]:
                        OpcionRespuesta.objects.create(
                            pregunta=pregunta,
                            texto=distractor,
                            es_correcta=False,
                        )

                    preguntas_creadas += 1
            except Exception as exc:
                errores.append({'fila': fila_excel, 'error': str(exc)})

        return Response(
            {
                'status': 'OK',
                'preguntas_creadas': preguntas_creadas,
                'filas_con_ia': filas_con_ia,
                'filas_omitidas': filas_omitidas,
                'lote_id': str(nuevo_lote),
                'errores': errores,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['post'], url_path='revertir-carga')
    def revertir_carga(self, request):
        lote_id_raw = str(request.data.get('lote_id') or '').strip()
        if not lote_id_raw:
            return Response(
                {'error': 'Se requiere el lote_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lote_id = uuid.UUID(lote_id_raw)
        except ValueError:
            return Response(
                {'error': 'El lote_id enviado no es valido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        preguntas = Pregunta.objects.filter(lote_id=lote_id)
        cantidad = preguntas.count()
        preguntas.delete()

        return Response(
            {
                'status': 'OK',
                'cantidad_eliminada': cantidad,
                'mensaje': f'Se eliminaron {cantidad} preguntas del lote {lote_id}.',
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=['get'], url_path='criticas')
    def criticas(self, request):
        umbral_raw = str(request.query_params.get('umbral') or '60').strip()
        programa_id = str(request.query_params.get('programa_id') or '').strip()
        nivel = str(request.query_params.get('nivel') or '').strip()
        search = str(request.query_params.get('search') or '').strip()

        try:
            umbral = float(umbral_raw)
        except ValueError:
            return Response(
                {'detalle': 'El parametro umbral debe ser numerico.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filtro_base = Q(
            respuestaestudiante__intento__estado__in=['Finalizado', 'Pendiente Calificacion'],
        )

        if programa_id:
            filtro_base &= Q(
                respuestaestudiante__intento__estudiante__programa_id=programa_id,
            )

        preguntas = Pregunta.objects.all()
        if nivel:
            nivel_map = {
                'Facil': 'Facil',
                'Media': 'Medio',
                'Alta': 'Dificil',
                'Medio': 'Medio',
                'Dificil': 'Dificil',
            }
            nivel_backend = nivel_map.get(nivel, nivel)
            preguntas = preguntas.filter(nivel_dificultad=nivel_backend)

        if search:
            preguntas = preguntas.filter(enunciado__icontains=search)

        preguntas = (
            preguntas.select_related('modulo', 'categoria', 'competencia')
            .annotate(
                total_respondidas=Count('respuestaestudiante', filter=filtro_base),
                respuestas_incorrectas=Count(
                    'respuestaestudiante',
                    filter=(
                        filtro_base
                        & (
                            Q(respuestaestudiante__opcion_seleccionada__es_correcta=False)
                            | Q(respuestaestudiante__opcion_seleccionada__isnull=True)
                        )
                    ),
                ),
            )
            .annotate(
                tasa_error=Case(
                    When(total_respondidas=0, then=Value(0.0)),
                    default=ExpressionWrapper(
                        Cast(F('respuestas_incorrectas'), FloatField())
                        * Value(100.0)
                        / Cast(F('total_respondidas'), FloatField()),
                        output_field=FloatField(),
                    ),
                    output_field=FloatField(),
                ),
            )
            .filter(total_respondidas__gt=0, tasa_error__gte=umbral)
            .order_by('-tasa_error', '-total_respondidas', 'created_at')
        )

        preguntas_list = list(preguntas[:300])
        serializer = self.get_serializer(preguntas_list, many=True)

        data = []
        for index, item in enumerate(serializer.data):
            obj = preguntas_list[index]
            item['tasa_error'] = round(float(getattr(obj, 'tasa_error', 0.0) or 0.0), 2)
            item['total_respondidas'] = int(getattr(obj, 'total_respondidas', 0) or 0)
            item['respuestas_incorrectas'] = int(getattr(obj, 'respuestas_incorrectas', 0) or 0)
            data.append(item)

        return Response(
            {
                'umbral': umbral,
                'total': len(data),
                'results': data,
            },
            status=status.HTTP_200_OK,
        )


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
        queryset = PlantillaExamen.objects.prefetch_related('reglas').filter(
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

                    if preguntas_agregadas:
                        preguntas_qs = preguntas_qs.exclude(id__in=preguntas_agregadas)

                    preguntas = list(
                        preguntas_qs.distinct().order_by('?')[: regla.cantidad_preguntas]
                    )

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
        return (
            IntentoExamen.objects.filter(estudiante=self.request.user)
            .select_related('plantilla_examen')
            .prefetch_related('respuestas__opcion_seleccionada', 'respuestas__pregunta')
        )

    @staticmethod
    def _calcular_puntaje_saber_pro(intento):
        respuestas = list(intento.respuestas.all())
        total_preguntas = len(respuestas)
        if total_preguntas == 0:
            return 0

        aciertos_multiples = 0
        puntaje_ensayos = Decimal('0')

        for respuesta in respuestas:
            if respuesta.opcion_seleccionada_id and respuesta.opcion_seleccionada.es_correcta:
                aciertos_multiples += 1

            if respuesta.pregunta.limite_palabras is not None and respuesta.puntaje_calificado is not None:
                puntaje_ensayos += respuesta.puntaje_calificado

        total_aciertos = Decimal(aciertos_multiples) + puntaje_ensayos
        return round((float(total_aciertos) / total_preguntas) * 300)

    @action(detail=True, methods=['get'])
    def cargar_respuestas(self, request, pk=None):
        intento = self.get_object()
        modulo_id = request.query_params.get('modulo')

        respuestas = (
            RespuestaEstudiante.objects.filter(intento=intento)
            .select_related('pregunta')
            .order_by('id')
        )
        if modulo_id:
            respuestas = respuestas.filter(pregunta__modulo_id=modulo_id)

        serializer = RespuestaEstudianteDetalleSerializer(respuestas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='preguntas')
    def preguntas(self, request, pk=None):
        intento = self.get_object()
        respuestas = (
            RespuestaEstudiante.objects.filter(intento=intento)
            .select_related('pregunta')
            .order_by('id')
        )
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

    @action(detail=True, methods=['post'])
    def generar_plan_estudio(self, request, pk=None):
        intento = self.get_object()

        if intento.plan_estudio_ia:
            return Response({'plan': intento.plan_estudio_ia}, status=status.HTTP_200_OK)

        respuestas = intento.respuestas.select_related(
            'pregunta__modulo',
            'pregunta__competencia',
            'pregunta__categoria',
            'opcion_seleccionada',
        )

        respuestas_malas = []
        for respuesta in respuestas:
            pregunta = respuesta.pregunta

            if pregunta.limite_palabras is None:
                # Opcion multiple: sin seleccionar o seleccion incorrecta cuenta como falla.
                if not respuesta.opcion_seleccionada_id or not respuesta.opcion_seleccionada.es_correcta:
                    respuestas_malas.append(respuesta)
                continue

            # Ensayo: solo se considera falla si ya fue calificado en 0 o menos.
            if respuesta.puntaje_calificado is not None and float(respuesta.puntaje_calificado) <= 0:
                respuestas_malas.append(respuesta)

        if len(respuestas_malas) == 0:
            mensaje = (
                '## Excelente resultado\n\n'
                'Felicidades, no se identificaron respuestas incorrectas en este intento. '
                'Sigue practicando para mantener ese nivel.'
            )
            intento.plan_estudio_ia = mensaje
            intento.save(update_fields=['plan_estudio_ia'])
            return Response({'plan': mensaje}, status=status.HTTP_200_OK)

        debilidades = {}
        for respuesta in respuestas_malas:
            modulo_nombre = respuesta.pregunta.modulo.nombre
            competencia_nombre = (
                respuesta.pregunta.competencia.nombre
                if respuesta.pregunta.competencia_id
                else 'General'
            )
            debilidades.setdefault(modulo_nombre, set()).add(competencia_nombre)

        resumen_fallos = '\n'.join(
            [
                f"- Modulo {modulo}: Fallo en competencias como {', '.join(sorted(competencias))}"
                for modulo, competencias in debilidades.items()
            ]
        )

        puntaje_global = self._calcular_puntaje_saber_pro(intento)

        prompt = f"""
      Eres un tutor experto en pruebas ICFES Saber Pro. Un estudiante ha fallado preguntas en tu área.

      Puntaje obtenido: {puntaje_global}
      Áreas de fallo exactas: {resumen_fallos}

      Tu objetivo no es darle consejos generales ni motivación vacía. Tu objetivo es ENSEÑARLE a resolver sus errores AHORA MISMO.
      Crea una micro-lección de tutoría en formato Markdown estructurada estrictamente de la siguiente manera:

      ### 💡 ¿Por qué es importante esto?
      (Explica en un párrafo corto y directo, sin rodeos, qué significa esta competencia en la vida real o en la prueba).

      ### 🔍 Concepto Clave (Repaso Rápido)
      (Explica el concepto matemático, de lectura o lógica que el estudiante necesita saber para no volver a fallar. Usa ejemplos cortos. Si falló en gráficas, explícale cómo leer los ejes X y Y).

      ### 🏋️‍♂️ Gimnasio Mental: Ejercicios Prácticos
      (Crea 3 ejercicios de práctica RÁPIDOS y directos basados en las competencias donde falló. Plantea el problema y haz la pregunta).
      * **Ejercicio 1:** [Planteamiento del problema de nivel básico]
      * **Ejercicio 2:** [Planteamiento del problema de nivel medio]
      * **Ejercicio 3:** [Planteamiento del problema de nivel alto]

      ### ✅ Respuestas Explicadas
      (Proporciona la solución paso a paso de los 3 ejercicios anteriores para que el estudiante pueda autoevaluarse inmediatamente).

      No incluyas cronogramas de días, no lo mandes a buscar en otras páginas, no uses frases cliché extensas. Sé un profesor al grano, práctico y enfocado en la resolución de problemas.
      """

        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            modelo_nombre, _ = GenerarOpcionesIAView._resolver_modelo_gemini()
            model = genai.GenerativeModel(modelo_nombre)
            response = model.generate_content(prompt)
            plan_generado = str(getattr(response, 'text', '') or '').strip()

            if not plan_generado:
                raise ValueError('La IA no devolvio contenido para el plan.')

            intento.plan_estudio_ia = plan_generado
            intento.save(update_fields=['plan_estudio_ia'])

            return Response({'plan': plan_generado}, status=status.HTTP_200_OK)

        except Exception as exc:
            return Response(
                {
                    'detalle': 'No fue posible generar el plan de estudio en este momento.',
                    'error': str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
                    'plan_estudio_ia': intento.plan_estudio_ia,
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
                'plan_estudio_ia': intento.plan_estudio_ia,
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

    @action(detail=False, methods=['get'], url_path='cobertura-programa')
    def cobertura_programa(self, request):
        cobertura = (
            ProgramaAcademico.objects.annotate(
                total_estudiantes=Count(
                    'estudiantes',
                    filter=Q(estudiantes__rol=Usuario.ROL_ESTUDIANTE, estudiantes__is_active=True),
                    distinct=True,
                ),
                estudiantes_con_intento=Count(
                    'estudiantes',
                    filter=Q(
                        estudiantes__rol=Usuario.ROL_ESTUDIANTE,
                        estudiantes__is_active=True,
                        estudiantes__intentos__estado='Finalizado',
                    ),
                    distinct=True,
                ),
            )
            .order_by('nombre')
        )

        data = []
        for programa in cobertura:
            total = int(getattr(programa, 'total_estudiantes', 0) or 0)
            con_intento = int(getattr(programa, 'estudiantes_con_intento', 0) or 0)
            porcentaje = round((con_intento / total) * 100, 2) if total > 0 else 0.0
            data.append(
                {
                    'programa_id': programa.id,
                    'programa_nombre': programa.nombre,
                    'total_estudiantes_activos': total,
                    'estudiantes_con_intento_finalizado': con_intento,
                    'cobertura_porcentaje': porcentaje,
                }
            )

        return Response({'results': data}, status=status.HTTP_200_OK)


class ReportesViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @staticmethod
    def _base_respuestas(request):
        programa_id = str(request.query_params.get('programa_id') or '').strip()
        simulacro_id = str(request.query_params.get('simulacro_id') or '').strip()

        filtros = Q(intento__estado__in=['Finalizado', 'Pendiente Calificacion'])
        if programa_id:
            filtros &= Q(intento__estudiante__programa_id=programa_id)
        if simulacro_id:
            filtros &= Q(intento__plantilla_examen_id=simulacro_id)

        acierto_expr = Case(
            When(opcion_seleccionada__es_correcta=True, then=Value(1.0)),
            default=Value(0.0),
            output_field=FloatField(),
        )

        return (
            RespuestaEstudiante.objects.filter(filtros)
            .select_related('pregunta', 'intento__estudiante')
            .annotate(acierto=acierto_expr)
        )

    @action(detail=False, methods=['get'], url_path='resumen')
    def resumen(self, request):
        respuestas = self._base_respuestas(request)

        promedio_general = respuestas.aggregate(
            promedio=Avg('acierto'),
            total=Count('id'),
        )

        por_dificultad = (
            respuestas.values('pregunta__nivel_dificultad')
            .annotate(promedio=Avg('acierto'), total=Count('id'))
            .order_by('pregunta__nivel_dificultad')
        )

        por_competencia = (
            respuestas.values('pregunta__competencia__nombre')
            .annotate(promedio=Avg('acierto'), total=Count('id'))
            .order_by('pregunta__competencia__nombre')
        )

        por_categoria = (
            respuestas.values('pregunta__categoria__nombre')
            .annotate(promedio=Avg('acierto'), total=Count('id'))
            .order_by('pregunta__categoria__nombre')
        )

        por_genero = (
            respuestas.values('intento__estudiante__genero')
            .annotate(promedio=Avg('acierto'), total=Count('id'))
            .order_by('intento__estudiante__genero')
        )

        por_semestre = (
            respuestas.values('intento__estudiante__semestre_actual')
            .annotate(promedio=Avg('acierto'), total=Count('id'))
            .order_by('intento__estudiante__semestre_actual')
        )

        def _map_bucket(rows, key):
            data = []
            for row in rows:
                etiqueta = row.get(key)
                promedio = float(row.get('promedio') or 0.0)
                data.append(
                    {
                        'label': etiqueta if etiqueta not in [None, ''] else 'Sin dato',
                        'promedio': round(promedio * 300, 2),
                        'total': int(row.get('total') or 0),
                    }
                )
            return data

        return Response(
            {
                'promedio_general_prueba': round(float(promedio_general.get('promedio') or 0.0) * 300, 2),
                'total_respuestas': int(promedio_general.get('total') or 0),
                'promedio_por_dificultad': _map_bucket(por_dificultad, 'pregunta__nivel_dificultad'),
                'promedio_por_competencia': _map_bucket(por_competencia, 'pregunta__competencia__nombre'),
                'promedio_por_categoria': _map_bucket(por_categoria, 'pregunta__categoria__nombre'),
                'desempeno_por_genero': _map_bucket(por_genero, 'intento__estudiante__genero'),
                'desempeno_por_semestre': _map_bucket(por_semestre, 'intento__estudiante__semestre_actual'),
            },
            status=status.HTTP_200_OK,
        )
