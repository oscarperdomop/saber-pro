import json
import re

import google.generativeai as genai
from django.conf import settings


def _clean_text(value):
    return str(value or '').strip()


def _clean_markdown_fence(text):
    cleaned = _clean_text(text)
    if cleaned.startswith('```json'):
        cleaned = cleaned.removeprefix('```json').strip()
    elif cleaned.startswith('```'):
        cleaned = cleaned.removeprefix('```').strip()

    if cleaned.endswith('```'):
        cleaned = cleaned.removesuffix('```').strip()

    return cleaned


def _resolve_gemini_model():
    modelos_disponibles = []
    for model in genai.list_models():
        supported = list(getattr(model, 'supported_generation_methods', []) or [])
        if 'generateContent' in supported:
            modelos_disponibles.append(getattr(model, 'name', ''))

    if not modelos_disponibles:
        return None

    override_model = _clean_text(getattr(settings, 'GEMINI_MODEL', ''))
    if override_model:
        candidate = (
            override_model if override_model.startswith('models/') else f'models/{override_model}'
        )
        if candidate in modelos_disponibles:
            return candidate

    preferred_models = [
        'models/gemini-2.5-flash',
        'models/gemini-2.0-flash',
        'models/gemini-2.0-flash-lite',
        'models/gemini-1.5-flash-latest',
        'models/gemini-1.5-flash',
    ]

    for model_name in preferred_models:
        if model_name in modelos_disponibles:
            return model_name

    return modelos_disponibles[0]


def _normalize_distractors(raw_candidates, opcion_correcta):
    correcta = _clean_text(opcion_correcta).lower()
    normalized = []
    seen = set()

    for candidate in raw_candidates:
        text = _clean_text(candidate)
        if not text:
            continue

        # Limpia bullets y prefijos estilo "1.", "- ", "A)", etc.
        text = re.sub(r'^\s*[-*•\d\.\)\(A-Da-d]+\s*', '', text).strip()
        lower = text.lower()

        if not text or lower == correcta or lower in seen:
            continue

        seen.add(lower)
        normalized.append(text)
        if len(normalized) == 3:
            break

    return normalized


def autocompletar_distractores(enunciado, opcion_correcta, modulo_nombre):
    fallback = [
        'Distractor Aumentado 1 (IA)',
        'Distractor Aumentado 2 (IA)',
        'Distractor Aumentado 3 (IA)',
    ]

    if not _clean_text(enunciado) or not _clean_text(opcion_correcta):
        return fallback

    api_key = _clean_text(getattr(settings, 'GEMINI_API_KEY', ''))
    if not api_key:
        return fallback

    try:
        genai.configure(api_key=api_key)
        model_name = _resolve_gemini_model()
        if not model_name:
            return fallback

        prompt = f"""
Actua como un disenador de pruebas ICFES Saber Pro experto en el modulo de {modulo_nombre}.
Debes generar exactamente 3 distractores (opciones incorrectas) para la pregunta dada.

Regla estricta:
- Los distractores deben ser semanticamente similares a la respuesta correcta.
- Deben ser plausibles y del mismo nivel de dificultad.
- No deben contener errores tipograficos.
- No deben ser opciones absurdas o inventadas fuera del contexto.
- Si la respuesta correcta es una ciudad, los distractores deben ser ciudades reales del mismo contexto.
- Si el enunciado usa LaTeX, conserva el mismo estilo.

Enunciado: {enunciado}
Opcion Correcta: {opcion_correcta}

Formato de salida obligatorio:
- Devuelve solo 3 lineas de texto plano, una por distractor.
- No incluyas numeracion, letras (A/B/C/D), comillas, explicaciones ni saludos.
"""

        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        raw_text = _clean_markdown_fence(getattr(response, 'text', '') or '')

        # Soporta respuesta JSON o texto plano por lineas.
        raw_candidates = []
        try:
            maybe_json = json.loads(raw_text)
            if isinstance(maybe_json, list):
                raw_candidates = [item.get('texto') if isinstance(item, dict) else item for item in maybe_json]
        except Exception:
            raw_candidates = [line for line in raw_text.splitlines() if _clean_text(line)]

        distractores = _normalize_distractors(raw_candidates, opcion_correcta)
        if len(distractores) < 3:
            for candidate in fallback:
                if candidate not in distractores:
                    distractores.append(candidate)
                if len(distractores) == 3:
                    break

        return distractores[:3]
    except Exception:
        return fallback
