#!/usr/bin/env bash
# Polls the llama.cpp server's /v1/models endpoint until it responds, since
# the first boot can take a long time (model download + llama.cpp build).
# Usage: scripts/healthcheck.sh localhost 8000   (after ssh_tunnel_command)
#     or: scripts/healthcheck.sh <public_ip> <public_port>   (public_expose=true)
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "usage: $0 <server_ip> [port]" >&2
  exit 1
fi

HOST="$1"
PORT="${2:-8000}"
URL="http://$HOST:$PORT/v1/models"

echo "Waiting for $URL to come up (this can take a while on first boot: model download + load)..."
until curl -sf "$URL" >/dev/null 2>&1; do
  printf '.'
  sleep 15
done
echo
echo "Server is up:"
curl -s "$URL"
echo
