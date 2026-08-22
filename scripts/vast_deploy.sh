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

if [ -f "$STATE_FILE" ]; then
  echo "Instance already recorded at $STATE_FILE ($(cat "$STATE_FILE")), skipping create."
  echo "Run terraform destroy first if you want to replace it."
  exit 0
fi

command -v vastai >/dev/null 2>&1 || pip install -q --user vastai
export PATH="$HOME/.local/bin:$PATH"

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
pip3 install -q -U "huggingface_hub[hf_transfer]" vastai
export HF_HUB_ENABLE_HF_TRANSFER=1
mkdir -p /workspace/models
$( [ -n "$HF_TOKEN" ] && echo "huggingface-cli login --token '$HF_TOKEN' --add-to-git-credential" )
huggingface-cli download '$HF_REPO' --include '$HF_FILE_GLOB' --local-dir /workspace/models

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
echo "Model download + llama.cpp build happens in the background — check readiness with scripts/healthcheck.sh" >&2
