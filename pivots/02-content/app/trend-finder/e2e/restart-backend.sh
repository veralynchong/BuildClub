#!/usr/bin/env bash
# Restarts the throwaway backend on <port> (default 8871) with an empty database and the e2e user.
# Run: bash pivots/02-content/app/trend-finder/e2e/restart-backend.sh [port] <log_file>
# Prints nothing but "ready <pid>" on success. Stops only the process listening on that port.
set -eu
port="${1:-8871}"; log="${2:?usage: restart-backend.sh [port] <log_file>}"
case "$port" in 8811|8805|8850|8787|5195) echo "refusing port $port" >&2; exit 2;; esac
cd "$(dirname "$0")/../../../../.."
old="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)"
if [ -n "$old" ]; then kill $old; sleep 2; fi
(nohup bash bin/isolated-backend.sh "$port" --user test@example.com:pw-for-e2e > "$log" 2>&1 &)
for _ in $(seq 1 40); do grep -q "Added test@example.com" "$log" && { echo "ready $(lsof -nP -tiTCP:"$port" -sTCP:LISTEN)"; exit 0; }; sleep 0.5; done
echo "backend did not start:" >&2; tail -5 "$log" >&2; exit 1
