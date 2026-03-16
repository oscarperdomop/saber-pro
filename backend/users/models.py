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
    TIPO_DOCUMENTO_CHOICES = [
        ('CC', 'CC'),
        ('TI', 'TI'),
        ('CE', 'CE'),
        ('PEP', 'PEP'),
    ]

    GENERO_CHOICES = [
        ('M', 'M'),
        ('F', 'F'),
        ('O', 'O'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    documento = models.CharField(max_length=20, unique=True)
    tipo_documento = models.CharField(max_length=5, choices=TIPO_DOCUMENTO_CHOICES)
    codigo_estudiante = models.CharField(max_length=15, unique=True, null=True, blank=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    correo_institucional = models.EmailField(unique=True)
    genero = models.CharField(max_length=1, choices=GENERO_CHOICES, null=True, blank=True)
    programa = models.ForeignKey(
        ProgramaAcademico,
        on_delete=models.PROTECT,
        null=True,
        related_name='estudiantes',
    )
    es_primer_ingreso = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'correo_institucional'
    REQUIRED_FIELDS = ['documento', 'nombres', 'apellidos']

    def __str__(self):
        return self.correo_institucional
