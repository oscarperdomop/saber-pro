import base64
import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import time
import unicodedata
from tempfile import TemporaryDirectory

import google.generativeai as genai
from django.conf import settings
from django.core.files.base import ContentFile

LATEX_PREAMBLE_DEFAULT = r"""
\documentclass[preview,border=2pt,dvisvgm]{standalone}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\AtBeginDocument{\shorthandoff{<>}}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{mathtools}
\usepackage{enumitem}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\tikzset{arrow/.style={->,>=stealth}}
\usepackage{pgf-pie}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usepackage{tcolorbox}
\tcbuselibrary{breakable,skins}
\usepackage{hyperref}

\newtcolorbox{pregunta}[1][]{
  breakable,
  colback=white,
  colframe=black!35,
  boxrule=0.6pt,
  arc=1mm,
  left=2mm,
  right=2mm,
  top=1.5mm,
  bottom=1.5mm,
  title={#1},
  fonttitle=\bfseries
}
"""

LATEX_DOCUMENT_WRAPPER_DEFAULT = r"\begin{document}\newpage{}\end{document}"
LATEX_PREVIEW_CACHE_TTL_SECONDS = 300
LATEX_PREVIEW_CACHE_MAX_ITEMS = 64
_latex_preview_cache = {}
LATEX_WARMUP_SUCCESS_TTL_SECONDS = 3600
_latex_warmup_lock = threading.Lock()
_latex_warmup_state = {
    'running': False,
    'started_at': None,
    'finished_at': None,
    'last_success_at': None,
    'last_error': None,
}


def _build_preview_cache_key(fragmento):
    preview_preamble = _get_latex_preamble().strip()
    cache_key_raw = f"{preview_preamble}\n---\n{str(fragmento or '')}"
    return hashlib.sha256(cache_key_raw.encode('utf-8')).hexdigest()


def _get_latex_warmup_snippets():
    """
    Snippets cortos para forzar descarga/cache de paquetes frecuentes en producción.
    """
    return [
        r'\begin{enumerate}[label=\Alph*)]\item warmup\end{enumerate}',
        r'\begin{tikzpicture}\draw[arrow] (0,0) -- (1,1);\end{tikzpicture}',
        r'\begin{tikzpicture}\begin{axis}[ybar, symbolic x coords={A,B}, xtick=data]\addplot coordinates {(A,1) (B,2)};\end{axis}\end{tikzpicture}',
        r'\begin{tikzpicture}\pie{60/A,40/B}\end{tikzpicture}',
        r'\begin{tabular}{cc}\toprule A & B \\\midrule 1 & 2 \\\bottomrule\end{tabular}',
    ]


def _warmup_timeout_seconds():
    configured_timeout = int(getattr(settings, 'LATEX_PREVIEW_TIMEOUT_SECONDS', 45) or 45)
    return max(10, min(configured_timeout, 180))


def _execute_latex_warmup():
    timeout_seconds = _warmup_timeout_seconds()
    last_error = None

    for snippet in _get_latex_warmup_snippets():
        _svg_b64, compile_error = compilar_preview_latex_base64(
            snippet,
            timeout_seconds=timeout_seconds,
        )
        if compile_error:
            last_error = str(compile_error)
            break

    now = time.time()
    with _latex_warmup_lock:
        _latex_warmup_state['running'] = False
        _latex_warmup_state['finished_at'] = now
        _latex_warmup_state['last_error'] = last_error
        if not last_error:
            _latex_warmup_state['last_success_at'] = now


