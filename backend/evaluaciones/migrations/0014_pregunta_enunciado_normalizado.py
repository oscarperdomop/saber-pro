import re
import unicodedata

from django.db import migrations, models
from django.db.models import Q


def _normalizar_texto(value):
    text = str(value or '')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(char for char in text if not unicodedata.combining(char))
    text = text.strip().lower()
    text = re.sub(r'\s+', ' ', text)
    return text


def poblar_enunciado_normalizado(apps, schema_editor):
    Pregunta = apps.get_model('evaluaciones', 'Pregunta')

    seen_activos = set()
    for pregunta in Pregunta.objects.all().order_by('created_at', 'id'):
        base = _normalizar_texto(getattr(pregunta, 'enunciado', ''))
        if not base:
            base = f'pregunta-{pregunta.id}'

        normalizado = base
        if getattr(pregunta, 'estado', '') != 'Archivada':
            if base in seen_activos:
                normalizado = f'{base}__dup__{pregunta.id}'
            seen_activos.add(normalizado)

        pregunta.enunciado_normalizado = normalizado
        pregunta.save(update_fields=['enunciado_normalizado'])


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0013_alter_opcionrespuesta_imagen_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='pregunta',
            name='enunciado_normalizado',
            field=models.TextField(blank=True, editable=False, null=True),
        ),
        migrations.RunPython(poblar_enunciado_normalizado, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='pregunta',
            constraint=models.UniqueConstraint(
                condition=~Q(estado='Archivada'),
                fields=('enunciado_normalizado',),
                name='uq_pregunta_enunciado_normalizado_activo',
            ),
        ),
    ]
