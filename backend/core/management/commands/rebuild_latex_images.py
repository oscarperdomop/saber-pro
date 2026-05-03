from __future__ import annotations

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from evaluaciones.models import Pregunta
from evaluaciones.serializers import PreguntaAdminSerializer


class Command(BaseCommand):
    help = (
        'Recompila codigo LaTeX y regenera imagen_grafica para preguntas con '
        'soporte_multimedia=LATEX, subiendolas al storage activo (Cloudinary).'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo muestra cuantas preguntas se procesarian sin guardar cambios.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limita cantidad de preguntas a procesar (0 = sin limite).',
        )
        parser.add_argument(
            '--id',
            dest='pregunta_id',
            type=str,
            default='',
            help='Procesa una sola pregunta por UUID.',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'USE_CLOUDINARY_STORAGE', False):
            raise CommandError(
                'Cloudinary no esta activo. Configura CLOUDINARY_* en entorno antes de ejecutar.'
            )

        dry_run = bool(options.get('dry_run'))
        limit = int(options.get('limit') or 0)
        pregunta_id = str(options.get('pregunta_id') or '').strip()

        qs = Pregunta.objects.filter(soporte_multimedia='LATEX').exclude(codigo_latex__isnull=True).exclude(
            codigo_latex=''
        )
        if pregunta_id:
            qs = qs.filter(pk=pregunta_id)

        total = qs.count()
        if not total:
            self.stdout.write(self.style.WARNING('No hay preguntas LATEX para procesar.'))
            return

        processed = 0
        updated = 0
        failed = 0

        for pregunta in qs.iterator():
            if limit and processed >= limit:
                break

            processed += 1

            if dry_run:
                self.stdout.write(
                    self.style.HTTP_INFO(
                        f'[DRY-RUN] Pregunta {pregunta.pk} seria recompilada/subida.'
                    )
                )
                updated += 1
                continue

            try:
                PreguntaAdminSerializer._compile_latex_or_raise(pregunta)
                updated += 1
                self.stdout.write(
                    self.style.SUCCESS(f'[OK] Pregunta {pregunta.pk} regenerada correctamente.')
                )
            except Exception as exc:
                failed += 1
                self.stdout.write(
                    self.style.ERROR(f'[ERROR] Pregunta {pregunta.pk}: {exc}')
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('====== RESUMEN REBUILD LATEX ======'))
        self.stdout.write(f'Total candidato: {total}')
        self.stdout.write(f'Procesadas: {processed}')
        self.stdout.write(f'Actualizadas: {updated}')
        self.stdout.write(f'Errores: {failed}')
        self.stdout.write(self.style.SUCCESS('==================================='))
