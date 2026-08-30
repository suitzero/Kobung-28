#!/usr/bin/env bash
# Starts a previously-stopped instance and waits for it to report running.
# Note: vast.ai can reassign the public port mapping on start, so the
# caller should re-read terraform outputs (data.external.vast_status)
# after this — don't assume the old public_port still applies.
set -euo pipefail

: "${VAST_API_KEY:?}"
cd "$(dirname "$0")/../terraform"

if [ ! -f .vast_instance_id ]; then
  echo "No recorded instance (terraform/.vast_instance_id missing) — nothing to start. Deploy first." >&2
  exit 1
fi

INSTANCE_ID=$(cat .vast_instance_id)
command -v vastai >/dev/null 2>&1 || pip install -q --user vastai >&2
export PATH="$HOME/.local/bin:$PATH"

vastai start instance "$INSTANCE_ID"

echo "Waiting for instance to report running..." >&2
STATUS=""
for _ in $(seq 1 30); do
  RAW=$(vastai show instance "$INSTANCE_ID" --raw 2>/dev/null || echo '{}')
  STATUS=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('actual_status') or '')" "$RAW")
  [ "$STATUS" = "running" ] && break
  sleep 10
done
echo "Instance status: $STATUS" >&2