def get_latex_warmup_status():
    with _latex_warmup_lock:
        snapshot = dict(_latex_warmup_state)

    now = time.time()
    is_recent_success = bool(
        snapshot.get('last_success_at')
        and (now - float(snapshot['last_success_at'])) <= LATEX_WARMUP_SUCCESS_TTL_SECONDS
    )

    if snapshot.get('running'):
        phase = 'running'
    elif is_recent_success and not snapshot.get('last_error'):
        phase = 'ready'
    elif snapshot.get('last_error'):
        phase = 'error'
    else:
        phase = 'idle'

    return {
        'phase': phase,
        'running': bool(snapshot.get('running')),
        'started_at': snapshot.get('started_at'),
        'finished_at': snapshot.get('finished_at'),
        'last_success_at': snapshot.get('last_success_at'),
        'last_error': snapshot.get('last_error'),
        'success_ttl_seconds': LATEX_WARMUP_SUCCESS_TTL_SECONDS,
    }


def trigger_latex_warmup(force=False):
    now = time.time()
    action = 'started'
    with _latex_warmup_lock:
        if _latex_warmup_state['running']:
            action = 'already_running'
        else:
            last_success_at = _latex_warmup_state.get('last_success_at')
            is_recent_success = bool(
                last_success_at and (now - float(last_success_at)) <= LATEX_WARMUP_SUCCESS_TTL_SECONDS
            )
            if is_recent_success and not force:
                action = 'already_ready'
            else:
                _latex_warmup_state['running'] = True
                _latex_warmup_state['started_at'] = now
                _latex_warmup_state['finished_at'] = None
                _latex_warmup_state['last_error'] = None

    if action == 'started':
        warmup_thread = threading.Thread(target=_execute_latex_warmup, daemon=True)
        warmup_thread.start()

    return {'action': action, **get_latex_warmup_status()}


def _get_cached_preview_svg_bytes(fragmento):
    """
    Reutiliza el SVG de preview si existe y sigue vigente.
    Esto evita recompilar en guardado cuando el usuario ya previsualizo el mismo snippet.
    """
    cache_key = _build_preview_cache_key(fragmento)
    cached = _latex_preview_cache.get(cache_key)
    if not cached:
        return None

    cached_at = None
    cached_svg_b64 = None
    if isinstance(cached, (tuple, list)):
        # Compatibilidad con formato antiguo:
        # (timestamp, pdf_base64, preview_png_base64)
        if len(cached) >= 3:
            cached_at = cached[0]
            cached_svg_b64 = cached[2]
        elif len(cached) >= 2:
            cached_at = cached[0]
            cached_svg_b64 = cached[1]
    elif isinstance(cached, dict):
        cached_at = cached.get('cached_at')
        cached_svg_b64 = cached.get('svg_b64')

    if cached_at is None or not cached_svg_b64:
        _latex_preview_cache.pop(cache_key, None)
        return None

    if (time.time() - cached_at) > LATEX_PREVIEW_CACHE_TTL_SECONDS:
        _latex_preview_cache.pop(cache_key, None)
        return None

    if not cached_svg_b64:
        return None

    try:
        return base64.b64decode(cached_svg_b64)
    except Exception:
        return None


def _get_cached_preview_png_bytes(fragmento):
    """
    Compatibilidad temporal para tests/llamadores antiguos.
    Internamente ahora retorna bytes SVG.
    """
    return _get_cached_preview_svg_bytes(fragmento)


