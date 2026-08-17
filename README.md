# DeepSeek-V4-Flash (abliterated) — self-hosted on GCP

Deploys [`cebeuq/DeepSeek-V4-Flash-0731-abliterated`](https://huggingface.co/cebeuq/DeepSeek-V4-Flash-0731-abliterated)
— a 284B-parameter MoE checkpoint with refusal behavior removed — to a
GPU VM on GCP, serving it with [vLLM](https://github.com/vllm-project/vllm)
behind an OpenAI-compatible API. Infra is Terraform; `deploy.sh` drives it
end to end from a filled-in `.env`.

**This model is uncensored.** It has had its safety refusal behavior
deliberately stripped and will attempt requests a normal model would
decline. The infra here defaults to locking the API down to your own IP
plus a bearer API key — do not weaken that unless you understand the
consequences of exposing it.

## What gets created

- A dedicated VPC + firewall rules that only allow SSH and the API port
  from `allowed_ip`.
- A GCE GPU instance (default: `a2-ultragpu-8g`, 8x A100 80GB) running
  the GCP Deep Learning VM image (NVIDIA drivers/Docker preinstalled).
- Your HF token and a generated API key, stored in Secret Manager (never
  written to disk on the VM, never committed to git).
- A startup script that downloads the model from Hugging Face and runs
  `vllm/vllm-openai` with tensor parallelism across the GPUs, gated behind
  the API key.
- An auto-shutdown safety net (default 12h) so a forgotten instance
  doesn't bill forever.

## Cost — read this before deploying

This is a 284B-parameter model; there is no cheap way to serve it, but
spot pricing gets you most of the way there. Rough us-central1 numbers,
verify current pricing before deploying:

| Machine type      | GPUs           | Spot $/hr (approx) | On-demand $/hr (approx) |
|--------------------|----------------|---------------------|---------------------------|
| `a2-ultragpu-8g`   | 8x A100 80GB   | ~$10-13             | ~$29+                     |
| `a2-ultragpu-4g`   | 4x A100 80GB   | ~$5-7               | ~$15+                     |
| `a3-highgpu-8g`    | 8x H100 80GB   | ~$16-22             | ~$60+                     |

Spot instances can be reclaimed at any time and will **not** auto-restart
(GCP disallows that combination) — use `scripts/restart_if_stopped.sh` to
bring it back manually, or wire it to a cron. `USE_SPOT=false` in `.env`
trades that off for guaranteed availability at ~3x the price.

**Always run `./destroy.sh` when you're done.** The auto-shutdown net only
stops the VM (compute billing stops, disk billing does not).

## Prerequisites

1. `gcloud` CLI and `terraform` (>=1.5) installed locally.
2. A GCP project with billing enabled: `gcloud auth login && gcloud auth application-default login`.
3. **GPU quota.** GCP does not grant A100/H100 quota by default and this
   cannot be automated — request it manually before deploying:
   - Console → IAM & Admin → Quotas → filter for `NVIDIA A100 80GB GPUs`
     (or `NVIDIA H100 GPUs`) in your target region → Edit Quotas.
   - Approval can take anywhere from minutes to a few days.
4. A Hugging Face access token with read access to the model:
   https://huggingface.co/settings/tokens

## Deploy

```bash
cp .env.example .env
# edit .env: set GCP_PROJECT_ID and HF_TOKEN at minimum.
# VLLM_API_KEY and ALLOWED_IP are auto-generated/auto-detected if left blank.

./deploy.sh
```

`deploy.sh` will print the server IP and generated API key. The instance
then needs time to boot and download the model (multi-hundred GB) before
it can answer queries:

```bash
./scripts/healthcheck.sh <server_ip>
```

## Query it

```bash
pip install -r client/requirements.txt
VLLM_HOST=<server_ip> VLLM_API_KEY=<key> python3 client/query.py "your prompt"
```

or with curl (see `terraform output curl_example` for a filled-in version):

```bash
curl http://<server_ip>:8000/v1/chat/completions \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"model": "cebeuq/DeepSeek-V4-Flash-0731-abliterated", "messages": [{"role": "user", "content": "hello"}]}'
```

## Troubleshooting

- Run the printed `ssh_command` output (`terraform -chdir=terraform output -raw ssh_command`),
  then `docker logs -f vllm-server` on the VM to watch model download / server startup.
- If `boot_image` fails to find the image family, list current ones with
  `gcloud compute images list --project deeplearning-platform-release --filter="family~common-cu"`
  and set `boot_image` in `.env`/tfvars accordingly.
- If the container OOMs on GPU memory, lower `MAX_MODEL_LEN` in `.env` and
  redeploy, or scale up `MACHINE_TYPE`.
- `TENSOR_PARALLEL_SIZE` must equal the GPU count implied by
  `MACHINE_TYPE` (e.g. `a2-ultragpu-4g` → `4`).

## Teardown

```bash
./destroy.sh
```

Removes the VM, static IP, firewall rules, VPC and secrets.
