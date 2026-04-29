from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from evaluaciones.models import (
    Categoria,
    Competencia,
    IntentoExamen,
    ModuloPrueba,
    OpcionRespuesta,
    PlantillaExamen,
    Pregunta,
    RespuestaEstudiante,
)


class Command(BaseCommand):
    help = (
        'Limpia la DB para pruebas de carga: preserva catalogos base, usuarios staff/superuser '
        'y usuarios de prueba test1..test100@usco.edu.co.'
    )

    TEST_USERS_REGEX = r'^test([1-9]|[1-9][0-9]|100)@usco\\.edu\\.co$'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Ejecuta el borrado sin confirmacion interactiva.',
        )

    def handle(self, *args, **options):
        if not getattr(settings, 'DEBUG', False):
            raise CommandError(
                '¡ALERTA! Intento de borrado de base de datos en PRODUCCIÓN interceptado.'
            )

        if not options.get('force'):
            confirmation = input(
                'ATENCION: Este comando eliminara datos de examen y usuarios no protegidos. '
                'Escribe "SI" para continuar: '
            ).strip()
            if confirmation != 'SI':
                self.stdout.write(self.style.WARNING('Operacion cancelada.'))
                return

        User = get_user_model()

        usuarios_protegidos_qs = User.objects.filter(
            Q(is_staff=True)
            | Q(is_superuser=True)
            | Q(correo_institucional__iregex=self.TEST_USERS_REGEX)
        ).distinct()

        usuarios_a_borrar_qs = User.objects.exclude(
            id__in=usuarios_protegidos_qs.values_list('id', flat=True)
        )

        catalogo_modulos = ModuloPrueba.objects.count()
        catalogo_categorias = Categoria.objects.count()
        catalogo_competencias = Competencia.objects.count()

        admins_protegidos = User.objects.filter(
            Q(is_staff=True) | Q(is_superuser=True)
        ).count()
        test_protegidos = User.objects.filter(
            correo_institucional__iregex=self.TEST_USERS_REGEX
        ).count()

        plantillas_a_borrar = PlantillaExamen.objects.count()
        preguntas_a_borrar = Pregunta.objects.count()
        opciones_a_borrar = OpcionRespuesta.objects.count()
        intentos_a_borrar = IntentoExamen.objects.count()
        respuestas_a_borrar = RespuestaEstudiante.objects.count()
        usuarios_a_borrar = usuarios_a_borrar_qs.count()

        with transaction.atomic():
            # Limpieza explicita de tablas operativas de examenes.
            RespuestaEstudiante.objects.all().delete()
            IntentoExamen.objects.all().delete()
            OpcionRespuesta.objects.all().delete()
            Pregunta.objects.all().delete()
            PlantillaExamen.objects.all().delete()
            usuarios_a_borrar_qs.delete()

        test_supervivientes = User.objects.filter(
            correo_institucional__iregex=self.TEST_USERS_REGEX
        ).count()

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('====== REPORTE DE LIMPIEZA CONTROLADA ======'))
        self.stdout.write(self.style.HTTP_INFO('CATALOGOS PRESERVADOS (NO BORRADOS):'))
        self.stdout.write(f'  - Modulos: {catalogo_modulos}')
        self.stdout.write(f'  - Categorias: {catalogo_categorias}')
        self.stdout.write(f'  - Competencias: {catalogo_competencias}')

        self.stdout.write(self.style.HTTP_INFO('USUARIOS PROTEGIDOS:'))
        self.stdout.write(f'  - Admin/Staff protegidos: {admins_protegidos}')
        self.stdout.write(f'  - Test protegidos (test1..test100): {test_protegidos}')

        self.stdout.write(self.style.WARNING('REGISTROS ELIMINADOS:'))
        self.stdout.write(f'  - PlantillaExamen: {plantillas_a_borrar}')
        self.stdout.write(f'  - Pregunta: {preguntas_a_borrar}')
        self.stdout.write(f'  - OpcionRespuesta: {opciones_a_borrar}')
        self.stdout.write(f'  - IntentoExamen: {intentos_a_borrar}')
        self.stdout.write(f'  - RespuestaEstudiante: {respuestas_a_borrar}')
        self.stdout.write(f'  - Usuarios no protegidos: {usuarios_a_borrar}')

        self.stdout.write(self.style.SUCCESS('POST-LIMPIEZA:'))
        self.stdout.write(f'  - Usuarios de prueba sobrevivientes: {test_supervivientes}')
        self.stdout.write(self.style.SUCCESS('============================================'))

