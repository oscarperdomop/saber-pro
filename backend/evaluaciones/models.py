import os
import uuid

from django.conf import settings
from django.db import models
from users.models import ProgramaAcademico



def generar_ruta_imagen_segura(instance, filename):
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    filename_str = f'{uuid.uuid4().hex}.{ext}' if ext else uuid.uuid4().hex
    
    # Resolviendo el subdirectorio dinamico para mantener organizacion semantica
    if hasattr(instance, 'es_correcta'): # Es una OpcionRespuesta
        return os.path.join('opciones_secure/', filename_str)
    
    # Es una Pregunta
    if getattr(instance, 'contexto_imagen', None) and instance.contexto_imagen.name == filename:
        return os.path.join('preguntas/contextos_secure/', filename_str)
        
    return os.path.join('preguntas/graficas_secure/', filename_str)

class ModuloPrueba(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


class Categoria(models.Model):
    modulo = models.ForeignKey(ModuloPrueba, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Competencia(models.Model):
    modulo = models.ForeignKey(ModuloPrueba, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre


class Pregunta(models.Model):
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='preguntas_creadas')
    NIVEL_DIFICULTAD_CHOICES = [
        ('Facil', 'Fácil'),
        ('Medio', 'Medio'),
        ('Dificil', 'Difícil'),
    ]

    ESTADO_CHOICES = [
        ('Borrador', 'Borrador'),
        ('Publicada', 'Publicada'),
        ('Archivada', 'Archivada'),
    ]
    SOPORTE_MULTIMEDIA_CHOICES = [
        ('NINGUNO', 'Ninguno'),
        ('IMAGEN', 'Imagen'),
        ('LATEX', 'LaTeX'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    modulo = models.ForeignKey(ModuloPrueba, on_delete=models.CASCADE)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
    competencia = models.ForeignKey(Competencia, on_delete=models.CASCADE)
    nivel_dificultad = models.CharField(max_length=15, choices=NIVEL_DIFICULTAD_CHOICES)
    contexto_texto = models.TextField(null=True, blank=True)
    contexto_imagen = models.ImageField(upload_to=generar_ruta_imagen_segura, null=True, blank=True)
    imagen_grafica = models.ImageField(upload_to=generar_ruta_imagen_segura, null=True, blank=True)
    codigo_latex = models.TextField(null=True, blank=True)
    soporte_multimedia = models.CharField(
        max_length=10,
        choices=SOPORTE_MULTIMEDIA_CHOICES,
        default='NINGUNO',
    )
    enunciado = models.TextField()
    justificacion = models.TextField(null=True, blank=True)
    limite_palabras = models.IntegerField(default=3000, null=True, blank=True)
    rubrica_evaluacion = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=15, default='Borrador', choices=ESTADO_CHOICES)
    lote_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='ID de la carga masiva que origino esta pregunta',
    )
    version_original = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Pregunta {self.id}'


class OpcionRespuesta(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pregunta = models.ForeignKey(Pregunta, related_name='opciones', on_delete=models.CASCADE)
    texto = models.TextField(null=True, blank=True)
    imagen = models.ImageField(upload_to=generar_ruta_imagen_segura, null=True, blank=True)
    es_correcta = models.BooleanField(default=False)

    def __str__(self):
        return f'Opcion {self.id}'


class PlantillaExamen(models.Model):
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name='examenes_creados')
    ESTADO_CHOICES = [
        ('Borrador', 'Borrador'),
        ('Activo', 'Activo'),
        ('Inactivo', 'Inactivo'),
        ('Archivado', 'Archivado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    tiempo_minutos = models.IntegerField(null=True, blank=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField()
    mostrar_resultados_inmediatos = models.BooleanField(default=False)
    es_simulacro_oficial = models.BooleanField(default=False)
    estado = models.CharField(max_length=15, default='Borrador', choices=ESTADO_CHOICES)
    programas_destino = models.ManyToManyField(ProgramaAcademico, related_name='examenes_asignados')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.titulo


class ReglaExamen(models.Model):
    NIVEL_DIFICULTAD_CHOICES = [
        ('Facil', 'Fácil'),
        ('Medio', 'Medio'),
        ('Dificil', 'Difícil'),
        ('Balanceada', 'Balanceada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    examen = models.ForeignKey(PlantillaExamen, related_name='reglas', on_delete=models.CASCADE)
    modulo = models.ForeignKey(ModuloPrueba, on_delete=models.CASCADE)
    categoria = models.ForeignKey(Categoria, null=True, blank=True, on_delete=models.SET_NULL)
    cantidad_preguntas = models.IntegerField()
    nivel_dificultad = models.CharField(
        max_length=15,
        default='Balanceada',
        choices=NIVEL_DIFICULTAD_CHOICES,
    )

    def __str__(self):
        return f'Regla {self.id}'


class IntentoExamen(models.Model):
    ESTADO_CHOICES = [
        ('En Progreso', 'En Progreso'),
        ('Pendiente Calificacion', 'Pendiente Calificacion'),
        ('Finalizado', 'Finalizado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estudiante = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='intentos',
    )
    plantilla_examen = models.ForeignKey('PlantillaExamen', on_delete=models.CASCADE)
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_finalizacion = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=30, default='En Progreso', choices=ESTADO_CHOICES)
    plan_estudio_ia = models.TextField(
        null=True,
        blank=True,
        help_text='Plan de estudio generado por IA en formato Markdown',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['estudiante', 'plantilla_examen'], name='unico_intento_por_examen')
        ]

    def __str__(self):
        return f'Intento {self.id}'


class IntentoModulo(models.Model):
    ESTADO_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('En Progreso', 'En Progreso'),
        ('Completado', 'Completado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intento = models.ForeignKey(IntentoExamen, on_delete=models.CASCADE, related_name='modulos')
    modulo = models.ForeignKey('ModuloPrueba', on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, default='Pendiente', choices=ESTADO_CHOICES)

    def __str__(self):
        return f'IntentoModulo {self.id}'


class RespuestaEstudiante(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    intento = models.ForeignKey(IntentoExamen, on_delete=models.CASCADE, related_name='respuestas')
    pregunta = models.ForeignKey('Pregunta', on_delete=models.CASCADE)
    opcion_seleccionada = models.ForeignKey(
        'OpcionRespuesta',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    texto_respuesta_abierta = models.TextField(null=True, blank=True)
    marcada_para_revision = models.BooleanField(default=False)
    puntaje_calificado = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    evaluador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='ensayos_asignados',
    )
    fecha_respuesta = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Respuesta {self.id}'
