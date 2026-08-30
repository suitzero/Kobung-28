#!/usr/bin/env bash
# Run before `terraform apply`. Terraform only re-invokes a resource's
# create provisioner when it's actually creating that resource — if
# null_resource.vast_instance's triggers haven't changed, terraform sees
# "no changes needed" and never touches it, even if the recorded vast.ai
# instance was destroyed outside terraform entirely (vast.ai's own
# dashboard/CLI, or vast.ai reclaiming it). Left unchecked, every
# subsequent `terraform apply` silently no-ops forever instead of
# recreating anything.
#
# Prints "-replace=null_resource.vast_instance" on stdout (nothing
# otherwise) so callers can pass that straight through to
# `terraform apply` when a replacement is actually needed.
set -euo pipefail

: "${VAST_API_KEY:?}"
cd "$(dirname "$0")/../terraform"

STATE_FILE=.vast_instance_id
[ -f "$STATE_FILE" ] || exit 0

command -v vastai >/dev/null 2>&1 || pip install -q --user vastai >&2
export PATH="$HOME/.local/bin:$PATH"

RECORDED_ID=$(cat "$STATE_FILE")
RAW=$(vastai show instance "$RECORDED_ID" --raw 2>/dev/null || echo '{}')
ALIVE=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
print('yes' if d.get('actual_status') else 'no')
" "$RAW")

if [ "$ALIVE" != "yes" ]; then
  echo "Recorded instance $RECORDED_ID is gone from vast.ai (destroyed outside terraform) — forcing recreation." >&2
  echo "-replace=null_resource.vast_instance"
fi
