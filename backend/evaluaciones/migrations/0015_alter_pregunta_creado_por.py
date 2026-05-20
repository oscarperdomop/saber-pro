from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0014_pregunta_enunciado_normalizado'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name='pregunta',
            name='creado_por',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name='preguntas_creadas',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
