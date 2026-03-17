from django.db import migrations, models
import django.db.models.deletion


def copiar_modulo_desde_categoria(apps, schema_editor):
    Competencia = apps.get_model('evaluaciones', 'Competencia')

    for competencia in Competencia.objects.select_related('categoria__modulo').all():
        if competencia.categoria_id:
            competencia.modulo_id = competencia.categoria.modulo_id
            competencia.save(update_fields=['modulo'])


class Migration(migrations.Migration):
    dependencies = [
        ('evaluaciones', '0004_respuestaestudiante_evaluador'),
    ]

    operations = [
        migrations.AddField(
            model_name='competencia',
            name='modulo',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='evaluaciones.moduloprueba',
            ),
        ),
        migrations.RunPython(copiar_modulo_desde_categoria, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='competencia',
            name='modulo',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='evaluaciones.moduloprueba',
            ),
        ),
        migrations.RemoveField(
            model_name='competencia',
            name='categoria',
        ),
    ]