def normalizar_texto(value):
    text = str(value or '')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    # Homogeneiza expresiones matematicas equivalentes como "2+2" y "2 + 2".
    text = re.sub(r'([+\-*/=<>^%])', r' \1 ', text)
    # Ignora puntuacion de redaccion que no cambia el significado base.
    text = re.sub(r'[¿?¡!.,;:"\'`~()\[\]{}|\\]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


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
        text = re.sub(r'^\s*[-*\u2022\d\.\)\(A-Da-d]+\s*', '', text).strip()
        lower = text.lower()

        if not text or lower == correcta or lower in seen:
            continue

        # Evita respuestas perezosas del tipo "Opcion 1", "Distractor 2", "Lima 3", etc.
        if re.fullmatch(r'(opcion|option|distractor|respuesta)\s*\d+', lower):
            continue
        if correcta and re.fullmatch(rf'{re.escape(correcta)}\s*[-_:]?\s*\d+', lower):
            continue

        seen.add(lower)
        normalized.append(text)
        if len(normalized) == 3:
            break

    return normalized


def construir_prompt_distractores(enunciado, opcion_correcta, modulo, categoria):
    return f"""Eres un experto creador de pruebas estandarizadas universitarias (tipo examen de Estado / Saber Pro).
Tu tarea es generar exactamente 3 distractores (respuestas incorrectas) pedagogica y conceptualmente plausibles.

MODULO: {modulo}
CATEGORIA: {categoria}
ENUNCIADO: {enunciado}
RESPUESTA CORRECTA: {opcion_correcta}

REGLAS ESTRICTAS DE GENERACION:
1. PLAUSIBILIDAD: Los distractores deben representar errores de analisis, confusiones teoricas, falacias logicas o calculos incorrectos (si aplica) tipicos del area evaluada.
2. SIMETRIA: Los distractores deben mantener el mismo estilo, longitud y tono gramatical de la respuesta correcta.
3. EXCLUSIVIDAD: Ningun distractor puede ser parcialmente correcto o ser un sinonimo de la respuesta correcta.
4. CONTEXTO Y FORMATO: Respeta el contexto cuantitativo del enunciado. Si hay porcentajes, incluye "%". Si hay dinero, usa "$". Si hay decimales, conserva formato decimal (ej: 10.0). Si hay notacion fraccionaria/LaTeX, usa formato coherente (ej: $\\frac{16}{5}$).

FORMATO DE SALIDA ESTRICTO:
Responde UNICAMENTE con un JSON valido. No incluyas explicaciones, introducciones ni bloques de markdown.
Estructura:
{{
  "distractores": ["distractor 1", "distractor 2", "distractor 3"]
}}"""


def llamar_api_modelo(prompt):
    api_key = _clean_text(getattr(settings, 'GEMINI_API_KEY', ''))
    if not api_key:
        raise ValueError('No se encontro GEMINI_API_KEY configurada en el entorno.')

    genai.configure(api_key=api_key)
    model_name = _resolve_gemini_model()
    if not model_name:
        raise ValueError('No hay modelos Gemini disponibles para generateContent.')

    model = genai.GenerativeModel(model_name)
    response = model.generate_content(prompt)
    texto_ia = _clean_text(getattr(response, 'text', '') or '')
    if not texto_ia:
        raise ValueError('La IA devolvio una respuesta vacia.')
    return texto_ia


def procesar_respuesta_ia(texto_ia, opcion_correcta):
    # Limpieza exhaustiva de posibles bloques markdown.
    texto_limpio = re.sub(r'```json\n?', '', str(texto_ia or ''), flags=re.IGNORECASE)
    texto_limpio = re.sub(r'```\n?', '', texto_limpio)
    texto_limpio = texto_limpio.strip()

    # Parseo dinamico: acepta cualquier clave que contenga una lista.
    data = json.loads(texto_limpio)
    distractores = []
    if isinstance(data, dict):
        for _, value in data.items():
            if isinstance(value, list) and len(value) >= 3:
                distractores = value
                break
    elif isinstance(data, list) and len(data) >= 3:
        distractores = data

    if len(distractores) < 3:
        raise ValueError(
            'La IA devolvio un JSON, pero no contenia una lista con al menos 3 elementos.'
        )

    candidatos = []
    for item in distractores:
        if isinstance(item, dict):
            texto_item = (
                item.get('texto')
                or item.get('distractor')
                or item.get('opcion')
                or item.get('contenido')
                or item.get('value')
            )
            if texto_item:
                candidatos.append(texto_item)
            continue
        candidatos.append(item)

    distractores_limpios = _normalize_distractors(candidatos, opcion_correcta)
    if len(distractores_limpios) < 3:
        raise ValueError('La IA devolvio menos de 3 distractores validos.')

    return distractores_limpios[:3]


def obtener_distractores_ia(enunciado, opcion_correcta, modulo, categoria, max_intentos=3):
    prompt = construir_prompt_distractores(
        enunciado=enunciado,
        opcion_correcta=opcion_correcta,
        modulo=modulo,
        categoria=categoria,
    )

    ultimo_error = None
    for intento in range(max_intentos):
        try:
            texto_ia = llamar_api_modelo(prompt)
            distractores = procesar_respuesta_ia(texto_ia, opcion_correcta=opcion_correcta)
            if len(distractores) >= 3:
                return distractores[:3]
            raise ValueError('La IA devolvio un JSON valido pero con menos de 3 distractores.')
        except Exception as exc:
            ultimo_error = exc
            error_str = str(exc).lower()

            # Si es error de cuota (HTTP 429), cortar reintentos inmediatamente.
            if '429' in error_str or 'quota' in error_str:
                raise Exception('Limite de cuota API alcanzado. Esperando enfriamiento.') from exc

            if intento == max_intentos - 1:
                raise Exception(
                    f'La IA fallo tras {max_intentos} intentos. Detalle: {str(exc)}'
                ) from exc
            # Pausa mas conservadora para errores de parseo/estructura.
            time.sleep(3)

    raise Exception(
        f'La IA fallo tras {max_intentos} intentos. Detalle: {str(ultimo_error)}'
    )


def autocompletar_distractores(enunciado, opcion_correcta, modulo_nombre, categoria_nombre):
    return obtener_distractores_ia(
        enunciado=enunciado,
        opcion_correcta=opcion_correcta,
        modulo=modulo_nombre,
        categoria=categoria_nombre,
    )


def _get_latex_preamble():
    preamble = str(getattr(settings, 'LATEX_PREAMBLE_INSTITUCIONAL', '') or '').strip()
    return preamble or LATEX_PREAMBLE_DEFAULT.strip()


def _get_latex_wrapper():
    wrapper = str(getattr(settings, 'LATEX_DOCUMENT_WRAPPER', '') or '').strip()
    return wrapper or LATEX_DOCUMENT_WRAPPER_DEFAULT


def _normalize_tikz_arrow_compat(fragmento):
    """
    Compatibilidad defensiva para entornos TeX donde `Stealth` (arrows.meta)
    no esta disponible o falla intermitentemente.
    """
    normalized = str(fragmento or '')
    normalized = re.sub(r'-\{\s*Stealth(?:\[[^\]]*\])?\s*\}', '->', normalized)
    normalized = re.sub(r'>=\s*Stealth\b', '>=stealth', normalized)
    return normalized


def _normalize_pgf_pie_options(fragmento):
    """
    pgf-pie es sensible a claves con espacio inicial (ej: '/pgf/ color').
    Normaliza \\pie[...] para aceptar fragmentos con indentacion y saltos.
    """
    source = str(fragmento or '')

    def _clean_options(match):
        options_raw = match.group(1) or ''
        parts = options_raw.split(',')
        cleaned_parts = []
        for part in parts:
            token = part.strip()
            if not token:
                continue
            if '=' in token:
                key, value = token.split('=', 1)
                token = f"{key.strip()}={value.strip()}"
            cleaned_parts.append(token)
        return r"\pie[" + ', '.join(cleaned_parts) + ']'

    # Soporta \pie[...] y \pie*[...]
    source = re.sub(r'\\pie\*\s*\[(.*?)\]', _clean_options, source, flags=re.DOTALL)
    source = re.sub(r'\\pie\s*\[(.*?)\]', _clean_options, source, flags=re.DOTALL)
    return source


def _normalize_tikz_legacy_arrow_style(fragmento):
    """
    Compatibilidad para snippets que usan \\draw[arrow] sin definir estilo arrow.
    Convierte el token 'arrow' a la flecha nativa '->' en opciones de \\draw[...].
    """
    source = str(fragmento or '')

    def _clean_draw_options(match):
        options_raw = match.group(1) or ''
        parts = options_raw.split(',')
        normalized_parts = []
        for part in parts:
            token = part.strip()
            if not token:
                continue
            if token == 'arrow':
                normalized_parts.append('->')
                continue
            normalized_parts.append(token)
        return r'\draw[' + ', '.join(normalized_parts) + ']'

    return re.sub(r'\\draw\s*\[(.*?)\]', _clean_draw_options, source, flags=re.DOTALL)


def _detect_incomplete_latex_fragment(fragmento):
    """
    Detecta fragmentos incompletos antes de compilar para devolver un mensaje claro al usuario.
    """
    text = str(fragmento or '')
    if not text.strip():
        return 'No se recibio texto LaTeX para compilar.'

    begin_pregunta = bool(re.search(r'\\begin\s*\{\s*pregunta\s*\}', text))
    end_pregunta = bool(re.search(r'\\end\s*\{\s*pregunta\s*\}', text))
    if end_pregunta and not begin_pregunta:
        return (
            'Codigo LaTeX incompleto o invalido: se detecto \\end{pregunta} sin apertura. '
            'No incluyas \\begin{pregunta} ni \\end{pregunta}; pega solo el contenido interno.'
        )

    env_pattern = re.compile(r'\\(begin|end)\s*\{([^\}]+)\}')
    stack = []
    mismatch = None
    for match in env_pattern.finditer(text):
        kind = match.group(1)
        env_name = str(match.group(2) or '').strip()
        if not env_name:
            continue
        if kind == 'begin':
            stack.append(env_name)
            continue
        if stack and stack[-1] == env_name:
            stack.pop()
        else:
            mismatch = env_name
            break

    if mismatch:
        return (
            'Codigo LaTeX incompleto o desbalanceado: hay cierres de entorno fuera de orden '
            f'(ejemplo detectado: \\end{{{mismatch}}}).'
        )

    if stack:
        pendientes = ', '.join(f'\\end{{{env}}}' for env in stack[-3:])
        return (
            'Codigo LaTeX incompleto: faltan cierres de entorno. '
            f'Revisa especialmente: {pendientes}.'
        )

    # Verificacion ligera de llaves para detectar bloques cortados en mitad.
    open_braces = text.count('{') - text.count(r'\{')
    close_braces = text.count('}') - text.count(r'\}')
    if open_braces != close_braces:
        return (
            'Codigo LaTeX incompleto: las llaves no estan balanceadas. '
            'Verifica que cada "{" tenga su "}".'
        )

    return None


def _append_latex_compiler_hint(output_text, fragmento):
    """
    Enriquece errores tecnicos comunes con una sugerencia accionable para usuario final.
    """
    output = str(output_text or '').strip()
    if not output:
        return output

    lower_output = output.lower()
    lower_fragment = str(fragmento or '').lower()

    if 'missing number, treated as zero' in lower_output:
        uses_enum_label = (
            r'\begin{enumerate}[' in lower_fragment
            and 'label=' in lower_fragment
            and ('\\alph*' in lower_fragment or '\\alph*)' in lower_fragment)
        )
        if uses_enum_label:
            output += (
                '\nSugerencia: el formato de lista `label=...` requiere soporte de enumitem. '
                'Si pegaste \\end{pregunta}, retiralo y vuelve a intentar solo con el fragmento.'
            )
    return output


def limpiar_fragmento_latex(fragmento):
    # 1. Eliminar saltos de lÃ­nea dobles que LaTeX interpreta como \par (nuevo pÃ¡rrafo)
    # Reemplaza cualquier secuencia de 2 o mÃ¡s saltos de lÃ­nea por uno solo.
    fragmento_limpio = re.sub(r'[\r\n]{2,}', '\n', str(fragmento or ''))

    # [!] DEFENSIVIDAD ACTIVA: Sanitizacion Estricta Anti-LFI & Ejecucion Macro Insegura
    comandos_prohibidos = [
        # Requeridos por auditoria
        r'\\write18?\b',
        r'\\input\b',
        r'\\include\b',
        r'\\immediate\b',
        r'\\def\b',
        # Cobertura defensiva adicional
        r'\\openin\b',
        r'\\read\b',
        r'\\openout\b',
        r'\\usepackage\b',
        r'\\RequirePackage\b',
        r'\\PassOptionsToPackage\b',
        r'\\let\b',
    ]
    for prohibido in comandos_prohibidos:
        if re.search(prohibido, fragmento_limpio, re.IGNORECASE):
            raise ValueError(
                'Comando de entorno LaTeX prohibido detectado por seguridad (LFI/RCE Guard).'
            )

    # 2. Asegurarnos de que no haya espacios en blanco al inicio o final
    return fragmento_limpio.strip()


def sanitizar_fragmento_latex(fragmento_codigo):
    fragmento = limpiar_fragmento_latex(fragmento_codigo)
    fragmento = _normalize_tikz_arrow_compat(fragmento)
    fragmento = _normalize_pgf_pie_options(fragmento)
    fragmento = _normalize_tikz_legacy_arrow_style(fragmento)
    return fragmento


def calcular_hash_md5_latex(fragmento_codigo):
    fragmento = sanitizar_fragmento_latex(fragmento_codigo)
    incomplete_error = _detect_incomplete_latex_fragment(fragmento)
    if incomplete_error:
        raise ValueError(incomplete_error)
    if not fragmento:
        raise ValueError('No se recibio fragmento de codigo LaTeX.')

    return hashlib.md5(fragmento.encode('utf-8')).hexdigest(), fragmento


def _resolve_binary(candidates):
    seen = set()
    for candidate in candidates:
        candidate = str(candidate or '').strip()
        if not candidate:
            continue

        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)

        if os.path.isabs(candidate) or os.path.sep in candidate or candidate.endswith('.exe'):
            if os.path.exists(candidate):
                return candidate
            continue

        resolved = shutil.which(candidate)
        if resolved:
            return resolved
    return None


