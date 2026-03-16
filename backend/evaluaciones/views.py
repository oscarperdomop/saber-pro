from decimal import Decimal

from django.db import transaction
from django.db.models import Avg, Count, F, Q
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from .models import (
    IntentoExamen,
    IntentoModulo,
    PlantillaExamen,
    Pregunta,
    RespuestaEstudiante,
)
from .serializers import (
    CalificarEnsayoSerializer,
    EnsayoPendienteSerializer,
    IntentoExamenSerializer,
    PlantillaExamenAdminSerializer,
    PlantillaExamenEstudianteSerializer,
    PreguntaAdminSerializer,
    RevisionRespuestaSerializer,
    RespuestaEstudianteDetalleSerializer,
    RespuestaEstudianteUpdateSerializer,
)


class PreguntaAdminViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.all()
    serializer_class = PreguntaAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class PlantillaExamenAdminViewSet(viewsets.ModelViewSet):
    queryset = PlantillaExamen.objects.all()
    serializer_class = PlantillaExamenAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class EstudianteExamenViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlantillaExamenEstudianteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        programa_id = getattr(self.request.user, 'programa_id', None)
        if not programa_id:
            return PlantillaExamen.objects.none()

        now = timezone.now()
        return PlantillaExamen.objects.filter(
            estado='Activo',
            programas_destino=programa_id,
            fecha_inicio__lte=now,
            fecha_fin__gte=now,
        ).distinct()

    @action(detail=True, methods=['post'])
    def iniciar_intento(self, request, pk=None):
        plantilla = self.get_object()

        if IntentoExamen.objects.filter(
            estudiante=request.user,
            plantilla_examen=plantilla,
        ).exists():
            return Response({'detalle': 'Intento ya iniciado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                intento = IntentoExamen.objects.create(
                    estudiante=request.user,
                    plantilla_examen=plantilla,
                )

                modulos_creados = set()
                preguntas_agregadas = set()

                for regla in plantilla.reglas.select_related('modulo', 'categoria').all():
                    preguntas_qs = Pregunta.objects.filter(
                        modulo=regla.modulo,
                        estado='Publicada',
                    )

                    if regla.categoria_id:
                        preguntas_qs = preguntas_qs.filter(categoria=regla.categoria)

                    preguntas = list(preguntas_qs.order_by('?')[: regla.cantidad_preguntas])

                    if len(preguntas) < regla.cantidad_preguntas:
                        raise ValueError(
                            f'No hay suficientes preguntas publicadas para la regla {regla.id}.'
                        )

                    if regla.modulo_id not in modulos_creados:
                        IntentoModulo.objects.create(
                            intento=intento,
                            modulo=regla.modulo,
                            estado='Pendiente',
                        )
                        modulos_creados.add(regla.modulo_id)

                    for pregunta in preguntas:
                        if pregunta.id in preguntas_agregadas:
                            continue
                        RespuestaEstudiante.objects.create(
                            intento=intento,
                            pregunta=pregunta,
                        )
                        preguntas_agregadas.add(pregunta.id)

        except ValueError as exc:
            return Response({'detalle': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'intento_id': str(intento.id)}, status=status.HTTP_201_CREATED)


class IntentoExamenViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = IntentoExamenSerializer

    def get_queryset(self):
        return IntentoExamen.objects.filter(estudiante=self.request.user)

    @action(detail=True, methods=['get'])
    def cargar_respuestas(self, request, pk=None):
        intento = self.get_object()
        modulo_id = request.query_params.get('modulo')

        respuestas = RespuestaEstudiante.objects.filter(intento=intento).select_related('pregunta')
        if modulo_id:
            respuestas = respuestas.filter(pregunta__modulo_id=modulo_id)

        serializer = RespuestaEstudianteDetalleSerializer(respuestas, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def resumen_resultados(self, request, pk=None):
        try:
            intento = (
                IntentoExamen.objects.select_related('plantilla_examen')
                .prefetch_related('respuestas__opcion_seleccionada', 'respuestas__pregunta')
                .get(pk=pk, estudiante=request.user)
            )
        except IntentoExamen.DoesNotExist:
            return Response({'detalle': 'Intento no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        plantilla = intento.plantilla_examen
        now = timezone.now()
        if not plantilla.mostrar_resultados_inmediatos and now < plantilla.fecha_fin:
            return Response(
                {'detalle': 'Los resultados estaran disponibles cuando cierre el examen.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        respuestas = list(intento.respuestas.all())
        total_preguntas = len(respuestas)
        ensayos_pendientes = intento.respuestas.filter(
            pregunta__limite_palabras__isnull=False,
            puntaje_calificado__isnull=True,
        ).exists()

        if total_preguntas == 0:
            return Response(
                {
                    'intento_id': str(intento.id),
                    'estado_calificacion': 'Parcial' if ensayos_pendientes else 'Definitiva',
                    'puntaje_saber_pro': 0,
                    'total_preguntas': 0,
                    'aciertos_brutos': 0,
                    'detalle_respuestas': [],
                },
                status=status.HTTP_200_OK,
            )

        aciertos_multiples = 0
        puntaje_ensayos = Decimal('0')

        for respuesta in respuestas:
            if respuesta.opcion_seleccionada_id and respuesta.opcion_seleccionada.es_correcta:
                aciertos_multiples += 1

            if respuesta.pregunta.limite_palabras is not None and respuesta.puntaje_calificado is not None:
                puntaje_ensayos += respuesta.puntaje_calificado

        total_aciertos = Decimal(aciertos_multiples) + puntaje_ensayos
        puntaje_normalizado = round((float(total_aciertos) / total_preguntas) * 300)

        return Response(
            {
                'intento_id': str(intento.id),
                'estado_calificacion': 'Parcial' if ensayos_pendientes else 'Definitiva',
                'puntaje_saber_pro': puntaje_normalizado,
                'total_preguntas': total_preguntas,
                'aciertos_brutos': float(total_aciertos),
                'detalle_respuestas': RevisionRespuestaSerializer(respuestas, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class RespuestaEstudianteViewSet(mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = RespuestaEstudiante.objects.all()
    serializer_class = RespuestaEstudianteUpdateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RespuestaEstudiante.objects.filter(intento__estudiante=self.request.user)


class EvaluacionEnsayoViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EnsayoPendienteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return RespuestaEstudiante.objects.filter(
            pregunta__limite_palabras__isnull=False,
            texto_respuesta_abierta__isnull=False,
            puntaje_calificado__isnull=True,
        ).select_related('pregunta', 'evaluador')

    @action(detail=True, methods=['post'])
    def asignar_ensayo(self, request, pk=None):
        with transaction.atomic():
            try:
                ensayo = self.get_queryset().select_for_update().get(pk=pk)
            except RespuestaEstudiante.DoesNotExist:
                return Response({'detalle': 'Ensayo no encontrado'}, status=status.HTTP_404_NOT_FOUND)

            if ensayo.evaluador and ensayo.evaluador != request.user:
                return Response(
                    {'detalle': 'Este ensayo ya esta siendo evaluado por otro profesor'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            ensayo.evaluador = request.user
            ensayo.save(update_fields=['evaluador'])

        return Response(
            {'mensaje': 'Ensayo asignado exitosamente'},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'])
    def calificar(self, request, pk=None):
        serializer = CalificarEnsayoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ensayo = self.get_object()

        if ensayo.evaluador != request.user:
            return Response(
                {'detalle': 'No tienes permiso para calificar este ensayo'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ensayo.puntaje_calificado = serializer.validated_data['puntaje']
        ensayo.save(update_fields=['puntaje_calificado'])

        return Response(
            {'mensaje': 'Calificacion guardada'},
            status=status.HTTP_200_OK,
        )


class AnaliticasAdminViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def kpis_globales(self, request):
        simulacro_id = request.query_params.get('simulacro_id')

        intentos = IntentoExamen.objects.filter(estado='Finalizado')
        if simulacro_id:
            intentos = intentos.filter(plantilla_examen_id=simulacro_id)

        total_intentos = intentos.count()

        participacion_programas = (
            intentos.values('estudiante__programa__nombre')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        preguntas_criticas = (
            RespuestaEstudiante.objects.filter(intento__in=intentos)
            .values('pregunta__enunciado')
            .annotate(
                total_veces=Count('id'),
                veces_incorrecta=Count(
                    'id',
                    filter=Q(
                        opcion_seleccionada__es_correcta=False,
                        puntaje_calificado__isnull=True,
                    ),
                ),
            )
            .order_by('-veces_incorrecta')[:5]
        )

        return Response(
            {
                'total_evaluaciones_finalizadas': total_intentos,
                'participacion_por_programa': list(participacion_programas),
                'top_preguntas_criticas': list(preguntas_criticas),
            },
            status=status.HTTP_200_OK,
        )
