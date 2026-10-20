#!/usr/bin/env bash
# Start quickqr2 production preview (detached). Verify with: ss -tlnp | grep 5185
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT=5185
LOG=/tmp/quickqr-preview.log

if ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
  echo "Already listening on ${PORT} (see ss -tlnp | grep ${PORT})"
  exit 0
fi

bun run build
nohup bun run start >>"$LOG" 2>&1 &
disown 2>/dev/null || true
sleep 2
if ! curl -sfI "http://127.0.0.1:${PORT}/" | head -1 | grep -q '200'; then
  echo "Failed to get HTTP 200 on port ${PORT}. Log:"
  tail -20 "$LOG"
  exit 1
fi
echo "OK: http://127.0.0.1:${PORT}/ (log: ${LOG})"
