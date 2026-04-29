from django.db.models.signals import post_save
from django.dispatch import receiver

from evaluaciones.models import IntentoExamen, PlantillaExamen

from .models import Usuario


@receiver(post_save, sender=Usuario)
def auto_asignar_simulacros_a_estudiante_nuevo(sender, instance, created, **kwargs):
    if not created:
        return

    if instance.rol != Usuario.ROL_ESTUDIANTE:
        return

    if instance.programa_id is None:
        return

    simulacros_activos = (
        PlantillaExamen.objects.filter(
            estado='Activo',
            programas_destino=instance.programa_id,
        )
        .distinct()
    )

    for simulacro in simulacros_activos:
        IntentoExamen.objects.get_or_create(
            estudiante=instance,
            plantilla_examen=simulacro,
        )
