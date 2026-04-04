from decimal import Decimal

from django.db import transaction
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
from .utils import compilar_fragmento_latex


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
            'imagen_grafica',
            'codigo_latex',
            'soporte_multimedia',
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

    @staticmethod
    def _compile_latex_or_raise(pregunta):
        fragmento = str(getattr(pregunta, 'codigo_latex', '') or '').strip()
        if not fragmento:
            raise serializers.ValidationError(
                {'codigo_latex': ['Debes escribir codigo LaTeX cuando el soporte es LATEX.']}
            )

        image_file, error = compilar_fragmento_latex(
            fragmento_codigo=fragmento,
            nombre_archivo=f'pregunta_{pregunta.id}_grafica',
        )

        if not image_file:
            raise serializers.ValidationError(
                {
                    'codigo_latex': [
                        'No fue posible compilar el codigo LaTeX. '
                        f'Detalle tecnico: {error}'
                    ]
                }
            )

        pregunta.imagen_grafica.save(image_file.name, image_file, save=False)
        pregunta.save(update_fields=['imagen_grafica', 'updated_at'])

    def validate(self, attrs):
        modulo = attrs.get('modulo') or getattr(self.instance, 'modulo', None)
        categoria = attrs.get('categoria') if 'categoria' in attrs else getattr(self.instance, 'categoria', None)
        competencia = (
            attrs.get('competencia') if 'competencia' in attrs else getattr(self.instance, 'competencia', None)
        )
        soporte_multimedia = (
            attrs.get('soporte_multimedia')
            if 'soporte_multimedia' in attrs
            else getattr(self.instance, 'soporte_multimedia', 'NINGUNO')
        )
        imagen_grafica = (
            attrs.get('imagen_grafica')
            if 'imagen_grafica' in attrs
            else getattr(self.instance, 'imagen_grafica', None)
        )
        codigo_latex = (
            attrs.get('codigo_latex')
            if 'codigo_latex' in attrs
            else getattr(self.instance, 'codigo_latex', None)
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

        if soporte_multimedia not in {'NINGUNO', 'IMAGEN', 'LATEX'}:
            errors['soporte_multimedia'] = ['Selecciona un soporte multimedia valido.']

        if soporte_multimedia == 'IMAGEN' and not imagen_grafica:
            errors['imagen_grafica'] = ['Debes adjuntar una imagen cuando el soporte es IMAGEN.']

        if soporte_multimedia == 'LATEX' and not str(codigo_latex or '').strip():
            errors['codigo_latex'] = ['Debes escribir codigo LaTeX cuando el soporte es LATEX.']

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
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

            soporte_multimedia = str(validated_data.get('soporte_multimedia') or 'NINGUNO')
            if soporte_multimedia == 'NINGUNO':
                validated_data['imagen_grafica'] = None
                validated_data['codigo_latex'] = None
            elif soporte_multimedia == 'IMAGEN':
                validated_data['codigo_latex'] = None
            elif soporte_multimedia == 'LATEX':
                # La imagen final se compila en servidor; no aceptamos subida manual en este modo.
                validated_data['imagen_grafica'] = None

            pregunta = Pregunta.objects.create(**validated_data)

            for opcion in opciones_data:
                OpcionRespuesta.objects.create(pregunta=pregunta, **opcion)

            if soporte_multimedia == 'LATEX':
                self._compile_latex_or_raise(pregunta)

            return pregunta

    def update(self, instance, validated_data):
        with transaction.atomic():
            opciones_data = validated_data.pop('opciones', [])
            tipo_pregunta = validated_data.pop('tipo_pregunta', '')
            dificultad = validated_data.pop('dificultad', '')
            skip_options_validation = bool(self.context.get('skip_options_validation'))

            if dificultad:
                validated_data['nivel_dificultad'] = self._map_dificultad(dificultad)

            for attr, value in validated_data.items():
                setattr(instance, attr, value)

            soporte_multimedia = str(getattr(instance, 'soporte_multimedia', 'NINGUNO') or 'NINGUNO')
            if soporte_multimedia == 'NINGUNO':
                instance.imagen_grafica = None
                instance.codigo_latex = None
            elif soporte_multimedia == 'IMAGEN':
                instance.codigo_latex = None
            elif soporte_multimedia == 'LATEX':
                instance.imagen_grafica = None

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

            if soporte_multimedia == 'LATEX':
                self._compile_latex_or_raise(instance)

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

    @staticmethod
    def _describe_nivel(nivel):
        return {
            'Facil': 'Facil',
            'Medio': 'Medio',
            'Dificil': 'Dificil',
            'Balanceada': 'Balanceada',
        }.get(str(nivel or '').strip(), 'Balanceada')

    @staticmethod
    def _count_preguntas_publicadas(modulo, categoria, nivel_dificultad):
        preguntas_qs = Pregunta.objects.filter(modulo=modulo, estado='Publicada')

        if categoria:
            preguntas_qs = preguntas_qs.filter(categoria=categoria)

        if nivel_dificultad and nivel_dificultad != 'Balanceada':
            preguntas_qs = preguntas_qs.filter(nivel_dificultad=nivel_dificultad)

        return preguntas_qs.count()

    def _validate_reglas_disponibles(self, reglas_data):
        if not reglas_data:
            return

        reglas_agrupadas = {}

        for index, regla in enumerate(reglas_data, start=1):
            modulo = regla.get('modulo')
            categoria = regla.get('categoria')
            nivel_dificultad = str(regla.get('nivel_dificultad') or 'Balanceada').strip() or 'Balanceada'
            cantidad_preguntas = int(regla.get('cantidad_preguntas') or 0)

            if cantidad_preguntas <= 0:
                continue

            if modulo is None:
                raise serializers.ValidationError({'detail': f'La regla #{index} no tiene modulo valido.'})

            key = (modulo.id, categoria.id if categoria else None, nivel_dificultad)
            if key not in reglas_agrupadas:
                reglas_agrupadas[key] = {
                    'modulo': modulo,
                    'categoria': categoria,
                    'nivel_dificultad': nivel_dificultad,
                    'cantidad_solicitada': 0,
                    'indices': [],
                }

            reglas_agrupadas[key]['cantidad_solicitada'] += cantidad_preguntas
            reglas_agrupadas[key]['indices'].append(index)

        errores = []
        for datos in reglas_agrupadas.values():
            disponibles = self._count_preguntas_publicadas(
                modulo=datos['modulo'],
                categoria=datos['categoria'],
                nivel_dificultad=datos['nivel_dificultad'],
            )
            solicitadas = datos['cantidad_solicitada']

            if solicitadas <= disponibles:
                continue

            modulo_nombre = str(getattr(datos['modulo'], 'nombre', '') or '').strip() or 'Sin modulo'
            categoria_nombre = (
                str(getattr(datos['categoria'], 'nombre', '') or '').strip()
                if datos['categoria']
                else None
            )
            dificultad = self._describe_nivel(datos['nivel_dificultad'])
            reglas_ref = ', '.join(f'#{indice}' for indice in datos['indices'])

            detalle = (
                f'Regla(s) {reglas_ref} para modulo "{modulo_nombre}" '
                f'(dificultad: {dificultad}'
            )
            if categoria_nombre:
                detalle += f', categoria: {categoria_nombre}'
            detalle += f') solicita(n) {solicitadas} pregunta(s), pero solo hay {disponibles} publicada(s).'

            errores.append(detalle)

        if errores:
            raise serializers.ValidationError({'detail': ' | '.join(errores)})

    def create(self, validated_data):
        reglas_data = validated_data.pop('reglas', [])
        programas_data = validated_data.pop('programas_destino', [])

        self._validate_reglas_disponibles(reglas_data)

        with transaction.atomic():
            plantilla = PlantillaExamen.objects.create(**validated_data)
            plantilla.programas_destino.set(programas_data)

            for regla in reglas_data:
                ReglaExamen.objects.create(examen=plantilla, **regla)

        return plantilla

    def update(self, instance, validated_data):
        reglas_data = validated_data.pop('reglas', None)
        programas_data = validated_data.pop('programas_destino', None)

        if reglas_data is not None:
            self._validate_reglas_disponibles(reglas_data)

        with transaction.atomic():
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
    cantidad_preguntas = serializers.SerializerMethodField()
    modulos = serializers.SerializerMethodField()
    dificultad_referencia = serializers.SerializerMethodField()

    class Meta:
        model = PlantillaExamen
        fields = [
            'id',
            'titulo',
            'descripcion',
            'tiempo_minutos',
            'fecha_inicio',
            'fecha_fin',
            'cantidad_preguntas',
            'modulos',
            'dificultad_referencia',
        ]

    @staticmethod
    def get_cantidad_preguntas(obj):
        return sum((regla.cantidad_preguntas or 0) for regla in obj.reglas.all())

    @staticmethod
    def get_modulos(obj):
        nombres = []
        for regla in obj.reglas.select_related('modulo').all():
            nombre = str(getattr(regla.modulo, 'nombre', '') or '').strip()
            if nombre and nombre not in nombres:
                nombres.append(nombre)
        return nombres

    @staticmethod
    def get_dificultad_referencia(obj):
        dificultades = []
        for regla in obj.reglas.all():
            nivel = str(getattr(regla, 'nivel_dificultad', '') or '').strip()
            if nivel and nivel not in dificultades:
                dificultades.append(nivel)

        if not dificultades:
            return 'Intermedio'

        if len(dificultades) > 1:
            return 'Mixto'

        nivel = dificultades[0]
        return {
            'Facil': 'Basico',
            'Medio': 'Intermedio',
            'Dificil': 'Avanzado',
            'Balanceada': 'Intermedio',
        }.get(nivel, 'Intermedio')


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
            'imagen_grafica',
            'codigo_latex',
            'soporte_multimedia',
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
    plantilla_titulo = serializers.CharField(source='plantilla_examen.titulo', read_only=True)
    puntaje_global = serializers.SerializerMethodField()

    class Meta:
        model = IntentoExamen
        fields = [
            'id',
            'plantilla_examen',
            'plantilla_titulo',
            'fecha_inicio',
            'fecha_finalizacion',
            'estado',
            'puntaje_global',
            'plan_estudio_ia',
        ]

    @staticmethod
    def get_puntaje_global(obj):
        respuestas = list(obj.respuestas.all())
        total_preguntas = len(respuestas)
        if total_preguntas == 0:
            return 0

        aciertos_multiples = 0
        puntaje_ensayos = Decimal('0')

        for respuesta in respuestas:
            if respuesta.opcion_seleccionada_id and respuesta.opcion_seleccionada.es_correcta:
                aciertos_multiples += 1

            if respuesta.pregunta.limite_palabras is not None and respuesta.puntaje_calificado is not None:
                puntaje_ensayos += respuesta.puntaje_calificado

        total_aciertos = Decimal(aciertos_multiples) + puntaje_ensayos
        return round((float(total_aciertos) / total_preguntas) * 300)


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
