#!/bin/bash
# Rendered by Terraform (templatefile) and run as the GCE instance's
# metadata startup-script. Runs as root on every boot.
set -euo pipefail

exec > >(tee -a /var/log/deepseek-vllm-startup.log) 2>&1
echo "=== startup script started at $(date -u) ==="

PROJECT_ID="${project_id}"
HF_TOKEN_SECRET="${hf_token_secret}"
API_KEY_SECRET="${api_key_secret}"
HF_MODEL_ID="${hf_model_id}"
VLLM_PORT="${vllm_port}"
TENSOR_PARALLEL_SIZE="${tensor_parallel_size}"
MAX_MODEL_LEN="${max_model_len}"
AUTO_SHUTDOWN_MINUTES="${auto_shutdown_minutes}"

# Safety net: don't let an idle multi-GPU box run (and bill) forever.
if [ "$AUTO_SHUTDOWN_MINUTES" -gt 0 ]; then
  shutdown -h "+$AUTO_SHUTDOWN_MINUTES" "deepseek-vllm auto-shutdown safety net" || true
fi

HF_TOKEN=$(gcloud secrets versions access latest --secret="$HF_TOKEN_SECRET" --project="$PROJECT_ID")
API_KEY=$(gcloud secrets versions access latest --secret="$API_KEY_SECRET" --project="$PROJECT_ID")

mkdir -p /mnt/hf-cache

# The Deep Learning VM image ships Docker + NVIDIA drivers + the NVIDIA
# container toolkit already configured, so this only needs to pull and run.
docker rm -f vllm-server >/dev/null 2>&1 || true
docker pull vllm/vllm-openai:latest

docker run -d \
  --name vllm-server \
  --restart unless-stopped \
  --gpus all \
  --shm-size=16g \
  -p "$VLLM_PORT:8000" \
  -e HUGGING_FACE_HUB_TOKEN="$HF_TOKEN" \
  -v /mnt/hf-cache:/root/.cache/huggingface \
  vllm/vllm-openai:latest \
  --model "$HF_MODEL_ID" \
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
  --max-model-len "$MAX_MODEL_LEN" \
  --trust-remote-code \
  --host 0.0.0.0 \
  --port 8000 \
  --api-key "$API_KEY"

echo "=== startup script finished at $(date -u); model download + server warmup continues in the container ==="
echo "Tail progress with: docker logs -f vllm-server"
