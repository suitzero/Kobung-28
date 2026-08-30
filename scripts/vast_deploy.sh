#!/usr/bin/env bash
# Called by terraform (null_resource.vast_instance local-exec). Searches
# vast.ai for the cheapest offer matching GPU_NAME/NUM_GPUS, rents it, and
# hands it an onstart script that downloads the pre-quantized GGUF model
# and builds+runs llama.cpp's server. Idempotent: if STATE_FILE already
# has an instance id, does nothing (re-run `terraform destroy` first to
# replace it).
set -euo pipefail

: "${VAST_API_KEY:?}"
: "${HF_REPO:?}"
: "${API_KEY:?}"
: "${STATE_FILE:?}"

GPU_NAME="${GPU_NAME:-A100_SXM4}"
NUM_GPUS="${NUM_GPUS:-2}"
MIN_RELIABILITY="${MIN_RELIABILITY:-0.95}"
DISK_GB="${DISK_GB:-200}"
BASE_IMAGE="${BASE_IMAGE:-nvidia/cuda:12.4.1-devel-ubuntu22.04}"
LLAMA_CPP_REF="${LLAMA_CPP_REF:-master}"
CTX_SIZE="${CTX_SIZE:-8192}"
HF_FILE_GLOB="${HF_FILE_GLOB:-*.gguf}"
HF_TOKEN="${HF_TOKEN:-}"
PUBLIC_EXPOSE="${PUBLIC_EXPOSE:-false}"
SERVER_PORT="${SERVER_PORT:-8000}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
AUTO_SHUTDOWN_MINUTES="${AUTO_SHUTDOWN_MINUTES:-720}"

command -v vastai >/dev/null 2>&1 || pip install -q --user vastai
export PATH="$HOME/.local/bin:$PATH"

if [ -f "$STATE_FILE" ]; then
  RECORDED_ID=$(cat "$STATE_FILE")
  # Don't just trust the state file — the instance may have been destroyed
  # outside terraform entirely (manually on vast.ai's dashboard, the CLI,
  # or vast.ai reclaiming it), in which case terraform's cached state is
  # stale and would otherwise silently skip creating a replacement forever.
  RAW=$(vastai show instance "$RECORDED_ID" --raw 2>/dev/null || echo '{}')
  ALIVE=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
print('yes' if d.get('actual_status') else 'no')
" "$RAW")
  if [ "$ALIVE" = "yes" ]; then
    echo "Instance $RECORDED_ID is still alive on vast.ai, skipping create."
    exit 0
  fi
  echo "Instance $RECORDED_ID recorded at $STATE_FILE no longer exists on vast.ai (destroyed outside terraform) — creating a replacement." >&2
  rm -f "$STATE_FILE"
fi