def _resolve_latex_engine():
    configured = str(getattr(settings, 'LATEX_COMPILER', '') or '').strip()
    env_configured = str(os.getenv('LATEX_COMPILER', '') or '').strip()
    def _is_dvi_capable_name(binary_name):
        base = os.path.basename(str(binary_name or '')).lower()
        return base in {'latex', 'latex.exe', 'pdflatex', 'pdflatex.exe', 'pdftex', 'pdftex.exe'}

    preferred = [name for name in [configured, env_configured] if _is_dvi_capable_name(name)]
    fallback = ['latex', 'pdflatex', 'pdftex', configured, env_configured]
    return _resolve_binary(preferred + fallback)


def _resolve_dvisvgm_binary():
    configured = str(getattr(settings, 'LATEX_DVISVGM_BINARY', '') or '').strip()
    env_configured = str(os.getenv('LATEX_DVISVGM_BINARY', '') or '').strip()
    return _resolve_binary([configured, env_configured, 'dvisvgm'])


def _build_compiler_env():
    """
    Construye un entorno de compilacion TeX estable,
    incluyendo un cache local reutilizable dentro del contenedor.
    """
    env = os.environ.copy()

    base_dir = str(getattr(settings, 'BASE_DIR', '') or '').strip()
    if base_dir:
        cache_root = os.path.join(base_dir, '.cache')
    else:
        cache_root = os.path.join(os.getcwd(), '.cache')

    tectonic_cache = env.get('TECTONIC_CACHE_PATH') or os.path.join(cache_root, 'tectonic')
    xdg_cache_home = env.get('XDG_CACHE_HOME') or cache_root

    try:
        os.makedirs(tectonic_cache, exist_ok=True)
    except Exception:
        pass
    try:
        os.makedirs(xdg_cache_home, exist_ok=True)
    except Exception:
        pass

    env.setdefault('TECTONIC_CACHE_PATH', tectonic_cache)
    env.setdefault('XDG_CACHE_HOME', xdg_cache_home)
    return env


