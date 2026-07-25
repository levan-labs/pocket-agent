#!/usr/bin/env bash
# Start OpenCode + Pocket Agent web UI together (Ctrl+C stops what we started).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OPENCODE_HOST="${OPENCODE_HOST:-127.0.0.1}"
OPENCODE_PORT="${OPENCODE_PORT:-4096}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:5173}"
HEALTH_URL="http://${OPENCODE_HOST}:${OPENCODE_PORT}/global/health"

opencode_pid=""
started_opencode=0

cleanup() {
  if [[ "$started_opencode" -eq 1 && -n "$opencode_pid" ]] && kill -0 "$opencode_pid" 2>/dev/null; then
    kill "$opencode_pid" 2>/dev/null || true
    wait "$opencode_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

opencode_healthy() {
  curl -sf "$HEALTH_URL" >/dev/null 2>&1
}

if opencode_healthy; then
  echo "OpenCode already running at http://${OPENCODE_HOST}:${OPENCODE_PORT} — reusing it."
else
  if ! command -v opencode >/dev/null 2>&1; then
    echo "opencode not found on PATH."
    echo "Install it first:  npm install -g opencode-ai"
    exit 1
  fi

  echo "Starting OpenCode on http://${OPENCODE_HOST}:${OPENCODE_PORT} …"
  opencode serve \
    --hostname "$OPENCODE_HOST" \
    --port "$OPENCODE_PORT" \
    --cors "$WEB_ORIGIN" &
  opencode_pid=$!
  started_opencode=1

  # Wait briefly for health; fail clearly if serve did not come up.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if opencode_healthy; then
      break
    fi
    if ! kill -0 "$opencode_pid" 2>/dev/null; then
      echo "OpenCode failed to start. Is port ${OPENCODE_PORT} already in use by something else?"
      exit 1
    fi
    sleep 0.3
  done

  if ! opencode_healthy; then
    echo "OpenCode did not become healthy at ${HEALTH_URL}"
    exit 1
  fi
fi

echo "Starting Pocket Agent on ${WEB_ORIGIN} …"
echo "Connect in the app: Settings → Connect… → OpenCode (local server)"
npm run dev
