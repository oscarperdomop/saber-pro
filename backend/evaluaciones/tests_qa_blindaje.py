import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from evaluaciones.models import IntentoExamen, RespuestaEstudiante
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
def test_prevent_race_condition_guardar_respuesta(user_estudiante, plantilla_examen, pregunta):
    client = APIClient()
    client.force_authenticate(user=user_estudiante)
    
    # Crear un intento y una respuesta por defecto
    intento = IntentoExamen.objects.create(
        estudiante=user_estudiante,
        plantilla_examen=plantilla_examen,
        estado='Finalizado', # Simular que se finalizó concurrentemente
        fecha_finalizacion=timezone.now()
    )
    respuesta_obj = RespuestaEstudiante.objects.create(
        intento=intento,
        pregunta=pregunta
    )

    url = reverse('respuestaestudiante-detail', kwargs={'pk': respuesta_obj.id})
    res = client.patch(url, {'opcion_seleccionada': 'uuid-dummy'})
    
    assert res.status_code == 409
    assert 'no permite cambios' in res.data['detail'].lower()

@pytest.mark.django_db
def test_iniciar_intento_multiple_prevent(user_estudiante, plantilla_examen):
    client = APIClient()
    client.force_authenticate(user=user_estudiante)
    
    url = reverse('estudianteexamen-iniciar-intento', kwargs={'pk': plantilla_examen.id})
    
    # Primera petición
    res1 = client.post(url)
    assert res1.status_code == 201
    
    # Segunda petición que simula concurrencia
    res2 = client.post(url)
    assert res2.status_code == 400
    assert 'ya iniciado' in res2.data['detalle'].lower()
