import base64
import time
from unittest.mock import patch

from django.test import SimpleTestCase

from evaluaciones.utils import (
    LATEX_PREVIEW_CACHE_TTL_SECONDS,
    _latex_warmup_lock,
    _latex_warmup_state,
    _append_latex_compiler_hint,
    _build_preview_cache_key,
    _detect_incomplete_latex_fragment,
    _get_cached_preview_png_bytes,
    _latex_preview_cache,
    get_latex_warmup_status,
    trigger_latex_warmup,
)


class LatexUtilsTests(SimpleTestCase):
    def tearDown(self):
        _latex_preview_cache.clear()
        with _latex_warmup_lock:
            _latex_warmup_state['running'] = False
            _latex_warmup_state['started_at'] = None
            _latex_warmup_state['finished_at'] = None
            _latex_warmup_state['last_success_at'] = None
            _latex_warmup_state['last_error'] = None

    def test_detect_end_pregunta_without_begin_returns_friendly_message(self):
        fragment = r"""
        \begin{center}
        Texto de ejemplo
        \end{center}
        \end{pregunta}
        """

        error = _detect_incomplete_latex_fragment(fragment)

        self.assertIsNotNone(error)
        self.assertIn(r'\end{pregunta}', error)
        self.assertIn('No incluyas', error)

    def test_append_hint_for_missing_number_with_enumerate_label(self):
        fragment = r"""
        \begin{enumerate}[label=\Alph*)]
            \item A
        \end{enumerate}
        """
        compiler_output = 'error: input.tex:46: Missing number, treated as zero'

        enhanced = _append_latex_compiler_hint(compiler_output, fragment)

        self.assertIn('Missing number, treated as zero', enhanced)
        self.assertIn('Sugerencia', enhanced)
        self.assertIn('enumitem', enhanced)

    def test_get_cached_preview_png_bytes_uses_non_expired_entry(self):
        fragment = r'\begin{tikzpicture}\draw (0,0)--(1,0);\end{tikzpicture}'
        cache_key = _build_preview_cache_key(fragment)
        expected_bytes = b'png-bytes'
        _latex_preview_cache[cache_key] = (
            time.time(),
            'pdf-b64-dummy',
            base64.b64encode(expected_bytes).decode('utf-8'),
        )

        cached_bytes = _get_cached_preview_png_bytes(fragment)

        self.assertEqual(cached_bytes, expected_bytes)

    def test_get_cached_preview_png_bytes_discards_expired_entry(self):
        fragment = r'\begin{tikzpicture}\draw (0,0)--(1,0);\end{tikzpicture}'
        cache_key = _build_preview_cache_key(fragment)
        _latex_preview_cache[cache_key] = (
            time.time() - (LATEX_PREVIEW_CACHE_TTL_SECONDS + 1),
            'pdf-b64-dummy',
            base64.b64encode(b'old').decode('utf-8'),
        )

        cached_bytes = _get_cached_preview_png_bytes(fragment)

        self.assertIsNone(cached_bytes)
        self.assertNotIn(cache_key, _latex_preview_cache)

    def test_trigger_latex_warmup_returns_already_ready_when_recent_success(self):
        with _latex_warmup_lock:
            _latex_warmup_state['running'] = False
            _latex_warmup_state['last_success_at'] = time.time()
            _latex_warmup_state['last_error'] = None

        result = trigger_latex_warmup(force=False)

        self.assertEqual(result.get('action'), 'already_ready')
        self.assertEqual(result.get('phase'), 'ready')

    @patch('evaluaciones.utils.threading.Thread')
    def test_trigger_latex_warmup_starts_thread_when_idle(self, thread_mock):
        with _latex_warmup_lock:
            _latex_warmup_state['running'] = False
            _latex_warmup_state['last_success_at'] = None
            _latex_warmup_state['last_error'] = None

        result = trigger_latex_warmup(force=False)

        self.assertEqual(result.get('action'), 'started')
        self.assertTrue(result.get('running'))
        thread_mock.assert_called_once()
        thread_mock.return_value.start.assert_called_once()

    def test_get_latex_warmup_status_error_phase(self):
        with _latex_warmup_lock:
            _latex_warmup_state['running'] = False
            _latex_warmup_state['last_success_at'] = None
            _latex_warmup_state['last_error'] = 'boom'

        status_payload = get_latex_warmup_status()

        self.assertEqual(status_payload.get('phase'), 'error')
