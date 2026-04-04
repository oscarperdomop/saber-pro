import io
import re

import pandas as pd
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Notificacion, ProgramaAcademico, Usuario
from .serializers import (
    ActualizarMiPasswordSerializer,
    CambiarPasswordSerializer,
    CustomTokenObtainPairSerializer,
    MiPerfilSerializer,
    NotificacionSerializer,
    ProgramaAcademicoSerializer,
    UsuarioCreateSerializer,
    UsuarioListadoSerializer,
    validate_new_password_rules,
)

SOLO_LETRAS_REGEX = re.compile(r'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ActivarCuentaView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = CambiarPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        password_actual = serializer.validated_data['password_actual']
        password_nueva = serializer.validated_data['password_nueva']

        if not request.user.check_password(password_actual):
            return Response(
                {'password_actual': ['La contrasena actual es incorrecta.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(password_nueva)
        request.user.es_primer_ingreso = False
        request.user.save()

        return Response(
            {'mensaje': 'Contrasena actualizada y cuenta activada con exito.'},
            status=status.HTTP_200_OK,
        )


class CargaMasivaUsuariosView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = (MultiPartParser, FormParser)

    @staticmethod
    def _clean_value(value):
        if value is None:
            return ''
        text = str(value).strip()
        if text.endswith('.0') and text.replace('.', '', 1).isdigit():
            text = text[:-2]
        return text

    @staticmethod
    def _limit_length(value, max_len):
        return value[:max_len]

    @staticmethod
    def _to_upper(value):
        return value.upper() if isinstance(value, str) else value

    @staticmethod
    def _read_cell(row, *keys):
        for key in keys:
            value = row.get(key, None)
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            return value
        return ''

    @staticmethod
    def _parse_genero(value):
        normalized = str(value or '').strip().upper()
        if not normalized:
            return None
        if normalized.startswith('M'):
            return 'M'
        if normalized.startswith('F'):
            return 'F'
        if normalized.startswith('O'):
            return 'O'
        return None

    @staticmethod
    def _parse_semestre(value):
        normalized = str(value or '').strip()
        if not normalized:
            return None
        try:
            semestre = int(float(normalized))
        except (TypeError, ValueError):
            return None
        return semestre if semestre > 0 else None

    @staticmethod
    def _read_csv_uploaded_file(uploaded_file):
        """
        Convierte el archivo subido (bytes) a texto para evitar errores del csv.Sniffer
        con streams binarios en pandas.read_csv(..., sep=None, engine='python').
        """
        raw_bytes = uploaded_file.read()
        uploaded_file.seek(0)

        if not raw_bytes:
            raise ValueError('El archivo CSV esta vacio.')

        last_error = None
        for encoding in ('utf-8-sig', 'utf-8', 'latin-1'):
            try:
                text = raw_bytes.decode(encoding)
                return pd.read_csv(io.StringIO(text), sep=None, engine='python')
            except UnicodeDecodeError as exc:
                last_error = exc
                continue

        raise ValueError(f'No se pudo decodificar el archivo CSV: {last_error}')

    def post(self, request):
        if getattr(request.user, 'rol', None) != Usuario.ROL_ADMIN:
            return Response(
                {'detalle': 'Solo el Administrador Supremo puede gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        archivo = request.FILES.get('archivo') or request.FILES.get('file')
        if not archivo:
            return Response(
                {'detalle': "Debes enviar un archivo en el campo 'archivo' o 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre_archivo = archivo.name.lower()

        try:
            if nombre_archivo.endswith('.xlsx'):
                df = pd.read_excel(archivo)
            elif nombre_archivo.endswith('.csv'):
                # Detecta delimitador automaticamente (coma, punto y coma, tab, etc.)
                # usando stream de texto, no bytes.
                df = self._read_csv_uploaded_file(archivo)
            else:
                return Response(
                    {'detalle': 'Formato de archivo no soportado. Usa .xlsx o .csv.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as exc:
            return Response(
                {'detalle': f'No se pudo leer el archivo de carga: {exc}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df.fillna('', inplace=True)

        creados = 0
        errores = []
        documentos_existentes = {
            str(value).strip().upper()
            for value in Usuario.objects.values_list('documento', flat=True)
            if value
        }
        correos_existentes = {
            str(value).strip().lower()
            for value in Usuario.objects.values_list('correo_institucional', flat=True)
            if value
        }
        documentos_archivo = set()
        correos_archivo = set()

        for index, row in df.iterrows():
            try:
                with transaction.atomic():
                    documento = self._limit_length(
                        self._clean_value(self._read_cell(row, 'documento', 'DOCUMENTO')),
                        20,
                    )
                    tipo_documento = self._limit_length(
                        self._clean_value(self._read_cell(row, 'tipo_documento', 'TIPO_DOCUMENTO')),
                        5,
                    )
                    nombres = self._limit_length(
                        self._clean_value(self._read_cell(row, 'nombres', 'NOMBRES')),
                        100,
                    )
                    apellidos = self._limit_length(
                        self._clean_value(self._read_cell(row, 'apellidos', 'APELLIDOS')),
                        100,
                    )
                    correo_institucional = self._limit_length(
                        self._clean_value(
                            self._read_cell(row, 'correo_institucional', 'CORREO_INSTITUCIONAL'),
                        ).lower(),
                        254,
                    )
                    nombre_programa = self._limit_length(
                        self._clean_value(self._read_cell(row, 'programa', 'PROGRAMA')),
                        150,
                    )
                    genero_raw = self._clean_value(self._read_cell(row, 'genero', 'GENERO'))
                    semestre_raw = self._clean_value(
                        self._read_cell(row, 'semestre_actual', 'semestre', 'SEMESTRE'),
                    )
                    genero = self._parse_genero(genero_raw)
                    semestre_actual = self._parse_semestre(semestre_raw)

                    documento = self._to_upper(documento)
                    tipo_documento = self._to_upper(tipo_documento)
                    nombres = self._to_upper(nombres)
                    apellidos = self._to_upper(apellidos)
                    nombre_programa = self._to_upper(nombre_programa)

                    if not all(
                        [
                            documento,
                            tipo_documento,
                            nombres,
                            apellidos,
                            correo_institucional,
                            nombre_programa,
                        ]
                        ):
                        raise ValueError(
                            'Faltan campos obligatorios: documento, tipo_documento, nombres, '
                            'apellidos, correo_institucional, programa.'
                        )

                    nombres = ' '.join(nombres.split())
                    apellidos = ' '.join(apellidos.split())

                    if not SOLO_LETRAS_REGEX.fullmatch(nombres):
                        raise ValueError('Nombres invalidos: solo se permiten letras.')
                    if not SOLO_LETRAS_REGEX.fullmatch(apellidos):
                        raise ValueError('Apellidos invalidos: solo se permiten letras.')

                    if not documento.isdigit():
                        raise ValueError('Documento invalido: solo se permiten numeros.')
                    if len(documento) > 10:
                        raise ValueError(
                            'Documento invalido: debe tener maximo 10 digitos.',
                        )

                    if not correo_institucional.endswith('@usco.edu.co'):
                        raise ValueError(
                            'Correo institucional invalido: debe terminar en @usco.edu.co.',
                        )

                    if documento in documentos_existentes:
                        raise ValueError('Documento duplicado: ya existe en la base de datos.')
                    if correo_institucional in correos_existentes:
                        raise ValueError(
                            'Correo institucional duplicado: ya existe en la base de datos.',
                        )
                    if documento in documentos_archivo:
                        raise ValueError('Documento duplicado dentro del archivo de carga.')
                    if correo_institucional in correos_archivo:
                        raise ValueError(
                            'Correo institucional duplicado dentro del archivo de carga.',
                        )

                    codigo_snies = self._clean_value(row.get('codigo_snies')) or documento
                    codigo_snies = self._limit_length(codigo_snies, 15)
                    facultad = self._limit_length(self._clean_value(row.get('facultad')) or 'SIN DEFINIR', 100)
                    sede = self._limit_length(self._clean_value(row.get('sede')) or 'PRINCIPAL', 50)

                    codigo_snies = self._to_upper(codigo_snies)
                    facultad = self._to_upper(facultad)
                    sede = self._to_upper(sede)

                    programa_obj, _ = ProgramaAcademico.objects.get_or_create(
                        nombre=nombre_programa,
                        defaults={
                            'codigo_snies': codigo_snies,
                            'facultad': facultad,
                            'sede': sede,
                        },
                    )

                    Usuario.objects.create_user(
                        correo_institucional=correo_institucional,
                        password=documento,
                        documento=documento,
                        tipo_documento=tipo_documento,
                        nombres=nombres,
                        apellidos=apellidos,
                        programa=programa_obj,
                        genero=genero,
                        semestre_actual=semestre_actual,
                        es_primer_ingreso=True,
                    )

                    documentos_existentes.add(documento)
                    correos_existentes.add(correo_institucional)
                    documentos_archivo.add(documento)
                    correos_archivo.add(correo_institucional)
                    creados += 1
            except Exception as e:
                errores.append({'fila': index + 2, 'error': str(e)})

        return Response(
            {'total_procesados': len(df), 'creados': creados, 'errores': errores},
            status=status.HTTP_200_OK,
        )


class UsuariosListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    class UsuariosPagination(PageNumberPagination):
        page_size = 10
        page_size_query_param = 'page_size'
        max_page_size = 50

    def get(self, request):
        if getattr(request.user, 'rol', None) != Usuario.ROL_ADMIN:
            return Response(
                {'detalle': 'Solo el Administrador Supremo puede gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuarios = Usuario.objects.select_related('programa').all().order_by('nombres', 'apellidos')
        search = (request.query_params.get('search') or '').strip()

        if search:
            usuarios = usuarios.filter(
                Q(nombres__icontains=search)
                | Q(apellidos__icontains=search)
                | Q(correo_institucional__icontains=search)
                | Q(documento__icontains=search)
            )

        paginator = self.UsuariosPagination()
        page = paginator.paginate_queryset(usuarios, request, view=self)
        serializer = UsuarioListadoSerializer(page, many=True)

        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if getattr(request.user, 'rol', None) != Usuario.ROL_ADMIN:
            return Response(
                {'detalle': 'Solo el Administrador Supremo puede gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UsuarioCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save(es_primer_ingreso=True, is_active=True)
        serializer = UsuarioListadoSerializer(usuario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProgramasListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        programas = ProgramaAcademico.objects.all().order_by('nombre')
        serializer = ProgramaAcademicoSerializer(programas, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MiPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MiPerfilSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = ActualizarMiPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        password_nueva = serializer.validated_data['password_nueva']
        request.user.set_password(password_nueva)
        request.user.save(update_fields=['password'])

        return Response({'mensaje': 'Contrasena actualizada con exito.'}, status=status.HTTP_200_OK)


class NotificacionesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limite_raw = str(request.query_params.get('limit') or '').strip()
        try:
            limite = int(limite_raw) if limite_raw else 20
        except ValueError:
            limite = 20

        limite = max(1, min(limite, 100))
        notificaciones = Notificacion.objects.filter(usuario=request.user).order_by('-created_at')[:limite]
        serializer = NotificacionSerializer(notificaciones, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        ids = request.data.get('ids')
        marcar_todas_raw = request.data.get('marcar_todas')
        if isinstance(marcar_todas_raw, bool):
            marcar_todas = marcar_todas_raw
        else:
            marcar_todas = str(marcar_todas_raw or '').strip().lower() in {'1', 'true', 'yes', 'si'}

        queryset = Notificacion.objects.filter(usuario=request.user, leida=False)
        if not marcar_todas:
            if not isinstance(ids, list) or len(ids) == 0:
                return Response(
                    {'detalle': "Envia 'ids' (lista) o 'marcar_todas': true."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(id__in=ids)

        actualizadas = queryset.update(leida=True)
        return Response({'actualizadas': actualizadas}, status=status.HTTP_200_OK)


class NotificacionesContadorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
        return Response({'no_leidas': no_leidas}, status=status.HTTP_200_OK)


class UsuariosEstadoUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @staticmethod
    def _parse_bool(value):
        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {'true', '1', 'yes', 'si'}:
                return True
            if normalized in {'false', '0', 'no'}:
                return False

        return None

    @staticmethod
    def _parse_genero(value):
        normalized = str(value or '').strip().upper()
        if not normalized:
            return None
        if normalized.startswith('M'):
            return 'M'
        if normalized.startswith('F'):
            return 'F'
        if normalized.startswith('O'):
            return 'O'
        return None

    @staticmethod
    def _parse_semestre(value):
        normalized = str(value or '').strip()
        if not normalized:
            return None
        try:
            semestre = int(float(normalized))
        except (TypeError, ValueError):
            return None
        return semestre if semestre > 0 else None

    def patch(self, request, user_id):
        if getattr(request.user, 'rol', None) != Usuario.ROL_ADMIN:
            return Response(
                {'detalle': 'Solo el Administrador Supremo puede gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        usuario = get_object_or_404(Usuario, id=user_id)
        payload = request.data
        campos_perfil = {
            'nombres',
            'apellidos',
            'correo_institucional',
            'tipo_documento',
            'numero_documento',
            'documento',
            'rol',
            'is_staff',
            'programa_id',
            'programa',
            'genero',
            'semestre_actual',
        }
        password_nueva = str(payload.get('password') or '').strip()
        requiere_actualizacion_estado = 'is_active' in payload
        requiere_actualizacion_perfil = any(campo in payload for campo in campos_perfil)
        requiere_actualizacion_password = bool(password_nueva)

        if (
            not requiere_actualizacion_estado
            and not requiere_actualizacion_perfil
            and not requiere_actualizacion_password
        ):
            return Response(
                {'detalle': 'No se enviaron campos validos para actualizar.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_fields = []

        if requiere_actualizacion_estado:
            is_active = self._parse_bool(payload.get('is_active'))
            if is_active is None:
                return Response(
                    {'detalle': "El campo 'is_active' es obligatorio y debe ser booleano."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            usuario.is_active = is_active
            update_fields.append('is_active')

        if requiere_actualizacion_perfil:
            if 'nombres' in payload:
                nombres = ' '.join(str(payload.get('nombres') or '').strip().split())
                if not nombres or not all(char.isalpha() or char.isspace() for char in nombres):
                    return Response(
                        {'nombres': ['Los nombres solo deben contener letras.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.nombres = nombres.upper()
                update_fields.append('nombres')

            if 'apellidos' in payload:
                apellidos = ' '.join(str(payload.get('apellidos') or '').strip().split())
                if not apellidos or not all(char.isalpha() or char.isspace() for char in apellidos):
                    return Response(
                        {'apellidos': ['Los apellidos solo deben contener letras.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.apellidos = apellidos.upper()
                update_fields.append('apellidos')

            if 'correo_institucional' in payload:
                correo = str(payload.get('correo_institucional') or '').strip().lower()
                if not correo.endswith('@usco.edu.co'):
                    return Response(
                        {
                            'correo_institucional': [
                                'El correo institucional debe terminar en @usco.edu.co.',
                            ],
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if Usuario.objects.filter(correo_institucional__iexact=correo).exclude(id=usuario.id).exists():
                    return Response(
                        {'correo_institucional': ['Ya existe un usuario con este correo institucional.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.correo_institucional = correo
                update_fields.append('correo_institucional')

            if 'tipo_documento' in payload:
                usuario.tipo_documento = str(payload.get('tipo_documento') or '').strip().upper()
                update_fields.append('tipo_documento')

            if 'numero_documento' in payload or 'documento' in payload:
                documento = payload.get('numero_documento', payload.get('documento'))
                documento_text = str(documento or '').strip()
                if not documento_text.isdigit():
                    return Response(
                        {'numero_documento': ['El numero de documento solo debe contener numeros.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if len(documento_text) > 10:
                    return Response(
                        {'numero_documento': ['El numero de documento debe tener maximo 10 digitos.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if Usuario.objects.filter(documento__iexact=documento_text).exclude(id=usuario.id).exists():
                    return Response(
                        {'numero_documento': ['Ya existe un usuario con este numero de documento.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.documento = documento_text
                update_fields.append('documento')

            if 'rol' in payload:
                rol = str(payload.get('rol') or '').strip().upper()
                if rol not in {Usuario.ROL_ADMIN, Usuario.ROL_PROFESOR, Usuario.ROL_ESTUDIANTE}:
                    return Response(
                        {
                            'rol': [
                                (
                                    'Rol invalido. Usa '
                                    f'{Usuario.ROL_ADMIN}, {Usuario.ROL_PROFESOR} o {Usuario.ROL_ESTUDIANTE}.'
                                ),
                            ],
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.rol = rol
                update_fields.append('rol')

            if 'is_staff' in payload:
                is_staff = self._parse_bool(payload.get('is_staff'))
                if is_staff is None:
                    return Response(
                        {'is_staff': ["El campo 'is_staff' debe ser booleano."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                rol_objetivo = (
                    str(payload.get('rol') or '').strip().upper() if 'rol' in payload else usuario.rol
                )
                if rol_objetivo == Usuario.ROL_PROFESOR:
                    usuario.is_staff = is_staff
                elif rol_objetivo == Usuario.ROL_ADMIN:
                    usuario.is_staff = True
                else:
                    usuario.is_staff = False
                update_fields.append('is_staff')

            if 'programa_id' in payload or 'programa' in payload:
                programa_id = payload.get('programa_id', payload.get('programa'))
                if programa_id in (None, ''):
                    usuario.programa = None
                else:
                    try:
                        programa_id_int = int(programa_id)
                    except (TypeError, ValueError):
                        return Response(
                            {'programa_id': ['Programa invalido.']},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    usuario.programa = get_object_or_404(ProgramaAcademico, id=programa_id_int)
                update_fields.append('programa')

            if 'genero' in payload:
                genero = self._parse_genero(payload.get('genero'))
                valor_genero = str(payload.get('genero') or '').strip()
                if valor_genero and genero is None:
                    return Response(
                        {'genero': ['Genero invalido. Usa M, F u O.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.genero = genero
                update_fields.append('genero')

            if 'semestre_actual' in payload:
                semestre = self._parse_semestre(payload.get('semestre_actual'))
                valor_semestre = str(payload.get('semestre_actual') or '').strip()
                if valor_semestre and semestre is None:
                    return Response(
                        {'semestre_actual': ['Semestre invalido. Debe ser numerico y mayor a 0.']},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.semestre_actual = semestre
                update_fields.append('semestre_actual')

            if usuario.rol != Usuario.ROL_ESTUDIANTE:
                if usuario.semestre_actual is not None:
                    usuario.semestre_actual = None
                    update_fields.append('semestre_actual')
            elif usuario.semestre_actual is None:
                return Response(
                    {
                        'semestre_actual': [
                            'El semestre actual es obligatorio para usuarios con rol ESTUDIANTE.',
                        ],
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if requiere_actualizacion_password:
            try:
                validate_new_password_rules(usuario, password_nueva)
            except (ValidationError, DRFValidationError) as exc:
                mensajes = []
                if hasattr(exc, 'message_dict'):
                    for values in exc.message_dict.values():
                        mensajes.extend(values)
                if hasattr(exc, 'messages'):
                    mensajes.extend(exc.messages)
                if not mensajes:
                    mensajes.append(str(exc))

                return Response({'password': mensajes}, status=status.HTTP_400_BAD_REQUEST)

            usuario.set_password(password_nueva)
            update_fields.append('password')

        try:
            usuario.full_clean()
        except ValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        usuario.save(update_fields=list(dict.fromkeys(update_fields)))

        serializer = UsuarioListadoSerializer(usuario)
        return Response(serializer.data, status=status.HTTP_200_OK)
