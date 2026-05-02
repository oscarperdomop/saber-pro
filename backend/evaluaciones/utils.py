import base64
import io
import json
import os
import re
import shutil
import subprocess
import time
from tempfile import TemporaryDirectory

import google.generativeai as genai
from django.conf import settings
from django.core.files.base import ContentFile

LATEX_PREAMBLE_DEFAULT = r"""
\documentclass[preview,border=2pt]{standalone}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\AtBeginDocument{\shorthandoff{<>}}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{mathtools}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
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


def _resolve_latex_compiler():
    """
    Resuelve un compilador LaTeX disponible en este orden:
    1) settings.LATEX_COMPILER
    2) variable de entorno LATEX_COMPILER
    3) binario local portable en backend/tools/tectonic/tectonic.exe
    4) PATH del sistema: pdflatex, xelatex, tectonic
    """
    configured = str(getattr(settings, 'LATEX_COMPILER', '') or '').strip()
    env_configured = str(os.getenv('LATEX_COMPILER', '') or '').strip()

    local_tectonic = os.path.join(str(getattr(settings, 'BASE_DIR', '')), 'tools', 'tectonic', 'tectonic.exe')

    candidates = [
        configured,
        env_configured,
        local_tectonic,
        'pdflatex',
        'xelatex',
        'tectonic',
    ]

    seen = set()
    for candidate in candidates:
        if not candidate:
            continue

        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)

        # Ruta explÃ­cita
        if os.path.isabs(candidate) or os.path.sep in candidate or candidate.endswith('.exe'):
            if os.path.exists(candidate):
                return candidate
            continue

        # Binario en PATH
        resolved = shutil.which(candidate)
        if resolved:
            return resolved

    return None


def compilar_fragmento_latex(fragmento_codigo, nombre_archivo):
    fragmento = limpiar_fragmento_latex(fragmento_codigo)
    fragmento = _normalize_tikz_arrow_compat(fragmento)
    if not fragmento:
        return None, 'No se recibio fragmento de codigo LaTeX.'

    preamble = _get_latex_preamble()
    wrapper = _get_latex_wrapper()
    if '\\newpage{}' in wrapper:
        document_body = wrapper.replace('\\newpage{}', fragmento)
    else:
        document_body = f"\\begin{{document}}\n{fragmento}\n\\end{{document}}"

    codigo_completo = f"{preamble}\n{document_body}\n"

    compiler = _resolve_latex_compiler()
    poppler_path = str(getattr(settings, 'LATEX_POPPLER_PATH', '') or '').strip() or None

    if not compiler:
        return None, (
            "No se encontro un compilador LaTeX disponible. Configura LATEX_COMPILER "
            "o instala MiKTeX/TeXLive (pdflatex/xelatex), o usa el binario portable "
            "de Tectonic en backend/tools/tectonic/tectonic.exe."
        )

    try:
        from pdf2image import convert_from_path
    except Exception as exc:
        return None, (
            'No fue posible importar pdf2image. Instala la dependencia con '
            "'pip install pdf2image' y configura poppler en el servidor."
        )

    timeout_seconds = int(getattr(settings, 'LATEX_COMPILE_TIMEOUT_SECONDS', 30) or 30)
    timeout_seconds = max(5, min(timeout_seconds, 180))

    with TemporaryDirectory() as temp_dir:
        tex_path = os.path.join(temp_dir, 'input.tex')
        with open(tex_path, 'w', encoding='utf-8') as tex_file:
            tex_file.write(codigo_completo)

        try:
            compiler_name = os.path.basename(str(compiler)).lower()
            if 'tectonic' in compiler_name:
                compile_cmd = [
                    compiler,
                    '--keep-logs',
                    '--keep-intermediates',
                    'input.tex',
                ]
            else:
                compile_cmd = [
                    compiler,
                    '-interaction=nonstopmode',
                    '-halt-on-error',
                    '-file-line-error',
                    'input.tex',
                ]

            subprocess.run(
                compile_cmd,
                cwd=temp_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            return None, (
                f'Error de compilacion LaTeX: Timeout excedido ({timeout_seconds}s). '
                'Si es el primer render con Tectonic, puede estar descargando paquetes.'
            )
        except FileNotFoundError:
            return None, (
                f"No se encontro el compilador '{compiler}' en el servidor. "
                "Verifica LATEX_COMPILER, PATH o usa backend/tools/tectonic/tectonic.exe."
            )
        except subprocess.CalledProcessError as exc:
            output = '\n'.join(
                [
                    str(exc.stdout or '').strip(),
                    str(exc.stderr or '').strip(),
                ]
            ).strip()
            output = output[-1200:] if output else 'Error desconocido de compilacion.'
            if 'pgfplots@@environment@axis was complete' in output:
                output += (
                    "\nSugerencia: revisa que el bloque \\begin{axis}[...] cierre correctamente con "
                    "\\end{axis}, evita comentarios '%' dentro de opciones y valida llaves/corchetes balanceados."
                )
            return None, f'Error de compilacion LaTeX: {output}'

        pdf_path = os.path.join(temp_dir, 'input.pdf')
        if not os.path.exists(pdf_path):
            return None, 'No se genero el PDF de salida al compilar LaTeX.'

        try:
            images = convert_from_path(
                pdf_path,
                dpi=300,
                fmt='png',
                single_file=True,
                poppler_path=poppler_path,
            )
        except Exception as exc:
            return None, (
                'No se pudo convertir el PDF generado a imagen PNG. '
                f'Detalle: {exc}'
            )

        if not images:
            return None, 'La conversion PDF -> PNG no produjo imagenes.'

        image_buffer = io.BytesIO()
        images[0].save(image_buffer, format='PNG')
        image_buffer.seek(0)
        file_name = f"{str(nombre_archivo or 'pregunta_latex').strip()}.png"
        return ContentFile(image_buffer.read(), name=file_name), None


def compilar_preview_latex_base64(texto_latex, timeout_seconds=12):
    fragmento = limpiar_fragmento_latex(texto_latex)
    fragmento = _normalize_tikz_arrow_compat(fragmento)
    if not fragmento:
        return None, None, 'No se recibio texto LaTeX para previsualizar.'

    compiler = _resolve_latex_compiler()
    if not compiler:
        return None, None, (
            "No se encontro un compilador LaTeX disponible. Configura LATEX_COMPILER "
            "o instala MiKTeX/TeXLive (pdflatex/xelatex), o usa el binario portable "
            "de Tectonic en backend/tools/tectonic/tectonic.exe."
        )

    preview_preamble = r"""