def _sanitize_compiler_output(raw_text):
    lines = []
    for line in str(raw_text or '').splitlines():
        lower = line.lower()
        if 'fontconfig error' in lower:
            continue
        if 'no such file: (null)' in lower:
            continue
        lines.append(line)
    return '\n'.join(lines).strip()


def _cache_svg_preview(fragmento, svg_b64):
    cache_key = _build_preview_cache_key(fragmento)
    if len(_latex_preview_cache) >= LATEX_PREVIEW_CACHE_MAX_ITEMS:
        oldest_key = next(iter(_latex_preview_cache.keys()))
        _latex_preview_cache.pop(oldest_key, None)
    _latex_preview_cache[cache_key] = (time.time(), svg_b64)


def _compilar_latex_a_svg_bytes(codigo_completo, fragmento, timeout_seconds):
    latex_engine = _resolve_latex_engine()
    if not latex_engine:
        return None, (
            "No se encontro un binario LaTeX para generar DVI. Configura LATEX_COMPILER "
            "o instala un distribuidor TeX con el comando 'latex'."
        )

    dvisvgm_binary = _resolve_dvisvgm_binary()
    if not dvisvgm_binary:
        return None, (
            "No se encontro el binario dvisvgm. Instala dvisvgm y/o configura "
            "LATEX_DVISVGM_BINARY en el entorno."
        )

    with TemporaryDirectory() as temp_dir:
        tex_path = os.path.join(temp_dir, 'snippet.tex')
        dvi_path = os.path.join(temp_dir, 'snippet.dvi')
        svg_path = os.path.join(temp_dir, 'snippet.svg')

        with open(tex_path, 'w', encoding='utf-8') as tex_file:
            tex_file.write(codigo_completo)

        try:
            latex_engine_basename = os.path.basename(str(latex_engine)).lower()
            latex_cmd = [
                latex_engine,
                '-interaction=nonstopmode',
                '-halt-on-error',
            ]
            if latex_engine_basename in {'pdflatex', 'pdflatex.exe', 'pdftex', 'pdftex.exe'}:
                latex_cmd.append('-output-format=dvi')
            latex_cmd.append('snippet.tex')
            subprocess.run(
                latex_cmd,
                cwd=temp_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=timeout_seconds,
                env=_build_compiler_env(),
            )
        except subprocess.TimeoutExpired as exc:
            timeout_output = '\n'.join(
                [
                    str(exc.stdout or '').strip(),
                    str(exc.stderr or '').strip(),
                ]
            ).strip()
            timeout_output = _sanitize_compiler_output(timeout_output)
            timeout_output = timeout_output[-1200:] if timeout_output else ''
            detalle = f'Error de compilacion LaTeX: Timeout excedido ({timeout_seconds}s).'
            if timeout_output:
                detalle = f'{detalle}\n{timeout_output}'
            return None, detalle
        except FileNotFoundError:
            return None, (
                f"No se encontro el compilador '{latex_engine}' en el servidor. "
                "Verifica LATEX_COMPILER y PATH."
            )
        except subprocess.CalledProcessError as exc:
            output = '\n'.join([str(exc.stdout or '').strip(), str(exc.stderr or '').strip()]).strip()
            output = _sanitize_compiler_output(output)
            output = output[-2000:] if output else 'Error desconocido de compilacion.'
            output = _append_latex_compiler_hint(output, fragmento)
            return None, f'Error de compilacion LaTeX: {output}'

        if not os.path.exists(dvi_path):
            return None, 'No se genero el archivo DVI de salida al compilar LaTeX.'

        try:
            dvisvgm_cmd = [
                dvisvgm_binary,
                '--no-fonts',
                '--exact-bbox',
                '-o',
                'snippet.svg',
                'snippet.dvi',
            ]
            subprocess.run(
                dvisvgm_cmd,
                cwd=temp_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=timeout_seconds,
                env=_build_compiler_env(),
            )
        except subprocess.TimeoutExpired:
            return None, f'Error de conversion SVG: Timeout excedido ({timeout_seconds}s).'
        except FileNotFoundError:
            return None, (
                f"No se encontro el conversor '{dvisvgm_binary}' en el servidor. "
                "Verifica LATEX_DVISVGM_BINARY y PATH."
            )
        except subprocess.CalledProcessError as exc:
            output = '\n'.join([str(exc.stdout or '').strip(), str(exc.stderr or '').strip()]).strip()
            output = _sanitize_compiler_output(output)
            output = output[-2000:] if output else 'Error desconocido de conversion SVG.'
            return None, f'Error de conversion SVG: {output}'

        if not os.path.exists(svg_path):
            return None, 'No se genero el archivo SVG de salida al convertir LaTeX.'

        with open(svg_path, 'rb') as svg_file:
            svg_bytes = svg_file.read()

        if not svg_bytes:
            return None, 'La conversion a SVG finalizo sin contenido.'

        return svg_bytes, None


