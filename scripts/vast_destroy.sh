#!/usr/bin/env bash
# Called by terraform (null_resource.vast_instance destroy-time provisioner).
set -euo pipefail

: "${VAST_API_KEY:?}"
: "${STATE_FILE:?}"
export VAST_API_KEY

command -v vastai >/dev/null 2>&1 || pip install -q --user vastai
export PATH="$HOME/.local/bin:$PATH"

if [ ! -f "$STATE_FILE" ]; then
  echo "No instance id recorded at $STATE_FILE, nothing to destroy."
  exit 0
fi

INSTANCE_ID=$(cat "$STATE_FILE")
echo "Destroying vast.ai instance $INSTANCE_ID..."
vastai destroy instance "$INSTANCE_ID" || true
rm -f "$STATE_FILE"