\documentclass[preview,border=2pt]{standalone}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\AtBeginDocument{\shorthandoff{<>}}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{mathtools}
\usepackage{graphicx}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{arrows.meta}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\usepackage{tcolorbox}
\tcbuselibrary{breakable,skins}

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
""".strip()

    codigo_completo = (
        f"{preview_preamble}\n"
        r"\begin{document}" "\n"
        f"{fragmento}\n"
        r"\end{document}" "\n"
    )

    configured_timeout = int(getattr(settings, 'LATEX_PREVIEW_TIMEOUT_SECONDS', 45) or 45)
    timeout_seconds = int(timeout_seconds or configured_timeout)
    timeout_seconds = max(5, min(timeout_seconds, 180))

    with TemporaryDirectory() as temp_dir:
        tex_path = os.path.join(temp_dir, 'input.tex')
        with open(tex_path, 'w', encoding='utf-8') as tex_file:
            tex_file.write(codigo_completo)

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

        try:
            compiler_name = os.path.basename(str(compiler)).lower()
            if 'tectonic' in compiler_name:
                compile_cmd = [
                    compiler,
                    '--keep-logs',
                    '--keep-intermediates',
                    'input.tex',
                ]
            else:
                compile_cmd = [
                    compiler,
                    '-interaction=nonstopmode',
                    '-halt-on-error',
                    '-file-line-error',
                    'input.tex',
                ]

            subprocess.run(
                compile_cmd,
                cwd=temp_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=timeout_seconds,
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
            detalle = (
                f'Error de compilacion LaTeX: Timeout excedido '
                f'({timeout_seconds}s).'
            )
            if timeout_output:
                detalle = f'{detalle}\n{timeout_output}'
            return None, None, detalle
        except FileNotFoundError:
            return None, None, (
                f"No se encontro el compilador '{compiler}' en el servidor. "
                "Verifica LATEX_COMPILER, PATH o usa backend/tools/tectonic/tectonic.exe."
            )
        except subprocess.CalledProcessError as exc:
            output = '\n'.join(
                [
                    str(exc.stdout or '').strip(),
                    str(exc.stderr or '').strip(),
                ]
            ).strip()
            output = _sanitize_compiler_output(output)
            output = output[-2000:] if output else 'Error desconocido de compilacion.'
            return None, None, f'Error de compilacion LaTeX: {output}'

        pdf_path = os.path.join(temp_dir, 'input.pdf')
        if not os.path.exists(pdf_path):
            return None, None, 'No se genero el PDF de salida al compilar LaTeX.'

        with open(pdf_path, 'rb') as pdf_file:
            pdf_bytes = pdf_file.read()

        if not pdf_bytes:
            return None, None, 'La compilacion finalizo sin contenido PDF.'

        pdf_b64 = base64.b64encode(pdf_bytes).decode('utf-8')
        png_b64 = None

        # Render PNG para un preview mas "tight" y agradable en UI.
        try:
            from pdf2image import convert_from_path
            from PIL import Image, ImageChops

            poppler_path = str(getattr(settings, 'LATEX_POPPLER_PATH', '') or '').strip() or None
            images = convert_from_path(
                pdf_path,
                dpi=220,
                fmt='png',
                first_page=1,
                last_page=1,
                single_file=True,
                poppler_path=poppler_path,
            )
            if images:
                image = images[0].convert('RGB')
                white_bg = Image.new('RGB', image.size, (255, 255, 255))
                diff = ImageChops.difference(image, white_bg)
                bbox = diff.getbbox()
                if bbox:
                    image = image.crop(bbox)
                # Margen visual minimo para no cortar trazos
                image = image.crop(
                    (
                        max(0, image.getbbox()[0] - 2) if image.getbbox() else 0,
                        max(0, image.getbbox()[1] - 2) if image.getbbox() else 0,
                        min(image.width, image.getbbox()[2] + 2) if image.getbbox() else image.width,
                        min(image.height, image.getbbox()[3] + 2) if image.getbbox() else image.height,
                    )
                )
                png_buffer = io.BytesIO()
                image.save(png_buffer, format='PNG')
                png_buffer.seek(0)
                png_b64 = base64.b64encode(png_buffer.read()).decode('utf-8')
        except Exception:
            png_b64 = None

        return pdf_b64, png_b64, None


