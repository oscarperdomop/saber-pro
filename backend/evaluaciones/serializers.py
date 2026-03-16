from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField

from .models import (
    IntentoExamen,
    OpcionRespuesta,
    PlantillaExamen,
    Pregunta,
    ReglaExamen,
    RespuestaEstudiante,
)


class OpcionRespuestaSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        exclude = ('pregunta',)


class PreguntaAdminSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaSerializer(many=True)

    class Meta:
        model = Pregunta
        fields = '__all__'

    def create(self, validated_data):
        opciones_data = validated_data.pop('opciones', [])
        pregunta = Pregunta.objects.create(**validated_data)

        for opcion in opciones_data:
            OpcionRespuesta.objects.create(pregunta=pregunta, **opcion)

        return pregunta

    def update(self, instance, validated_data):
        opciones_data = validated_data.pop('opciones', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        instance.opciones.all().delete()
        for opcion in opciones_data:
            OpcionRespuesta.objects.create(pregunta=instance, **opcion)

        return instance


class ReglaExamenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReglaExamen
        exclude = ('examen',)


class PlantillaExamenAdminSerializer(serializers.ModelSerializer):
    reglas = ReglaExamenSerializer(many=True)

    class Meta:
        model = PlantillaExamen
        fields = '__all__'

    def create(self, validated_data):
        reglas_data = validated_data.pop('reglas', [])
        programas_data = validated_data.pop('programas_destino', [])

        plantilla = PlantillaExamen.objects.create(**validated_data)
        plantilla.programas_destino.set(programas_data)

        for regla in reglas_data:
            ReglaExamen.objects.create(examen=plantilla, **regla)

        return plantilla

    def update(self, instance, validated_data):
        reglas_data = validated_data.pop('reglas', [])
        programas_data = validated_data.pop('programas_destino', [])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        instance.programas_destino.set(programas_data)
        instance.reglas.all().delete()
        for regla in reglas_data:
            ReglaExamen.objects.create(examen=instance, **regla)

        return instance


class PlantillaExamenEstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantillaExamen
        fields = ['id', 'titulo', 'descripcion', 'tiempo_minutos', 'fecha_inicio', 'fecha_fin']


class OpcionRespuestaEstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        fields = ['id', 'texto', 'imagen']


class PreguntaEstudianteSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaEstudianteSerializer(many=True, read_only=True)

    class Meta:
        model = Pregunta
        fields = [
            'id',
            'enunciado',
            'contexto_texto',
            'contexto_imagen',
            'limite_palabras',
            'opciones',
        ]


class RespuestaEstudianteDetalleSerializer(serializers.ModelSerializer):
    pregunta = PreguntaEstudianteSerializer(read_only=True)

    class Meta:
        model = RespuestaEstudiante
        fields = [
            'id',
            'pregunta',
            'opcion_seleccionada',
            'texto_respuesta_abierta',
            'marcada_para_revision',
        ]


class RespuestaEstudianteUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RespuestaEstudiante
        fields = ['opcion_seleccionada', 'texto_respuesta_abierta', 'marcada_para_revision']


class IntentoExamenSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntentoExamen
        fields = ['id', 'plantilla_examen', 'fecha_inicio', 'fecha_finalizacion', 'estado']


class PreguntaEnsayoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = ['id', 'enunciado', 'rubrica_evaluacion']


class EnsayoPendienteSerializer(serializers.ModelSerializer):
    pregunta = PreguntaEnsayoSerializer(read_only=True)

    class Meta:
        model = RespuestaEstudiante
        fields = [
            'id',
            'pregunta',
            'texto_respuesta_abierta',
            'fecha_respuesta',
            'evaluador',
        ]


class CalificarEnsayoSerializer(serializers.Serializer):
    puntaje = serializers.DecimalField(max_digits=5, decimal_places=2, required=True)


class PreguntaRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = ['id', 'enunciado', 'justificacion']


class OpcionSeleccionadaRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OpcionRespuesta
        fields = ['id', 'texto']


class RevisionRespuestaSerializer(serializers.ModelSerializer):
    pregunta = PreguntaRevisionSerializer(read_only=True)
    opcion_seleccionada = OpcionSeleccionadaRevisionSerializer(read_only=True)
    es_acierto = SerializerMethodField()

    class Meta:
        model = RespuestaEstudiante
        fields = ['id', 'pregunta', 'opcion_seleccionada', 'es_acierto']

    def get_es_acierto(self, obj):
        if obj.opcion_seleccionada_id and obj.opcion_seleccionada:
            return bool(obj.opcion_seleccionada.es_correcta)

        if obj.pregunta and obj.pregunta.limite_palabras is not None:
            return bool(obj.puntaje_calificado is not None and obj.puntaje_calificado > 0)

        return False
