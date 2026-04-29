import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import CustomUserManager


class ProgramaAcademico(models.Model):
    id = models.AutoField(primary_key=True)
    codigo_snies = models.CharField(max_length=15, unique=True)
    nombre = models.CharField(max_length=150, unique=True)
    facultad = models.CharField(max_length=100)
    sede = models.CharField(max_length=50)

    def __str__(self):
        return self.nombre


class Usuario(AbstractBaseUser, PermissionsMixin):
    ROL_ADMIN = 'ADMIN'
    ROL_PROFESOR = 'PROFESOR'
    ROL_ESTUDIANTE = 'ESTUDIANTE'

    OPCIONES_ROL = [
        (ROL_ADMIN, 'Administrador'),
        (ROL_PROFESOR, 'Profesor'),
        (ROL_ESTUDIANTE, 'Estudiante'),
    ]

    TIPO_DOCUMENTO_CHOICES = [
        ('CC', 'CC'),
        ('TI', 'TI'),
        ('CE', 'CE'),
        ('PEP', 'PEP'),
    ]

    GENERO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    documento = models.CharField(max_length=20, unique=True)
    tipo_documento = models.CharField(max_length=5, choices=TIPO_DOCUMENTO_CHOICES)
    codigo_estudiante = models.CharField(max_length=15, unique=True, null=True, blank=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    correo_institucional = models.EmailField(unique=True)
    genero = models.CharField(max_length=2, choices=GENERO_CHOICES, null=True, blank=True)
    semestre_actual = models.IntegerField(
        null=True,
        blank=True,
        help_text='Semestre que cursa actualmente (ej. 1 al 10)',
    )
    programa = models.ForeignKey(
        ProgramaAcademico,
        on_delete=models.PROTECT,
        null=True,
        related_name='estudiantes',
    )
    es_primer_ingreso = models.BooleanField(default=True)
    rol = models.CharField(max_length=20, choices=OPCIONES_ROL, default=ROL_ESTUDIANTE)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'correo_institucional'
    REQUIRED_FIELDS = ['documento', 'nombres', 'apellidos']

    def save(self, *args, **kwargs):
        if self.rol == self.ROL_ADMIN:
            self.is_staff = True
            self.is_superuser = True
        elif self.rol == self.ROL_ESTUDIANTE:
            self.is_staff = False
            self.is_superuser = False
        elif self.rol == self.ROL_PROFESOR:
            self.is_superuser = False

        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            normalized_fields = set(update_fields)

            if 'rol' in normalized_fields:
                normalized_fields.update({'is_staff', 'is_superuser'})
            if 'is_staff' in normalized_fields:
                normalized_fields.add('is_superuser')

            kwargs['update_fields'] = list(normalized_fields)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.correo_institucional


class Notificacion(models.Model):
    TIPO_NUEVA = 'NOTIFICACION_NUEVA'
    TIPO_CHOICES = [
        (TIPO_NUEVA, 'Notificacion nueva'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=40, choices=TIPO_CHOICES, default=TIPO_NUEVA)
    mensaje = models.CharField(max_length=255)
    leida = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.usuario.correo_institucional}: {self.mensaje}'
