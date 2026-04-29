from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from users.models import Notificacion, Usuario

from .models import PlantillaExamen


def _resolver_estudiantes_objetivo(simulacro):
    estudiantes = Usuario.objects.filter(rol=Usuario.ROL_ESTUDIANTE, is_active=True)
    programas_ids = list(simulacro.programas_destino.values_list('id', flat=True))
    if programas_ids:
        estudiantes = estudiantes.filter(programa_id__in=programas_ids)
    return estudiantes.distinct()


def _emitir_notificacion_simulacro(simulacro_id):
    try:
        simulacro = PlantillaExamen.objects.get(id=simulacro_id)
    except PlantillaExamen.DoesNotExist:
        return

    estudiantes = list(_resolver_estudiantes_objetivo(simulacro))
    if not estudiantes:
        return

    mensaje = 'Tienes un nuevo simulacro asignado'
    tipo = Notificacion.TIPO_NUEVA

    Notificacion.objects.bulk_create(
        [Notificacion(usuario=estudiante, tipo=tipo, mensaje=mensaje) for estudiante in estudiantes],
        ignore_conflicts=False,
    )

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    for estudiante in estudiantes:
        async_to_sync(channel_layer.group_send)(
            f'notifications_user_{estudiante.id}',
            {
                'type': 'notification_message',
                'event_type': tipo,
                'mensaje': mensaje,
                'payload': {'simulacro_id': str(simulacro.id), 'simulacro_titulo': simulacro.titulo},
            },
        )


@receiver(post_save, sender=PlantillaExamen)
def notificar_nuevo_simulacro(sender, instance, created, **kwargs):
    if not created:
        return

    transaction.on_commit(lambda: _emitir_notificacion_simulacro(instance.id))
