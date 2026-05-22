import json
import logging
import re

from .models import OpcionRespuesta, RespuestaEstudiante
from .utils import llamar_api_modelo

logger = logging.getLogger(__name__)


def _limpiar_json_markdown(texto):
    texto_limpio = re.sub(r'```json\s*', '', str(texto or ''), flags=re.IGNORECASE)
    texto_limpio = re.sub(r'```\s*', '', texto_limpio)
    return texto_limpio.strip()


def _construir_prompt_feedback(preguntas_payload):
    bloques = []
    for item in preguntas_payload:
        bloques.append(
            '\n'.join(
                [
                    f"ID Respuesta: {item['id_respuesta']}",
                    f"Enunciado: {item['enunciado']}",
                    f"El estudiante marco: {item['opcion_errada']}",
                    f"La respuesta correcta era: {item['opcion_correcta']}",
                ]
            )
        )

    preguntas_texto = '\n\n'.join(bloques)

    return f"""Actua como un tutor experto de pruebas de estado Saber Pro.
A continuacion, te presento una lista de preguntas que un estudiante contesto incorrectamente.
Tu tarea es analizar cada una y explicar brevemente por que la opcion que eligio el estudiante es incorrecta y como se llega a la opcion correcta para un proximo examen.

{preguntas_texto}

DEVUELVE UNICAMENTE UN ARRAY EN FORMATO JSON VALIDO con esta estructura exacta:
[
  {{"id_respuesta": "uuid", "explicacion_pedagogica": "tu explicacion aqui..."}}
]"""


def _parsear_feedback_ia(texto_ia):
    data = json.loads(_limpiar_json_markdown(texto_ia))

    if isinstance(data, dict):
        # Fallback tolerante si el modelo envuelve la lista en una clave.
        for value in data.values():
            if isinstance(value, list):
                data = value
                break

    if not isinstance(data, list):
        raise ValueError('La IA no devolvio un array JSON para retroalimentacion.')

    resultados = {}
    for item in data:
        if not isinstance(item, dict):
            continue
        id_respuesta = str(item.get('id_respuesta') or item.get('id') or '').strip()
        explicacion = str(item.get('explicacion_pedagogica') or '').strip()
        if id_respuesta and explicacion:
            resultados[id_respuesta] = explicacion
    return resultados


def generar_feedback_intento_ia(intento_id, max_items=15):
    respuestas = list(
        RespuestaEstudiante.objects.filter(
            intento_id=intento_id,
            opcion_seleccionada__es_correcta=False,
        )
        .select_related('pregunta', 'opcion_seleccionada')
        .order_by('id')[:max_items]
    )

    if not respuestas:
        return {'intento_id': str(intento_id), 'procesadas': 0, 'actualizadas': 0}

    pregunta_ids = {respuesta.pregunta_id for respuesta in respuestas}
    mapa_correctas = {}
    for opcion in (
        OpcionRespuesta.objects.filter(pregunta_id__in=pregunta_ids, es_correcta=True)
        .order_by('pregunta_id', 'id')
        .values('pregunta_id', 'texto')
    ):
        pregunta_id = opcion['pregunta_id']
        if pregunta_id not in mapa_correctas:
            mapa_correctas[pregunta_id] = str(opcion.get('texto') or '').strip()

    preguntas_payload = []
    for respuesta in respuestas:
        preguntas_payload.append(
            {
                'id_respuesta': str(respuesta.id),
                'enunciado': str(getattr(respuesta.pregunta, 'enunciado', '') or '').strip(),
                'opcion_errada': str(getattr(respuesta.opcion_seleccionada, 'texto', '') or '').strip(),
                'opcion_correcta': mapa_correctas.get(respuesta.pregunta_id, ''),
            }
        )

    prompt = _construir_prompt_feedback(preguntas_payload)

    try:
        texto_ia = llamar_api_modelo(prompt)
        mapa_feedback = _parsear_feedback_ia(texto_ia)
    except Exception as exc:
        logger.warning(
            'No fue posible generar feedback IA en lote para intento %s: %s',
            intento_id,
            exc,
        )
        return {
            'intento_id': str(intento_id),
            'procesadas': len(respuestas),
            'actualizadas': 0,
            'error': str(exc),
        }

    para_actualizar = []
    for respuesta in respuestas:
        feedback = mapa_feedback.get(str(respuesta.id))
        if not feedback:
            continue
        respuesta.retroalimentacion_ia = feedback
        para_actualizar.append(respuesta)

    if para_actualizar:
        RespuestaEstudiante.objects.bulk_update(para_actualizar, ['retroalimentacion_ia'])

    return {
        'intento_id': str(intento_id),
        'procesadas': len(respuestas),
        'actualizadas': len(para_actualizar),
    }
