#!/usr/bin/env bash
# One-command deploy: fill in .env (really just VAST_API_KEY), run this.
# Terraform searches vast.ai for the cheapest matching offer, rents it, and
# the instance downloads the pre-quantized model + builds/runs llama.cpp.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and fill in VAST_API_KEY first." >&2
  exit 1
fi
set -a
source .env
set +a

: "${VAST_API_KEY:?set VAST_API_KEY in .env — get one at https://cloud.vast.ai/manage-keys/}"

command -v terraform >/dev/null || { echo "terraform is not installed" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is not installed (needed to parse vast.ai API responses)" >&2; exit 1; }

if [ -z "${LLAMA_API_KEY:-}" ]; then
  LLAMA_API_KEY=$(openssl rand -hex 32)
  echo "Generated LLAMA_API_KEY (save this, it will not be printed again after this run): $LLAMA_API_KEY"
fi

echo
echo "This will rent GPU infrastructure on vast.ai that bills per hour while running."
echo "  hf_repo:        ${HF_REPO:-apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128}"
echo "  gpu:             ${NUM_GPUS:-2}x ${GPU_NAME:-A100_SXM4}"
echo "  public_expose:   ${PUBLIC_EXPOSE:-false}"
read -r -p "Continue? [y/N] " CONFIRM
[ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] || { echo "Aborted."; exit 1; }

terraform -chdir=terraform init -input=false

terraform -chdir=terraform apply -auto-approve \
  -var="vast_api_key=$VAST_API_KEY" \
  -var="hf_repo=${HF_REPO:-apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128}" \
  -var="hf_token=${HF_TOKEN:-}" \
  -var="api_key=$LLAMA_API_KEY" \
  -var="gpu_name=${GPU_NAME:-A100_SXM4}" \
  -var="num_gpus=${NUM_GPUS:-2}" \
  -var="public_expose=${PUBLIC_EXPOSE:-false}"

echo
echo "=== Deploy submitted. The instance is downloading the model and building llama.cpp in the background. ==="
terraform -chdir=terraform output

echo
if [ "${PUBLIC_EXPOSE:-false}" = "true" ]; then
  PUBLIC_IP=$(terraform -chdir=terraform output -raw public_ip)
  PUBLIC_PORT=$(terraform -chdir=terraform output -raw public_port)
  echo "Check readiness with: ./scripts/healthcheck.sh $PUBLIC_IP $PUBLIC_PORT"
  echo "Then query with: LLAMA_HOST=$PUBLIC_IP LLAMA_PORT=$PUBLIC_PORT LLAMA_API_KEY=$LLAMA_API_KEY python3 client/query.py \"hello\""
else
  echo "Run the ssh_tunnel_command shown above in a separate terminal, then:"
  echo "  ./scripts/healthcheck.sh localhost 8000"
  echo "  LLAMA_HOST=localhost LLAMA_API_KEY=$LLAMA_API_KEY python3 client/query.py \"hello\""
fi
echo
echo "Remember: this instance bills per hour. Run ./destroy.sh when you're done."