QUERY="gpu_name=${GPU_NAME} num_gpus=${NUM_GPUS} disk_space>=${DISK_GB} reliability>${MIN_RELIABILITY} rentable=true"
echo "Searching vast.ai offers: $QUERY" >&2
OFFERS_JSON=$(vastai search offers "$QUERY" -o 'dph' --raw)
OFFER_ID=$(python3 -c "
import json, sys
offers = json.loads(sys.argv[1])
if not offers:
    sys.exit('no matching vast.ai offers found for: $QUERY')
print(offers[0]['id'])
" "$OFFERS_JSON")
echo "Cheapest matching offer: $OFFER_ID" >&2

# onstart runs as root inside the rented container on boot.
ONSTART_SCRIPT=$(cat <<SCRIPT
set -e
apt-get update -qq && apt-get install -y -qq python3-pip git cmake build-essential ninja-build >/dev/null
# huggingface_hub renamed its CLI from huggingface-cli to hf; the old name
# no longer works at all (hard error, not just a deprecation warning).
pip3 install -q -U huggingface_hub hf_transfer vastai
export HF_HUB_ENABLE_HF_TRANSFER=1
mkdir -p /workspace/models
$( [ -n "$HF_TOKEN" ] && echo "hf auth login --token '$HF_TOKEN' --add-to-git-credential" )
hf download '$HF_REPO' --include '$HF_FILE_GLOB' --local-dir /workspace/models

if [ ! -x /workspace/llama.cpp/build/bin/llama-server ]; then
  git clone --depth 1 --branch '$LLAMA_CPP_REF' https://github.com/ggml-org/llama.cpp /workspace/llama.cpp \
    || git clone --depth 1 https://github.com/ggml-org/llama.cpp /workspace/llama.cpp
  cmake -B /workspace/llama.cpp/build -S /workspace/llama.cpp -G Ninja \
    -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release -DCMAKE_CUDA_ARCHITECTURES=native
  cmake --build /workspace/llama.cpp/build --config Release --target llama-server -j\$(nproc)
fi

MODEL_FILE=\$(ls /workspace/models/*.gguf 2>/dev/null | sort | head -n1)
if [ -z "\$MODEL_FILE" ]; then
  echo "no .gguf file found under /workspace/models after download" >&2
  exit 1
fi

nohup /workspace/llama.cpp/build/bin/llama-server \
  -m "\$MODEL_FILE" \
  --host 127.0.0.1 \
  --port ${SERVER_PORT} \
  --api-key '${API_KEY}' \
  -ngl 999 \
  -c ${CTX_SIZE} \
  > /workspace/llama-server.log 2>&1 &

$( [ "$PUBLIC_EXPOSE" = "true" ] && cat <<CADDYBLOCK
# llama-server only binds localhost; Caddy terminates HTTPS on the publicly
# mapped port so a GitHub Pages (https) page can fetch it without the
# browser blocking it as mixed content. First visit to the instance's
# https URL needs a manual "proceed anyway" past the self-signed cert
# warning — after that the browser remembers the exception.
apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https gnupg >/dev/null
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
apt-get update -qq && apt-get install -y -qq caddy >/dev/null
cat > /etc/caddy/Caddyfile <<CADDYFILE
:${HTTPS_PORT} {
    tls internal
    reverse_proxy 127.0.0.1:${SERVER_PORT}
}
CADDYFILE
nohup caddy run --config /etc/caddy/Caddyfile --adapter caddyfile > /workspace/caddy.log 2>&1 &
CADDYBLOCK
)

# Safety net: self-stop after AUTO_SHUTDOWN_MINUTES so a forgotten rental
# doesn't bill unattended forever. CONTAINER_ID/CONTAINER_API_KEY are
# injected into every vast.ai instance automatically.
if [ "${AUTO_SHUTDOWN_MINUTES}" -gt 0 ]; then
  ( sleep $((AUTO_SHUTDOWN_MINUTES * 60)) && vastai stop instance \$CONTAINER_ID --api-key \$CONTAINER_API_KEY ) \
    > /workspace/auto-shutdown.log 2>&1 &
fi
SCRIPT
)

CREATE_ARGS=(vastai create instance "$OFFER_ID" --image "$BASE_IMAGE" --disk "$DISK_GB" --onstart-cmd "$ONSTART_SCRIPT" --ssh --direct --raw)
if [ "$PUBLIC_EXPOSE" = "true" ]; then
  # Only the HTTPS (Caddy) port is mapped publicly — llama-server itself
  # binds 127.0.0.1 only, reachable solely via this proxy or the SSH tunnel.
  CREATE_ARGS+=(--env "-p ${HTTPS_PORT}:${HTTPS_PORT}")
fi

echo "Renting instance..." >&2
CREATE_RESULT=$("${CREATE_ARGS[@]}")
INSTANCE_ID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['new_contract'])" "$CREATE_RESULT")
echo "$INSTANCE_ID" > "$STATE_FILE"
echo "Created vast.ai instance $INSTANCE_ID" >&2

# vast.ai needs a bit of time after instance creation to boot the
# container and assign the port mapping — without this wait, terraform's
# immediately-following data.external.vast_status read can catch it mid
# boot (actual_status still null, ports not mapped yet), producing empty
# outputs even though the instance is fine. Poll up to 5 minutes for
# "running" status (and the port mapping, if public) before returning.
echo "Waiting for instance to report running status..." >&2
READY="no"
for _ in $(seq 1 30); do
  RAW=$(vastai show instance "$INSTANCE_ID" --raw 2>/dev/null || echo '{}')
  READY=$(python3 -c "
import json, sys
d = json.loads(sys.argv[1])
port_ok = True
if sys.argv[2] == 'true':
    mapped = (d.get('ports') or {}).get(sys.argv[3] + '/tcp')
    port_ok = bool(mapped)
print('yes' if d.get('actual_status') == 'running' and port_ok else 'no')
" "$RAW" "$PUBLIC_EXPOSE" "$HTTPS_PORT")
  [ "$READY" = "yes" ] && break
  sleep 10
done
if [ "$READY" = "yes" ]; then
  echo "Instance is running." >&2
else
  echo "Instance didn't report running (+ port mapping) within 5 minutes — terraform outputs may be incomplete. It's likely still booting; check again shortly with scripts/healthcheck.sh or 'vastai show instance $INSTANCE_ID'." >&2
fi

echo "Model download + llama.cpp build happens in the background — check readiness with scripts/healthcheck.sh" >&2
