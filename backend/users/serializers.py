import re

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Notificacion, ProgramaAcademico, Usuario

SOLO_LETRAS_REGEX = re.compile(r'^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$')


def validate_new_password_rules(user, value):
    errores = []

    if len(value) < 8:
        errores.append('La nueva contrasena debe tener al menos 8 caracteres.')

    if not any(char.isupper() for char in value):
        errores.append('La nueva contrasena debe contener al menos una letra mayuscula.')

    if not any(char.isdigit() for char in value):
        errores.append('La nueva contrasena debe contener al menos un numero.')

    documento_usuario = getattr(user, 'documento', None)
    if documento_usuario and value == str(documento_usuario):
        errores.append('La nueva contrasena no puede ser igual al numero de documento.')

    if errores:
        raise serializers.ValidationError(errores)

    validate_password(value, user)
    return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        correo_key = self.username_field
        correo = str(attrs.get(correo_key, '')).strip().lower()
        password = str(attrs.get('password', ''))

        if correo and password:
            usuario = Usuario.objects.filter(correo_institucional__iexact=correo).first()
            if usuario and usuario.check_password(password) and not usuario.is_active:
                raise AuthenticationFailed(
                    'Cuenta inactiva. Comunícate con el administrador',
                    code='inactive_account',
                )

        data = super().validate(attrs)

        data['id'] = str(self.user.id)
        data['rol'] = self.user.rol
        data['correo_institucional'] = self.user.correo_institucional
        data['nombres'] = self.user.nombres
        data['apellidos'] = self.user.apellidos
        data['is_staff'] = self.user.is_staff
        data['es_primer_ingreso'] = self.user.es_primer_ingreso

        return data


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True)

    def validate_password_nueva(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return validate_new_password_rules(user, value)


class MiPerfilSerializer(serializers.ModelSerializer):
    numero_documento = serializers.CharField(source='documento', read_only=True)
    programa = serializers.CharField(source='programa.nombre', read_only=True)
    programa_id = serializers.IntegerField(source='programa.id', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'rol',
            'nombres',
            'apellidos',
            'correo_institucional',
            'tipo_documento',
            'numero_documento',
            'genero',
            'semestre_actual',
            'programa',
            'programa_id',
            'is_staff',
            'is_active',
            'es_primer_ingreso',
        ]


class ActualizarMiPasswordSerializer(serializers.Serializer):
    password_nueva = serializers.CharField(write_only=True)

    def validate_password_nueva(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return validate_new_password_rules(user, value)


class UsuarioListadoSerializer(serializers.ModelSerializer):
    numero_documento = serializers.CharField(source='documento', read_only=True)
    programa = serializers.CharField(source='programa.nombre', read_only=True)
    programa_id = serializers.IntegerField(source='programa.id', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id',
            'rol',
            'nombres',
            'apellidos',
            'correo_institucional',
            'tipo_documento',
            'numero_documento',
            'genero',
            'semestre_actual',
            'is_staff',
            'is_active',
            'programa',
            'programa_id',
        ]


class UsuarioCreateSerializer(serializers.ModelSerializer):
    numero_documento = serializers.CharField(source='documento')
    programa_id = serializers.PrimaryKeyRelatedField(
        source='programa',
        queryset=ProgramaAcademico.objects.all(),
    )
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    is_staff = serializers.BooleanField(required=False)

    class Meta:
        model = Usuario
        fields = [
            'nombres',
            'apellidos',
            'correo_institucional',
            'tipo_documento',
            'numero_documento',
            'rol',
            'is_staff',
            'programa_id',
            'genero',
            'semestre_actual',
            'password',
        ]

    def validate(self, attrs):
        nombres = ' '.join(str(attrs.get('nombres', '')).strip().split())
        apellidos = ' '.join(str(attrs.get('apellidos', '')).strip().split())

        if not SOLO_LETRAS_REGEX.fullmatch(nombres):
            raise serializers.ValidationError(
                {'nombres': ['Los nombres solo deben contener letras.']},
            )

        if not SOLO_LETRAS_REGEX.fullmatch(apellidos):
            raise serializers.ValidationError(
                {'apellidos': ['Los apellidos solo deben contener letras.']},
            )

        attrs['nombres'] = nombres.upper()
        attrs['apellidos'] = apellidos.upper()
        attrs['tipo_documento'] = str(attrs.get('tipo_documento', '')).strip().upper()
        attrs['correo_institucional'] = str(attrs.get('correo_institucional', '')).strip().lower()
        attrs['rol'] = str(attrs.get('rol', Usuario.ROL_ESTUDIANTE)).strip().upper()

        if not attrs['correo_institucional'].endswith('@usco.edu.co'):
            raise serializers.ValidationError(
                {'correo_institucional': ['El correo institucional debe terminar en @usco.edu.co.']},
            )

        documento = str(attrs.get('documento', '')).strip()
        if not documento.isdigit():
            raise serializers.ValidationError(
                {'numero_documento': ['El numero de documento solo debe contener numeros.']},
            )
        if len(documento) > 10:
            raise serializers.ValidationError(
                {'numero_documento': ['El numero de documento debe tener maximo 10 digitos.']},
            )
        attrs['documento'] = documento

        if Usuario.objects.filter(correo_institucional__iexact=attrs['correo_institucional']).exists():
            raise serializers.ValidationError(
                {'correo_institucional': ['Ya existe un usuario con este correo institucional.']},
            )

        if Usuario.objects.filter(documento__iexact=documento).exists():
            raise serializers.ValidationError(
                {'numero_documento': ['Ya existe un usuario con este numero de documento.']},
            )

        genero = attrs.get('genero')
        if genero in (None, ''):
            attrs['genero'] = None
        else:
            genero_normalizado = str(genero).strip().upper()
            if genero_normalizado not in {'M', 'F', 'O'}:
                raise serializers.ValidationError({'genero': ['Genero invalido. Usa M, F u O.']})
            attrs['genero'] = genero_normalizado

        semestre = attrs.get('semestre_actual')
        if semestre in (None, ''):
            attrs['semestre_actual'] = None
        else:
            try:
                semestre_num = int(semestre)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError(
                    {'semestre_actual': ['Semestre invalido. Debe ser numerico.']},
                ) from exc
            if semestre_num <= 0:
                raise serializers.ValidationError(
                    {'semestre_actual': ['Semestre invalido. Debe ser mayor a 0.']},
                )
            attrs['semestre_actual'] = semestre_num

        if attrs['rol'] == Usuario.ROL_ESTUDIANTE:
            if attrs['semestre_actual'] is None:
                raise serializers.ValidationError(
                    {
                        'semestre_actual': [
                            'El semestre actual es obligatorio para usuarios con rol ESTUDIANTE.',
                        ],
                    },
                )
            if attrs['semestre_actual'] < 1 or attrs['semestre_actual'] > 10:
                raise serializers.ValidationError(
                    {'semestre_actual': ['El semestre actual debe estar entre 1 y 10.']},
                )
        else:
            attrs['semestre_actual'] = None

        if attrs['rol'] not in {Usuario.ROL_ADMIN, Usuario.ROL_PROFESOR, Usuario.ROL_ESTUDIANTE}:
            raise serializers.ValidationError(
                {
                    'rol': [
                        (
                            'Rol invalido. Usa '
                            f'{Usuario.ROL_ADMIN}, {Usuario.ROL_PROFESOR} o {Usuario.ROL_ESTUDIANTE}.'
                        ),
                    ],
                },
            )

        is_staff = attrs.get('is_staff')
        if attrs['rol'] == Usuario.ROL_ADMIN:
            attrs['is_staff'] = True
        elif attrs['rol'] == Usuario.ROL_ESTUDIANTE:
            attrs['is_staff'] = False
        else:
            attrs['is_staff'] = bool(is_staff)

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password or not str(password).strip():
            password = validated_data.get('documento')

        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ProgramaAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramaAcademico
        fields = ['id', 'nombre']


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ['id', 'tipo', 'mensaje', 'leida', 'created_at']
