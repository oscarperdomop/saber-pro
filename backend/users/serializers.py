from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import ProgramaAcademico, Usuario


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
            'programa',
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
            'is_staff',
            'is_active',
            'programa',
        ]


class ProgramaAcademicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramaAcademico
        fields = ['id', 'nombre']
