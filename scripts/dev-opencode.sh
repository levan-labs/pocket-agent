#!/usr/bin/env bash
# Start OpenCode + Pocket Agent web UI together (Ctrl+C stops what we started).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OPENCODE_HOST="${OPENCODE_HOST:-127.0.0.1}"
OPENCODE_PORT="${OPENCODE_PORT:-4096}"
WEB_ORIGIN="${WEB_ORIGIN:-http://127.0.0.1:5173}"
HEALTH_URL="http://${OPENCODE_HOST}:${OPENCODE_PORT}/global/health"
OPENCODE_LOG="${OPENCODE_LOG:-$ROOT/.opencode-serve.log}"

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
  # Timeouts matter in Termux/proot — bare curl can hang forever on localhost.
  if command -v curl >/dev/null 2>&1; then
    curl -sf --connect-timeout 1 --max-time 2 "$HEALTH_URL" >/dev/null 2>&1
    return $?
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q -T 2 -O /dev/null "$HEALTH_URL" >/dev/null 2>&1
    return $?
  fi
  echo "Need curl or wget to check OpenCode health."
  return 1
}

if opencode_healthy; then
  echo "OpenCode already running at http://${OPENCODE_HOST}:${OPENCODE_PORT} — reusing it."
else
  if ! command -v opencode >/dev/null 2>&1; then
    echo "opencode not found on PATH."
    echo "Install it first (Linux/proot):  npm install -g opencode-ai"
    echo "Plain Termux (android) cannot use opencode-ai — use proot-distro."
    exit 1
  fi

  echo "Starting OpenCode on http://${OPENCODE_HOST}:${OPENCODE_PORT} …"
  echo "(logs: ${OPENCODE_LOG})"
  # Redirect logs so a full stdout pipe (npm) cannot block the server.
  opencode serve \
    --hostname "$OPENCODE_HOST" \
    --port "$OPENCODE_PORT" \
    --cors "$WEB_ORIGIN" \
    >"$OPENCODE_LOG" 2>&1 &
  opencode_pid=$!
  started_opencode=1

  # Phones/proot can be slow; ~30s budget with non-hanging probes.
  healthy=0
  for _ in $(seq 1 60); do
    if opencode_healthy; then
      healthy=1
      break
    fi
    if ! kill -0 "$opencode_pid" 2>/dev/null; then
      echo "OpenCode failed to start. Last log lines:"
      tail -n 20 "$OPENCODE_LOG" 2>/dev/null || true
      echo "Is port ${OPENCODE_PORT} already in use?"
      exit 1
    fi
    sleep 0.5
  done

  if [[ "$healthy" -ne 1 ]]; then
    echo "OpenCode did not become healthy at ${HEALTH_URL}"
    echo "Last log lines:"
    tail -n 20 "$OPENCODE_LOG" 2>/dev/null || true
    exit 1
  fi
  echo "OpenCode is healthy."
fi

echo "Starting Pocket Agent on ${WEB_ORIGIN} …"
echo "Connect in the app: Settings → Connect… → OpenCode (local server)"
npm run dev
