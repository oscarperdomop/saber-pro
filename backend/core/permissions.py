from rest_framework.permissions import BasePermission
from users.models import Usuario

class IsOwnerOrSupremo(BasePermission):
    """
    Permite acceso total a Admins. Para Profesores, permite acceso solo si el objeto les pertenece.
    """
    def has_object_permission(self, request, view, obj):
        # Si no esta autenticado, se rechaza de base
        if not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
            
        # El rol Admin tiene bypass global
        if getattr(request.user, 'rol', None) == Usuario.ROL_ADMIN:
            return True
            
        # Verificamos pertenecia del objeto, asumiendo que el modelo maneja "creado_por"
        return getattr(obj, 'creado_por_id', None) == request.user.id
