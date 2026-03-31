from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AnaliticasAdminViewSet,
    CategoriaAdminViewSet,
    CompetenciaAdminViewSet,
    EvaluacionEnsayoViewSet,
    EstudianteExamenViewSet,
    GenerarOpcionesIAView,
    IntentoExamenViewSet,
    ModuloAdminViewSet,
    PlantillaExamenAdminViewSet,
    PreguntaAdminViewSet,
    ReportesViewSet,
    RespuestaEstudianteViewSet,
)

router = DefaultRouter()
router.register(r'admin/preguntas', PreguntaAdminViewSet, basename='admin-preguntas')
router.register(r'admin/modulos', ModuloAdminViewSet, basename='admin-modulos')
router.register(r'admin/categorias', CategoriaAdminViewSet, basename='admin-categorias')
router.register(r'admin/competencias', CompetenciaAdminViewSet, basename='admin-competencias')
router.register(r'admin/plantillas', PlantillaExamenAdminViewSet, basename='admin-plantillas')
router.register(r'estudiante/examenes', EstudianteExamenViewSet, basename='estudiante-examenes')
router.register(r'estudiante/mis-intentos', IntentoExamenViewSet, basename='estudiante-intentos')
router.register(r'estudiante/respuestas', RespuestaEstudianteViewSet, basename='estudiante-respuestas')
router.register(r'profesor/ensayos', EvaluacionEnsayoViewSet, basename='profesor-ensayos')
router.register(r'admin/analiticas', AnaliticasAdminViewSet, basename='admin-analiticas')
router.register(r'admin/reportes', ReportesViewSet, basename='admin-reportes')

urlpatterns = [
    path('ia/generar-opciones/', GenerarOpcionesIAView.as_view(), name='ia-generar-opciones'),
    path('', include(router.urls)),
]
