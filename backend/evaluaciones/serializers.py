from rest_framework import serializers
from rest_framework.serializers import SerializerMethodField

from .models import (
    Categoria,
    Competencia,
    IntentoExamen,
    ModuloPrueba,
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


class ModuloSerializer(serializers.ModelSerializer):
    descripcion = serializers.SerializerMethodField()

    class Meta:
        model = ModuloPrueba
        fields = ['id', 'nombre', 'descripcion']

    def get_descripcion(self, _obj):
        return ''


class CategoriaAdminSerializer(serializers.ModelSerializer):
    modulo_id = serializers.PrimaryKeyRelatedField(source='modulo', queryset=ModuloPrueba.objects.all())

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'modulo_id']


class CompetenciaAdminSerializer(serializers.ModelSerializer):
    modulo_id = serializers.PrimaryKeyRelatedField(source='modulo', queryset=ModuloPrueba.objects.all())

    class Meta:
        model = Competencia
        fields = ['id', 'nombre', 'modulo_id']


class PreguntaAdminSerializer(serializers.ModelSerializer):
    opciones = OpcionRespuestaSerializer(many=True, required=False)
    modulo = serializers.PrimaryKeyRelatedField(read_only=True)
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    modulo_id = serializers.PrimaryKeyRelatedField(
        source='modulo',
        queryset=ModuloPrueba.objects.all(),
        required=False,
        write_only=True,
    )
    categoria = serializers.PrimaryKeyRelatedField(
        queryset=Categoria.objects.all(),
        required=True,
        allow_null=False,
    )
    competencia = serializers.PrimaryKeyRelatedField(
        queryset=Competencia.objects.all(),
        required=True,
        allow_null=False,
    )
    nivel_dificultad = serializers.CharField(required=False)
    tipo_pregunta = serializers.CharField(required=False, write_only=True)
    dificultad = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Pregunta
        fields = [
            'id',
            'modulo',
            'modulo_id',
            'modulo_nombre',
            'categoria',
            'competencia',
            'nivel_dificultad',
            'dificultad',
            'tipo_pregunta',
            'contexto_texto',
            'contexto_imagen',
            'enunciado',
            'justificacion',
            'limite_palabras',
            'rubrica_evaluacion',
            'estado',
            'version_original',
            'created_at',
            'updated_at',
            'opciones',
        ]
        read_only_fields = ['id', 'modulo_nombre', 'created_at', 'updated_at']

    @staticmethod
    def _map_dificultad(dificultad):
        return {
            'Facil': 'Facil',
            'Media': 'Medio',
            'Alta': 'Dificil',
            'Medio': 'Medio',
            'Dificil': 'Dificil',
        }.get(dificultad, 'Medio')

    def validate(self, attrs):
        modulo = attrs.get('modulo') or getattr(self.instance, 'modulo', None)
        categoria = attrs.get('categoria') if 'categoria' in attrs else getattr(self.instance, 'categoria', None)
        competencia = (
            attrs.get('competencia') if 'competencia' in attrs else getattr(self.instance, 'competencia', None)
        )

        errors = {}

        if not modulo:
            errors['modulo_id'] = ['El modulo es obligatorio.']
        if not categoria:
            errors['categoria'] = ['La categoria es obligatoria.']
        if not competencia:
            errors['competencia'] = ['La competencia es obligatoria.']

        if errors:
            raise serializers.ValidationError(errors)

        if categoria.modulo_id != modulo.id:
            errors['categoria'] = ['La categoria seleccionada no pertenece al modulo elegido.']

        if competencia.modulo_id != modulo.id:
            errors['competencia'] = ['La competencia seleccionada no pertenece al modulo elegido.']

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        opciones_data = validated_data.pop('opciones', [])
        tipo_pregunta = validated_data.pop('tipo_pregunta', '')
        dificultad = validated_data.pop('dificultad', '')
        skip_options_validation = bool(self.context.get('skip_options_validation'))

        if not validated_data.get('nivel_dificultad'):
            validated_data['nivel_dificultad'] = self._map_dificultad(dificultad) if dificultad else 'Medio'

        if tipo_pregunta == 'Ensayo':
            if validated_data.get('limite_palabras') in [None, '']:
                validated_data['limite_palabras'] = 300
            opciones_data = []
        else:
            validated_data['limite_palabras'] = None
            if not skip_options_validation:
                if len(opciones_data) < 2:
                    raise serializers.ValidationError(
                        {'opciones': ['Debes agregar al menos dos opciones para una pregunta de opcion multiple.']}
                    )
                if not any(opcion.get('es_correcta') for opcion in opciones_data):
                    raise serializers.ValidationError(
                        {'opciones': ['Debes marcar al menos una opcion correcta.']}
                    )

        pregunta = Pregunta.objects.create(**validated_data)

        for opcion in opciones_data:
            OpcionRespuesta.objects.create(pregunta=pregunta, **opcion)

        return pregunta

    def update(self, instance, validated_data):
        opciones_data = validated_data.pop('opciones', [])
        tipo_pregunta = validated_data.pop('tipo_pregunta', '')
        dificultad = validated_data.pop('dificultad', '')
        skip_options_validation = bool(self.context.get('skip_options_validation'))

        if dificultad:
            validated_data['nivel_dificultad'] = self._map_dificultad(dificultad)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if tipo_pregunta == 'Ensayo':
            if instance.limite_palabras in [None, '']:
                instance.limite_palabras = 300
            opciones_data = []
        elif tipo_pregunta == 'Opcion Multiple':
            instance.limite_palabras = None
            if not skip_options_validation:
                if len(opciones_data) < 2:
                    raise serializers.ValidationError(
                        {'opciones': ['Debes agregar al menos dos opciones para una pregunta de opcion multiple.']}
                    )
                if not any(opcion.get('es_correcta') for opcion in opciones_data):
                    raise serializers.ValidationError(
                        {'opciones': ['Debes marcar al menos una opcion correcta.']}
                    )

        instance.save()

        if tipo_pregunta == 'Ensayo':
            instance.opciones.all().delete()
        elif tipo_pregunta and (opciones_data or not skip_options_validation):
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
    tiene_intentos = serializers.SerializerMethodField()

    class Meta:
        model = PlantillaExamen
        fields = '__all__'

    @staticmethod
    def get_tiene_intentos(obj):
        # Compatibilidad con diferentes related_name en IntentoExamen
        if hasattr(obj, 'intentos'):
            return obj.intentos.exists()
        return IntentoExamen.objects.filter(plantilla_examen=obj).exists()

    def create(self, validated_data):
        reglas_data = validated_data.pop('reglas', [])
        programas_data = validated_data.pop('programas_destino', [])

        plantilla = PlantillaExamen.objects.create(**validated_data)
        plantilla.programas_destino.set(programas_data)

        for regla in reglas_data:
            ReglaExamen.objects.create(examen=plantilla, **regla)

        return plantilla

    def update(self, instance, validated_data):
        reglas_data = validated_data.pop('reglas', None)
        programas_data = validated_data.pop('programas_destino', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if programas_data is not None:
            instance.programas_destino.set(programas_data)

        if reglas_data is not None:
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
    modulo_id = serializers.IntegerField(source='modulo.id', read_only=True)
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)

    class Meta:
        model = Pregunta
        fields = [
            'id',
            'modulo_id',
            'modulo_nombre',
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
