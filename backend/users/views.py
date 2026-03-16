import pandas as pd
from django.db import transaction
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import ProgramaAcademico, Usuario
from .serializers import CambiarPasswordSerializer, CustomTokenObtainPairSerializer


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

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response(
                {'detalle': "Debes enviar un archivo en el campo 'archivo'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre_archivo = archivo.name.lower()

        if nombre_archivo.endswith('.xlsx'):
            df = pd.read_excel(archivo)
        elif nombre_archivo.endswith('.csv'):
            df = pd.read_csv(archivo)
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
                        self._clean_value(row.get('correo_institucional')),
                        254,
                    )
                    nombre_programa = self._limit_length(self._clean_value(row.get('programa')), 150)

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
                    facultad = self._limit_length(self._clean_value(row.get('facultad')) or 'Sin definir', 100)
                    sede = self._limit_length(self._clean_value(row.get('sede')) or 'Principal', 50)

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
