#!/usr/bin/env bash
# Tears down the rented vast.ai instance. Run this when you're done to stop
# billing.
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${VAST_API_KEY:?set VAST_API_KEY in .env}"

terraform -chdir=terraform destroy \
  -var="vast_api_key=$VAST_API_KEY" \
  -var="hf_repo=${HF_REPO:-apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128}" \
  -var="hf_token=${HF_TOKEN:-}" \
  -var="api_key=${LLAMA_API_KEY:-unused}" \
  -var="gpu_name=${GPU_NAME:-A100_SXM4}" \
  -var="num_gpus=${NUM_GPUS:-2}" \
  -var="public_expose=${PUBLIC_EXPOSE:-false}"