def compilar_fragmento_latex(fragmento_codigo, nombre_archivo):
    try:
        _hash, fragmento = calcular_hash_md5_latex(fragmento_codigo)
    except ValueError as exc:
        return None, str(exc)

    cached_svg_bytes = _get_cached_preview_svg_bytes(fragmento)
    if cached_svg_bytes:
        file_name = f"{str(nombre_archivo or 'pregunta_latex').strip()}.svg"
        return ContentFile(cached_svg_bytes, name=file_name), None

    preamble = _get_latex_preamble()
    wrapper = _get_latex_wrapper()
    if '\\newpage{}' in wrapper:
        document_body = wrapper.replace('\\newpage{}', fragmento)
    else:
        document_body = f"\\begin{{document}}\n{fragmento}\n\\end{{document}}"

    codigo_completo = f"{preamble}\n{document_body}\n"

    timeout_seconds = int(getattr(settings, 'LATEX_COMPILE_TIMEOUT_SECONDS', 12) or 12)
    timeout_seconds = max(2, min(timeout_seconds, 120))

    svg_bytes, error = _compilar_latex_a_svg_bytes(codigo_completo, fragmento, timeout_seconds)
    if error:
        return None, error

    svg_b64 = base64.b64encode(svg_bytes).decode('utf-8')
    _cache_svg_preview(fragmento, svg_b64)

    file_name = f"{str(nombre_archivo or 'pregunta_latex').strip()}.svg"
    return ContentFile(svg_bytes, name=file_name), None


