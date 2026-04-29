"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.urls import include, path
from evaluaciones.views import AnaliticasAdminViewSet, PreguntaAdminViewSet, ReportesViewSet
from users.views import CargaMasivaUsuariosView, UsuariosEstadoUpdateView


def root_view(_request):
    return JsonResponse(
        {
            'status': 'ok',
            'service': 'saber-pro-backend',
            'endpoints': {
                'admin': '/admin/',
                'auth': '/api/auth/',
                'evaluaciones': '/api/evaluaciones/',
            },
        }
    )


urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path(
        'api/admin/analiticas/kpis_globales/',
        AnaliticasAdminViewSet.as_view({'get': 'kpis_globales'}),
        name='admin-kpis-globales',
    ),
    path(
        'api/admin/analiticas/cobertura_programa/',
        AnaliticasAdminViewSet.as_view({'get': 'cobertura_programa'}),
        name='admin-cobertura-programa',
    ),
    path(
        'api/admin/reportes/resumen/',
        ReportesViewSet.as_view({'get': 'resumen'}),
        name='admin-reportes-resumen',
    ),
    path(
        'api/preguntas/criticas/',
        PreguntaAdminViewSet.as_view({'get': 'criticas'}),
        name='preguntas-criticas',
    ),
    path(
        'api/usuarios/<uuid:user_id>/',
        UsuariosEstadoUpdateView.as_view(),
        name='admin-usuarios-estado-update',
    ),
    path(
        'api/usuarios/subir_excel/',
        CargaMasivaUsuariosView.as_view(),
        name='admin-usuarios-subir-excel',
    ),
    path('api/evaluaciones/', include('evaluaciones.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
