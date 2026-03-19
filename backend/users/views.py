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

from .models import ProgramaAcademico, Usuario
from .serializers import (
    ActualizarMiPasswordSerializer,
    CambiarPasswordSerializer,
    CustomTokenObtainPairSerializer,
    MiPerfilSerializer,
    ProgramaAcademicoSerializer,
    UsuarioListadoSerializer,
    validate_new_password_rules,
)


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

    def post(self, request):
        archivo = request.FILES.get('archivo') or request.FILES.get('file')
        if not archivo:
            return Response(
                {'detalle': "Debes enviar un archivo en el campo 'archivo' o 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre_archivo = archivo.name.lower()

        if nombre_archivo.endswith('.xlsx'):
            df = pd.read_excel(archivo)
        elif nombre_archivo.endswith('.csv'):
            # Detecta delimitador automaticamente (coma, punto y coma, tab, etc.)
            df = pd.read_csv(archivo, sep=None, engine='python')
        else:
            return Response(
                {'detalle': 'Formato de archivo no soportado. Usa .xlsx o .csv.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df.fillna('', inplace=True)

        creados = 0
        errores = []

        for index, row in df.iterrows():
            try:
                with transaction.atomic():
                    documento = self._limit_length(self._clean_value(row.get('documento')), 20)
                    tipo_documento = self._limit_length(self._clean_value(row.get('tipo_documento')), 5)
                    nombres = self._limit_length(self._clean_value(row.get('nombres')), 100)
                    apellidos = self._limit_length(self._clean_value(row.get('apellidos')), 100)
                    correo_institucional = self._limit_length(
                        self._clean_value(row.get('correo_institucional')).lower(),
                        254,
                    )
                    nombre_programa = self._limit_length(self._clean_value(row.get('programa')), 150)

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
                        es_primer_ingreso=True,
                    )

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
        payload = request.data

        nombres = str(payload.get('nombres') or '').strip().upper()
        apellidos = str(payload.get('apellidos') or '').strip().upper()
        correo_institucional = str(payload.get('correo_institucional') or '').strip().lower()
        tipo_documento = str(payload.get('tipo_documento') or '').strip().upper()
        numero_documento = str(
            payload.get('numero_documento', payload.get('documento')) or '',
        ).strip().upper()
        rol = str(payload.get('rol') or Usuario.ROL_ESTUDIANTE).strip().upper()
        password = str(payload.get('password') or '').strip() or numero_documento

        if rol not in {Usuario.ROL_ADMIN, Usuario.ROL_ESTUDIANTE}:
            return Response(
                {'rol': [f"Rol invalido. Usa {Usuario.ROL_ADMIN} o {Usuario.ROL_ESTUDIANTE}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not all(
            [
                nombres,
                apellidos,
                correo_institucional,
                tipo_documento,
                numero_documento,
            ],
        ):
            return Response(
                {
                    'detalle': (
                        'Los campos nombres, apellidos, correo_institucional, '
                        'tipo_documento y numero_documento son obligatorios.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = Usuario(
            nombres=nombres,
            apellidos=apellidos,
            correo_institucional=correo_institucional,
            tipo_documento=tipo_documento,
            documento=numero_documento,
            rol=rol,
            es_primer_ingreso=True,
            is_active=True,
        )

        try:
            usuario.full_clean()
        except ValidationError as exc:
            return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)

        usuario.set_password(password)
        usuario.save()

        serializer = UsuarioListadoSerializer(usuario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProgramasListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, _request):
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

    def patch(self, request, user_id):
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
                usuario.nombres = str(payload.get('nombres') or '').strip().upper()
                update_fields.append('nombres')

            if 'apellidos' in payload:
                usuario.apellidos = str(payload.get('apellidos') or '').strip().upper()
                update_fields.append('apellidos')

            if 'correo_institucional' in payload:
                usuario.correo_institucional = str(payload.get('correo_institucional') or '').strip().lower()
                update_fields.append('correo_institucional')

            if 'tipo_documento' in payload:
                usuario.tipo_documento = str(payload.get('tipo_documento') or '').strip().upper()
                update_fields.append('tipo_documento')

            if 'numero_documento' in payload or 'documento' in payload:
                documento = payload.get('numero_documento', payload.get('documento'))
                usuario.documento = str(documento or '').strip().upper()
                update_fields.append('documento')

            if 'rol' in payload:
                rol = str(payload.get('rol') or '').strip().upper()
                if rol not in {Usuario.ROL_ADMIN, Usuario.ROL_ESTUDIANTE}:
                    return Response(
                        {
                            'rol': [
                                f"Rol invalido. Usa {Usuario.ROL_ADMIN} o {Usuario.ROL_ESTUDIANTE}.",
                            ],
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                usuario.rol = rol
                update_fields.append('rol')

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
