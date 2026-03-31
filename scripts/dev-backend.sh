#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

is_valid_python() {
  local candidate="$1"
  [[ -n "$candidate" ]] || return 1
  "$candidate" -V >/dev/null 2>&1
}

PYTHON_BIN=""
VENV_ERROR_MSG="No se encontro un virtualenv valido en backend/.venv (o backend/venv).
Crea e instala dependencias con:
  cd backend
  py -m venv .venv
  source .venv/Scripts/activate
  pip install -U pip django djangorestframework psycopg2-binary django-cors-headers"

for candidate in \
  "$ROOT_DIR/backend/.venv/Scripts/python.exe" \
  "$ROOT_DIR/backend/.venv/Scripts/python" \
  "$ROOT_DIR/backend/venv/Scripts/python.exe" \
  "$ROOT_DIR/backend/venv/Scripts/python" \
  "$ROOT_DIR/backend/.venv/bin/python" \
  "$ROOT_DIR/backend/venv/bin/python"
do
  if is_valid_python "$candidate"; then
    PYTHON_BIN="$candidate"
    break
  fi
done

if [[ -z "$PYTHON_BIN" ]]; then
  echo "$VENV_ERROR_MSG"
  exit 1
fi

if ! "$PYTHON_BIN" -c "import django" >/dev/null 2>&1; then
  echo "El virtualenv existe pero Django no esta instalado."
  echo "$VENV_ERROR_MSG"
  exit 1
fi

exec "$PYTHON_BIN" "$ROOT_DIR/backend/manage.py" runserver 0.0.0.0:8000
