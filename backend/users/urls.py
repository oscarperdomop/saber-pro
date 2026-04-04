from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ActivarCuentaView,
    CargaMasivaUsuariosView,
    CustomTokenObtainPairView,
    MiPerfilView,
    NotificacionesContadorView,
    NotificacionesListView,
    ProgramasListView,
    UsuariosEstadoUpdateView,
    UsuariosListView,
)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('activar/', ActivarCuentaView.as_view(), name='activar_cuenta'),
    path('carga-masiva/', CargaMasivaUsuariosView.as_view(), name='carga_masiva'),
    path('perfil/', MiPerfilView.as_view(), name='mi_perfil'),
    path('programas/', ProgramasListView.as_view(), name='programas_list'),
    path('notificaciones/', NotificacionesListView.as_view(), name='notificaciones_list'),
    path('notificaciones/contador/', NotificacionesContadorView.as_view(), name='notificaciones_contador'),
    path('usuarios/', UsuariosListView.as_view(), name='usuarios_list'),
    path('usuarios/<uuid:user_id>/', UsuariosEstadoUpdateView.as_view(), name='usuarios_estado_update'),
]
