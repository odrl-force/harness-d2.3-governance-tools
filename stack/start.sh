#!/usr/bin/env bash
# Starts the pod (Community Solid Server, port 3000) and the authorisation server
# (UMA, port 4000) from IDLab's repo code in external/user-managed-access.
# The accounts are in stack/seed.json.
# Usage: bash stack/start.sh    Ctrl+C stops both servers.

# safety
set -euo pipefail

# UMA, logs and root vars
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UMA_REPO="$ROOT/external/user-managed-access"
LOGS="$ROOT/stack/logs"

# IDLab's code must be downloaded and at the commit this repo pins.
state="$(git -C "$ROOT" submodule status external/user-managed-access)"
case "${state:0:1}" in
  -) echo "IDLab's code is missing. Run: git submodule update --init"; exit 1 ;;
  +) echo "IDLab's code is not at the pinned commit. Run: git submodule update"; exit 1 ;;
esac
echo "IDLab's code at commit $(git -C "$UMA_REPO" rev-parse --short HEAD)"

# Free ports availability: stop early if an earlier run still holds the ports.
for port in 3000 4000; do
  if curl -s -o /dev/null "http://localhost:$port/"; then
    echo "Port $port is in use. Stop the other server first."; exit 1
  fi
done

# Install and build IDLab's code on the first run only. 
if [ ! -d "$UMA_REPO/packages/uma/dist" ] || [ ! -d "$UMA_REPO/packages/css/dist" ]; then
  echo "First run: installing and building IDLab's code"
  (cd "$UMA_REPO" && corepack yarn install)
fi

# Ctrl+C stops both servers and every process they started.
mkdir -p "$LOGS"
pids=()
stop_tree() { local child; for child in $(pgrep -P "$1" 2>/dev/null); do stop_tree "$child"; done; kill "$1" 2>/dev/null || true; }
stop_all() { for pid in "${pids[@]}"; do stop_tree "$pid"; done; }
trap stop_all EXIT INT TERM

# The start commands from IDLab's package.json files, with my accounts in place of theirs.
(cd "$UMA_REPO/packages/uma" && exec node bin/main.js) > "$LOGS/uma.log" 2>&1 & pids+=($!)
(cd "$UMA_REPO/packages/css" && exec npx community-solid-server -m . -c ./config/default.json ./config/init-pat.json \
    --seedConfig "$ROOT/stack/seed.json") > "$LOGS/css.log" 2>&1 & pids+=($!)

# Wait up to three minutes until both servers answer.
for i in $(seq 1 60); do
  if curl -s -o /dev/null http://localhost:4000/uma/.well-known/uma2-configuration && \
     [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/anna/profile/card)" = 200 ]; then
        echo "Both servers are up: http://localhost:3000/anna/profile/card and http://localhost:4000/uma/.well-known/uma2-configuration"
    echo "Logs: stack/logs/uma.log and stack/logs/css.log. Ctrl+C stops both."
    wait
    exit 0
  fi
  sleep 3
done
echo "The servers did not start in 3 minutes. See stack/logs/uma.log and stack/logs/css.log."
exit 1