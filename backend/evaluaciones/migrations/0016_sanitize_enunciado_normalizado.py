import re
import unicodedata
from collections import defaultdict

from django.db import migrations


def _normalizar_texto(value):
    text = str(value or '')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    text = re.sub(r'([+\-*/=<>^%])', r' \1 ', text)
    text = re.sub(r'[¿?¡!.,;:"\'`~()\[\]{}|\\]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _priority(estado):
    if estado == 'Publicada':
        return 0
    if estado == 'Borrador':
        return 1
    return 2


def sanitize_and_archive_duplicates(apps, schema_editor):
    Pregunta = apps.get_model('evaluaciones', 'Pregunta')

    preguntas = list(Pregunta.objects.all().order_by('created_at', 'id'))
    grouped_active = defaultdict(list)

    for pregunta in preguntas:
        base = _normalizar_texto(getattr(pregunta, 'enunciado', '')) or f'pregunta-{pregunta.id}'
        pregunta.enunciado_normalizado = base
        if getattr(pregunta, 'estado', '') != 'Archivada':
            grouped_active[base].append(pregunta)

    for _base, items in grouped_active.items():
        if len(items) <= 1:
            continue

        items_sorted = sorted(items, key=lambda q: (_priority(getattr(q, 'estado', '')), q.created_at, q.id))
        keep = items_sorted[0]
        for duplicate in items_sorted[1:]:
            duplicate.estado = 'Archivada'

    for pregunta in preguntas:
        pregunta.save(update_fields=['enunciado_normalizado', 'estado'])


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0015_alter_pregunta_creado_por'),
    ]

    operations = [
        migrations.RunPython(sanitize_and_archive_duplicates, migrations.RunPython.noop),
    ]
