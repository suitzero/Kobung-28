#!/usr/bin/env bash
# Tears down everything deploy.sh created. Run this when you're done to stop
# billing — an idle 8-GPU instance is not cheap.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID in .env}"

terraform -chdir=terraform destroy \
  -var="project_id=$GCP_PROJECT_ID" \
  -var="region=${GCP_REGION:-us-central1}" \
  -var="zone=${GCP_ZONE:-us-central1-a}" \
  -var="allowed_ip=${ALLOWED_IP:-0.0.0.0/32}" \
  -var="machine_type=${MACHINE_TYPE:-a2-ultragpu-8g}" \
  -var="tensor_parallel_size=${TENSOR_PARALLEL_SIZE:-8}" \
  -var="use_spot=${USE_SPOT:-true}" \
  -var="hf_token=${HF_TOKEN:-unused}" \
  -var="api_key=${VLLM_API_KEY:-unused}"
