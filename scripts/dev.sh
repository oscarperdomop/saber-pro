#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  if [[ -n "${BACK_PID:-}" ]]; then
    kill "$BACK_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONT_PID:-}" ]]; then
    kill "$FRONT_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM EXIT

"$ROOT_DIR/scripts/dev-backend.sh" &
BACK_PID=$!

"$ROOT_DIR/scripts/dev-frontend.sh" &
FRONT_PID=$!

echo "Backend PID: $BACK_PID"
echo "Frontend PID: $FRONT_PID"
echo "Servicios en ejecucion. Presiona Ctrl+C para detener ambos."

wait -n "$BACK_PID" "$FRONT_PID"
