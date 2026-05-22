from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('evaluaciones', '0017_pregunta_codigo_latex_md5_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='respuestaestudiante',
            name='retroalimentacion_ia',
            field=models.TextField(
                blank=True,
                help_text='Explicacion pedagogica generada por IA para respuestas incorrectas.',
                null=True,
            ),
        ),
    ]
