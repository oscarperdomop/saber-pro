from django.contrib import admin
from .models import Notificacion, ProgramaAcademico, Usuario

@admin.register(ProgramaAcademico)
class ProgramaAcademicoAdmin(admin.ModelAdmin):
    list_display = ('codigo_snies', 'nombre', 'facultad', 'sede')
    search_fields = ('nombre', 'codigo_snies')

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('documento', 'nombres', 'apellidos', 'correo_institucional', 'is_staff', 'is_active')
    search_fields = ('documento', 'correo_institucional', 'nombres', 'apellidos')
    list_filter = ('is_staff', 'es_primer_ingreso', 'programa')
    ordering = ('-is_staff', 'apellidos')


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo', 'mensaje', 'leida', 'created_at')
    search_fields = ('usuario__correo_institucional', 'mensaje')
    list_filter = ('tipo', 'leida', 'created_at')
