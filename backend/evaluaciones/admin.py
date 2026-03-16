from django.contrib import admin

from .models import (
    Categoria,
    Competencia,
    IntentoExamen,
    IntentoModulo,
    ModuloPrueba,
    OpcionRespuesta,
    PlantillaExamen,
    Pregunta,
    RespuestaEstudiante,
    ReglaExamen,
)

admin.site.register(ModuloPrueba)
admin.site.register(Categoria)
admin.site.register(Competencia)
admin.site.register(Pregunta)
admin.site.register(OpcionRespuesta)
admin.site.register(PlantillaExamen)
admin.site.register(ReglaExamen)
admin.site.register(IntentoExamen)
admin.site.register(IntentoModulo)
admin.site.register(RespuestaEstudiante)
