#!/usr/bin/env bash
# terraform `external` data source program: reads a JSON object of query
# args on stdin, must print ONLY a flat JSON string map to stdout (all
# diagnostics go to stderr).
set -euo pipefail

INPUT=$(cat)
STATE_FILE=$(python3 -c "import json,sys; print(json.load(sys.stdin)['state_file'])" <<<"$INPUT")
LOOKUP_PORT=$(python3 -c "import json,sys; print(json.load(sys.stdin)['lookup_port'])" <<<"$INPUT")

: "${VAST_API_KEY:?VAST_API_KEY must be set in the environment terraform itself was run in}"

if [ ! -f "$STATE_FILE" ]; then
  echo '{"status": "not_created", "public_ip": "", "public_port": "", "ssh_host": "", "ssh_port": ""}'
  exit 0
fi

INSTANCE_ID=$(cat "$STATE_FILE")
command -v vastai >/dev/null 2>&1 || pip install -q --user vastai >&2
export PATH="$HOME/.local/bin:$PATH"

RAW=$(vastai show instance "$INSTANCE_ID" --raw)

python3 - "$RAW" "$LOOKUP_PORT" <<'PYEOF'
import json, sys

data = json.loads(sys.argv[1])
port = sys.argv[2]

ports = data.get("ports") or {}
mapped = ports.get(f"{port}/tcp")
public_port = mapped[0]["HostPort"] if mapped else ""

out = {
    # `.get(key, "")` only substitutes the default when the key is
    # missing — vast.ai's API returns these as explicit JSON null while
    # an instance is still booting, which .get() passes through as None,
    # turning into the literal string "None" once str()'d. `or ""`
    # catches both missing-key and explicit-null cases.
    "status": str(data.get("actual_status") or ""),
    "public_ip": str(data.get("public_ipaddr") or ""),
    "public_port": str(public_port),
    "ssh_host": str(data.get("ssh_host") or ""),
    "ssh_port": str(data.get("ssh_port") or ""),
}
print(json.dumps(out))
PYEOF
