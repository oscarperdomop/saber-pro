from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        data['id'] = str(self.user.id)
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

        errores = []

        if len(value) < 8:
            errores.append('La nueva contraseña debe tener al menos 8 caracteres.')

        if not any(char.isupper() for char in value):
            errores.append('La nueva contraseña debe contener al menos una letra mayúscula.')

        if not any(char.isdigit() for char in value):
            errores.append('La nueva contraseña debe contener al menos un número.')

        documento_usuario = getattr(user, 'documento', None)
        if documento_usuario and value == str(documento_usuario):
            errores.append('La nueva contraseña no puede ser igual al número de documento.')

        if errores:
            raise serializers.ValidationError(errores)

        validate_password(value, user)
        return value
