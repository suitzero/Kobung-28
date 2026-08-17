#!/usr/bin/env bash
# One-command deploy: fill in .env, run this. Everything else (VPC,
# firewall, secrets, GPU VM, model download, vLLM server) is automated by
# Terraform + the instance startup script.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Copy .env.example to .env and fill in your GCP project + HF token first." >&2
  exit 1
fi
set -a
source .env
set +a

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID in .env}"
: "${HF_TOKEN:?set HF_TOKEN in .env}"

command -v terraform >/dev/null || { echo "terraform is not installed" >&2; exit 1; }
command -v gcloud >/dev/null || { echo "gcloud CLI is not installed" >&2; exit 1; }

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  echo "No active gcloud login found. Run: gcloud auth login && gcloud auth application-default login" >&2
  exit 1
fi

if [ -z "${VLLM_API_KEY:-}" ]; then
  VLLM_API_KEY=$(openssl rand -hex 32)
  echo "Generated VLLM_API_KEY (save this, it will not be printed again after this run): $VLLM_API_KEY"
fi

if [ -z "${ALLOWED_IP:-}" ]; then
  MY_IP=$(curl -sf https://ifconfig.me)
  ALLOWED_IP="$MY_IP/32"
  echo "Auto-detected your public IP, restricting access to: $ALLOWED_IP"
fi

echo
echo "This will provision GPU infrastructure on GCP that bills per hour while running."
echo "  project:      $GCP_PROJECT_ID"
echo "  machine_type: ${MACHINE_TYPE:-a2-ultragpu-8g}"
echo "  spot pricing: ${USE_SPOT:-true}"
echo "  allowed_ip:   $ALLOWED_IP"
read -r -p "Continue? [y/N] " CONFIRM
[ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ] || { echo "Aborted."; exit 1; }

terraform -chdir=terraform init -input=false

terraform -chdir=terraform apply -auto-approve \
  -var="project_id=$GCP_PROJECT_ID" \
  -var="region=${GCP_REGION:-us-central1}" \
  -var="zone=${GCP_ZONE:-us-central1-a}" \
  -var="allowed_ip=$ALLOWED_IP" \
  -var="machine_type=${MACHINE_TYPE:-a2-ultragpu-8g}" \
  -var="tensor_parallel_size=${TENSOR_PARALLEL_SIZE:-8}" \
  -var="use_spot=${USE_SPOT:-true}" \
  -var="hf_token=$HF_TOKEN" \
  -var="api_key=$VLLM_API_KEY"

echo
echo "=== Deploy submitted. The VM is booting and will pull the model in the background. ==="
SERVER_IP=$(terraform -chdir=terraform output -raw server_ip)
echo "Server IP: $SERVER_IP"
echo "Check readiness with: ./scripts/healthcheck.sh $SERVER_IP"
echo "Then query with: VLLM_HOST=$SERVER_IP VLLM_API_KEY=$VLLM_API_KEY python3 client/query.py \"hello\""
echo
echo "Remember: this instance bills per hour. Run ./destroy.sh when you're done."