def compilar_preview_latex_base64(texto_latex, timeout_seconds=8):
    try:
        _hash, fragmento = calcular_hash_md5_latex(texto_latex)
    except ValueError as exc:
        return None, str(exc)

    cache_key = _build_preview_cache_key(fragmento)
    now = time.time()
    cached = _latex_preview_cache.get(cache_key)
    if cached:
        cached_at, cached_svg_b64 = cached
        if (now - cached_at) <= LATEX_PREVIEW_CACHE_TTL_SECONDS:
            return cached_svg_b64, None
        _latex_preview_cache.pop(cache_key, None)

    preview_preamble = _get_latex_preamble().strip()
    codigo_completo = (
        f"{preview_preamble}\n"
        r"\begin{document}" "\n"
        f"{fragmento}\n"
        r"\end{document}" "\n"
    )

    configured_timeout = int(getattr(settings, 'LATEX_PREVIEW_TIMEOUT_SECONDS', 8) or 8)
    timeout_seconds = int(timeout_seconds or configured_timeout)
    timeout_seconds = max(2, min(timeout_seconds, 120))

    svg_bytes, error = _compilar_latex_a_svg_bytes(codigo_completo, fragmento, timeout_seconds)
    if error:
        return None, error

    svg_b64 = base64.b64encode(svg_bytes).decode('utf-8')
    _cache_svg_preview(fragmento, svg_b64)
    return svg_b64, None
