#!/usr/bin/env bash
# Stops the recorded instance (GPU billing stops, disk/model persist —
# unlike destroy, nothing needs re-downloading on the next start).
set -euo pipefail

: "${VAST_API_KEY:?}"
cd "$(dirname "$0")/../terraform"

if [ ! -f .vast_instance_id ]; then
  echo "No recorded instance (terraform/.vast_instance_id missing) — nothing to stop." >&2
  exit 1
fi

INSTANCE_ID=$(cat .vast_instance_id)
command -v vastai >/dev/null 2>&1 || pip install -q --user vastai >&2
export PATH="$HOME/.local/bin:$PATH"

vastai stop instance "$INSTANCE_ID"
echo "Stopped instance $INSTANCE_ID" >&2
