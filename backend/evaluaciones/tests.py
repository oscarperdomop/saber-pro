from django.test import TestCase

from .models import Categoria, Competencia, ModuloPrueba
from .serializers import PreguntaAdminSerializer


class PreguntaAdminSerializerDuplicateEnunciadoTests(TestCase):
    def setUp(self):
        self.modulo = ModuloPrueba.objects.create(nombre='Razonamiento Cuantitativo')
        self.categoria = Categoria.objects.create(modulo=self.modulo, nombre='Algebra')
        self.competencia = Competencia.objects.create(modulo=self.modulo, nombre='Formulacion y ejecucion')

    def _build_payload(self, enunciado, estado='Borrador'):
        return {
            'modulo_id': self.modulo.id,
            'categoria': self.categoria.id,
            'competencia': self.competencia.id,
            'nivel_dificultad': 'Facil',
            'tipo_pregunta': 'Opcion Multiple',
            'soporte_multimedia': 'NINGUNO',
            'enunciado': enunciado,
            'estado': estado,
            'opciones': [
                {'texto': '4', 'es_correcta': True},
                {'texto': '5', 'es_correcta': False},
            ],
        }

    def test_create_rejects_duplicate_enunciado_same_modulo(self):
        serializer_1 = PreguntaAdminSerializer(data=self._build_payload('Cuanto es 2 + 2?'))
        self.assertTrue(serializer_1.is_valid(), serializer_1.errors)
        serializer_1.save()

        serializer_2 = PreguntaAdminSerializer(
            data=self._build_payload('  cuanto   es 2 + 2?  '),
        )
        self.assertFalse(serializer_2.is_valid())
        self.assertIn('enunciado', serializer_2.errors)

    def test_create_rejects_duplicate_with_punctuation_and_operator_variants(self):
        serializer_1 = PreguntaAdminSerializer(data=self._build_payload('¿Cuánto es 2 + 2 ?'))
        self.assertTrue(serializer_1.is_valid(), serializer_1.errors)
        serializer_1.save()

        serializer_2 = PreguntaAdminSerializer(data=self._build_payload('cuanto es 2+2'))
        self.assertFalse(serializer_2.is_valid())
        self.assertIn('enunciado', serializer_2.errors)

    def test_create_allows_duplicate_if_previous_is_archived(self):
        serializer_1 = PreguntaAdminSerializer(data=self._build_payload('Cuanto es 3 + 3?', estado='Archivada'))
        self.assertTrue(serializer_1.is_valid(), serializer_1.errors)
        serializer_1.save()

        serializer_2 = PreguntaAdminSerializer(data=self._build_payload('cuanto es 3 + 3?'))
        self.assertTrue(serializer_2.is_valid(), serializer_2.errors)
