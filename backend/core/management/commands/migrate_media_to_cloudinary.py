from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError

from evaluaciones.models import OpcionRespuesta, Pregunta


class Command(BaseCommand):
    help = (
        'Migra archivos media locales de evaluaciones a Cloudinary usando el '
        'storage DEFAULT configurado en settings.'
    )

    TARGETS: tuple[tuple[type, str], ...] = (
        (Pregunta, 'imagen_grafica'),
        (Pregunta, 'contexto_imagen'),
        (OpcionRespuesta, 'imagen'),
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo simula la migracion sin escribir cambios en base de datos.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limita la cantidad de archivos a migrar (0 = sin limite).',
        )

    @staticmethod
    def _is_remote_or_cloudinary(field_file) -> bool:
        name = str(getattr(field_file, 'name', '') or '').strip()
        if not name:
            return True

        lowered = name.lower()
        if lowered.startswith('http://') or lowered.startswith('https://'):
            return True

        try:
            file_url = str(field_file.url or '').lower()
            if 'res.cloudinary.com' in file_url:
                return True
        except Exception:
            pass

        return False

    @staticmethod
    def _resolve_local_path(media_root: str, field_name: str) -> Path:
        normalized = str(field_name or '').strip()
        normalized = normalized.lstrip('/')
        if normalized.lower().startswith('media/'):
            normalized = normalized[6:]

        # Los nombres de ImageField se guardan con "/" incluso en Windows.
        parts = [p for p in normalized.split('/') if p]
        return Path(media_root, *parts)

    def _iter_target_rows(self) -> Iterable[tuple[type, str, object]]:
        for model_cls, field_name in self.TARGETS:
            queryset = model_cls.objects.exclude(**{f'{field_name}__isnull': True}).exclude(
                **{field_name: ''}
            )
            for obj in queryset.iterator():
                yield model_cls, field_name, obj

    def handle(self, *args, **options):
        if not getattr(settings, 'USE_CLOUDINARY_STORAGE', False):
            raise CommandError(
                'Cloudinary no esta activo. Configura CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET '
                'y verifica que USE_CLOUDINARY_STORAGE sea True.'
            )

        media_root = str(getattr(settings, 'MEDIA_ROOT', '') or '').strip()
        if not media_root:
            raise CommandError('MEDIA_ROOT no esta configurado.')

        dry_run = bool(options.get('dry_run'))
        limit = int(options.get('limit') or 0)

        processed = 0
        migrated = 0
        skipped_remote = 0
        skipped_missing = 0
        failures = 0

        for model_cls, field_name, obj in self._iter_target_rows():
            if limit and migrated >= limit:
                break

            field_file = getattr(obj, field_name, None)
            if not field_file:
                continue

            current_name = str(getattr(field_file, 'name', '') or '').strip()
            if not current_name:
                continue

            processed += 1

            if self._is_remote_or_cloudinary(field_file):
                skipped_remote += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'[SKIP remote] {model_cls.__name__} {obj.pk} {field_name}={current_name}'
                    )
                )
                continue

            local_path = self._resolve_local_path(media_root, current_name)
            if not local_path.exists() or not local_path.is_file():
                skipped_missing += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'[SKIP missing] {model_cls.__name__} {obj.pk} {field_name} path={local_path}'
                    )
                )
                continue

            if dry_run:
                self.stdout.write(
                    self.style.HTTP_INFO(
                        f'[DRY-RUN] {model_cls.__name__} {obj.pk} {field_name}: {local_path}'
                    )
                )
                migrated += 1
                continue

            try:
                with open(local_path, 'rb') as fh:
                    django_file = File(fh)
                    # Conserva nombre base; upload_to y storage de Cloudinary definen la ruta final.
                    field_file.save(os.path.basename(current_name), django_file, save=False)

                obj.save(update_fields=[field_name])
                migrated += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'[OK] {model_cls.__name__} {obj.pk} {field_name} migrado a Cloudinary'
                    )
                )
            except Exception as exc:
                failures += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'[ERROR] {model_cls.__name__} {obj.pk} {field_name}: {exc}'
                    )
                )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('====== RESUMEN MIGRACION MEDIA -> CLOUDINARY ======'))
        self.stdout.write(f'Procesados: {processed}')
        self.stdout.write(f'Migrados: {migrated}')
        self.stdout.write(f'Saltados (ya remotos): {skipped_remote}')
        self.stdout.write(f'Saltados (faltan archivos): {skipped_missing}')
        self.stdout.write(f'Errores: {failures}')
        self.stdout.write(self.style.SUCCESS('==================================================='))
