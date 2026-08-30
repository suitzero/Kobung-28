# DeepSeek-V4-Flash (abliterated) — self-hosted on vast.ai

Rents the cheapest matching GPU offer on [vast.ai](https://vast.ai), and
serves a **pre-quantized** GGUF build of
[`cebeuq/DeepSeek-V4-Flash-0731-abliterated`](https://huggingface.co/cebeuq/DeepSeek-V4-Flash-0731-abliterated)
— a 284B-parameter MoE checkpoint with refusal behavior removed — via
[llama.cpp](https://github.com/ggml-org/llama.cpp)'s OpenAI-compatible API.
Terraform drives the whole lifecycle; `deploy.sh` needs only your vast.ai
API key to do everything else.

**This model is uncensored.** It has had its safety refusal behavior
deliberately stripped and will attempt requests a normal model would
decline. By default the API is **not** publicly exposed at all — it's only
reachable through an SSH tunnel to your own machine. Don't set
`PUBLIC_EXPOSE=true` unless you understand the consequences.

## Why quantized, and why this specific repo

The raw checkpoint is ~284GB even at native FP8. Quantizing it ourselves
would mean first loading the full model (BF16 ≈ 568GB) somewhere just to
calibrate a quantizer — an expensive job in its own right. The community
already did this: **`apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128`**
is a mixed-precision GGUF (MXFP4 for sensitive experts, lower-bit for the
rest) that fits in ~110GB and is explicitly validated against llama.cpp.
Using it instead of re-quantizing from scratch is both cheaper and faster
to stand up. Alternatives, if you want to trade cost/quality differently:

| Repo | Format | Size | Notes |
|---|---|---|---|
| `apetersson/...-DS4-Quality128` (default) | mixed GGUF | ~110GB | best quality at this size |
| `apetersson/...-DS4-Headroom128` | mixed GGUF | ~110GB | more headroom for long context, slightly lower quality |
| `mradermacher/DeepSeek-V4-Flash-0731-Abliterated-FP8-GGUF` (`Q4_K_S`) | standard GGUF | ~162GB | more conservative, standard quantization, needs more VRAM |
| `mradermacher/...` (`Q2_K`) | standard GGUF | ~103GB | smallest, noticeably lower quality |

Change `HF_REPO` in `.env` to switch; `HF_FILE_GLOB` selects which files to
pull if a repo has multiple quant levels in one place (see the repo's
"Files" tab on Hugging Face for exact filenames).

## Why local-exec + the vastai CLI instead of a "real" provider

There is no maintained official Terraform provider for vast.ai. The one
community provider on the registry (`aalekhpatel07/vastai`) hasn't been
published in years and doesn't cover offer search/rental. Rather than
depend on that, `terraform/main.tf` wraps the **official, actively
maintained `vastai` CLI** (`pip install vastai`) with `local-exec`
provisioners — you still get `terraform apply` / `terraform destroy`, just
backed by a tool that's actually kept in sync with vast.ai's API. The
tradeoff: `terraform plan` can't show you a real diff of what will change
on vast.ai's side (it's opaque to a `null_resource`). Secrets are kept out
of `null_resource.triggers` on purpose (that map does get written to
`terraform.tfstate`) — they only ever flow through provisioner
`environment` blocks or process-environment inheritance, so
`terraform.tfstate` doesn't contain them. `terraform.tfstate` is still
gitignored regardless, since it does record your config (GPU choice, repo,
etc).

## What gets created

- One rented vast.ai instance (`GPU_NAME` x `NUM_GPUS`, default 2x A100
  80GB) booting a CUDA dev image.
- An onstart script that downloads the GGUF model from Hugging Face,
  builds `llama-server` from source (no docker-in-docker needed — vast.ai
  containers don't reliably support that), and runs it bound to
  `127.0.0.1:8000` (never directly public) gated by a bearer API key.
- By default (`PUBLIC_EXPOSE=false`), nothing is mapped publicly — you
  reach it only via SSH tunnel into the instance, which vast.ai provides
  for every rental.
- If `PUBLIC_EXPOSE=true`, a [Caddy](https://caddyserver.com) reverse proxy
  with a self-signed HTTPS cert (`tls internal`) is additionally installed
  and mapped to the public port — plain HTTP isn't offered publicly, since
  a browser (e.g. the GitHub Pages web console below) would block it as
  mixed content on an https page.
- A self-stop safety net: the instance stops itself after
  `AUTO_SHUTDOWN_MINUTES` (default 12h) via vast.ai's own API, in case you
  forget to tear it down.

## Cost

vast.ai pricing is a live marketplace — `deploy.sh` always rents whatever
is currently cheapest that matches `GPU_NAME`/`NUM_GPUS`. Rough guide for
the ~110GB default model (check current listings at
https://cloud.vast.ai/create/ before deploying):

| GPUs | Total VRAM | Typical $/hr on vast.ai |
|---|---|---|
| 2x A100 80GB SXM (default) | 160GB | ~$1.50-2.50 |
| 2x H100 80GB SXM | 160GB | ~$3-5 |
| 3x RTX A6000 48GB | 144GB | ~$1-1.80 (cheaper, no NVLink but llama.cpp doesn't need it) |
| 5x RTX 4090 24GB | 120GB | ~$1.20-2 (tight headroom for KV cache/context) |

This is a fraction of the equivalent hyperscaler cost, but it still bills
per hour continuously. **Always run `./destroy.sh` when you're done** — the
auto-shutdown safety net only *stops* the instance (GPU billing stops, but
disk storage billing doesn't); `destroy.sh` fully terminates and releases
it.

## Prerequisites

1. `terraform` (>=1.5) and `python3` installed locally.
2. A vast.ai account with a payment method, and an API key from
   https://cloud.vast.ai/manage-keys/.
3. (Not required for the default `HF_REPO` — it's ungated.) A Hugging Face
   token only if you point `HF_REPO` at a gated repo.

## Deploy

```bash
cp .env.example .env
# edit .env: set VAST_API_KEY. Everything else has a working default.

./deploy.sh
```

`deploy.sh` searches vast.ai for the cheapest matching offer, rents it,
and prints the SSH tunnel command plus a generated `LLAMA_API_KEY`. The
instance then needs time to download the ~110GB model and build
llama.cpp before it can answer queries — this typically takes 10-30
minutes depending on the host's bandwidth/CPU.

Open a second terminal and run the printed `ssh_tunnel_command`, then:

```bash
./scripts/healthcheck.sh localhost 8000
```

## Deploy from GitHub Actions instead

You don't need a local machine at all — `.github/workflows/deploy.yml` and
`destroy.yml` do the same thing as `deploy.sh`/`destroy.sh`, triggered from
the Actions tab. `stop.yml` / `start.yml` cover the day-to-day case:
**stop** pauses GPU billing but keeps the disk (model + built llama.cpp)
intact, so **start** resumes in well under a minute — no re-downloading
110GB every time. Save `destroy` for when you actually want to release the
instance (switching GPU type/repo, or done with it entirely).

1. Repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `VAST_API_KEY` (required)
   - `LLAMA_API_KEY` (required) — generate one yourself, e.g. `openssl rand
     -hex 32`, and set it here. **This repo is public**, which means Actions
     run logs and job summaries are publicly viewable by anyone — so the
     deploy workflow refuses to run if this isn't set rather than
     generating (and inevitably publishing) a key for you.
   - `HF_TOKEN` (optional — only if `HF_REPO` is gated)
2. Actions tab → **Deploy DeepSeek to vast.ai** → **Run workflow**. Adjust
   `hf_repo`/`gpu_name`/`num_gpus`/`public_expose` if you want something
   other than the defaults.
3. When it finishes, open the run's **Summary** for the `ssh_tunnel_command`
   (or public IP/port if `public_expose=true`). The API key is never
   printed anywhere — it's the value you set as the `LLAMA_API_KEY` secret.
4. When done, Actions tab → **Destroy vast.ai instance** → **Run workflow**.

Terraform state is cached between runs (`actions/cache`) so the destroy
workflow can find the instance the deploy workflow created. GitHub evicts
cache entries unused for 7+ days — if a destroy run reports it can't find
cached state, check https://cloud.vast.ai/instances/ for the running
instance's id and re-run the destroy workflow with that id in the
`instance_id` input; it'll tear it down directly, bypassing terraform.

## Query it

```bash
pip install -r client/requirements.txt
LLAMA_HOST=localhost LLAMA_API_KEY=<key> python3 client/query.py "your prompt"
```

or with curl, through the same SSH tunnel:

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

If you set `PUBLIC_EXPOSE=true`, use `https://` with the `public_ip`/
`public_port` terraform outputs instead of `localhost`/the tunnel — the
first request to a new instance needs the self-signed cert trusted once
(see the web console section below), whether you're hitting it with curl
(`-k`/`--insecure` skips verification) or a browser.

## Web console (GitHub Pages)

`docs/index.html` is a small static page — chat-style input, streams the
response — that talks directly to your instance from the browser. It's
meant to be served via GitHub Pages:

1. One-time: repo → **Settings → Pages → Source: Deploy from a branch**,
   pick this branch (or `main`, after merging) and `/docs`, save.
2. Deploy with `public_expose=true` (either `PUBLIC_EXPOSE=true` in `.env`
   + `./deploy.sh`, or the `public_expose` input on the **Deploy DeepSeek
   to vast.ai** GitHub Actions workflow). Plain SSH-tunnel mode
   (`public_expose=false`) doesn't work here — a browser tab can't drive
   an SSH tunnel for you.
3. The deploy workflow writes the instance's host/port to
   `docs/endpoint.json` and commits it, so the page autofills on load. (A
   local `./deploy.sh` run does *not* do this — it doesn't push to git —
   so fill in Host/Port manually on the page in that case, from the
   printed `public_ip`/`public_port`.)
4. Open `https://<owner>.github.io/<repo>/`. First visit
   `https://<instance-ip>:<port>/v1/models` directly in a new tab and
   click through the self-signed certificate warning ("Proceed anyway" /
   "Visit site") — one-time per browser per instance, since vast.ai
   doesn't give you a real domain/cert. Then go back to the console page,
   paste in your API key, and send a prompt.

`docs/endpoint.json` only ever contains host/port/status — never the API
key, and never will, since this repo is public: anything committed to
`docs/` is a plain publicly-fetchable URL with no auth, so a key written
there would be handed to the entire internet along with a live endpoint.
The key only ever lives in your browser's `localStorage`, which you set by
pasting it into the page yourself (once per browser — it persists after
that). Nothing you type is sent anywhere except directly to the host/port
you enter.

Once `public_expose=true`, remember: **anyone with the API key can query
the instance** (vast.ai has no IP allowlisting) and the model is
uncensored. Don't leave it running — or exposed — longer than you're
actively testing.

## Pinned versions

`llama_cpp_ref`, `huggingface_hub_version`, and `vastai_version` (terraform
variables, defaults in `terraform/variables.tf`) are pinned to specific
known-good versions rather than "master"/latest. This is deliberate: a
huggingface_hub release once removed the `huggingface-cli` command outright
(hard error, not a warning) with no notice, which broke every fresh deploy
until it was pinned. An unpinned build is a live bet that nothing upstream
changed today.

Bump them on purpose when you want newer versions — check
[llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases) (tag
format `b<N>`, cut on nearly every commit) and
[huggingface_hub releases](https://github.com/huggingface/huggingface_hub/releases)
first, then update the default in `variables.tf` (or pass `-var`) and test
with a throwaway deploy before relying on it.

## Troubleshooting

- SSH directly into the box (same host/port as `ssh_tunnel_command`, minus
  `-L`) and `tail -f /workspace/llama-server.log`, or watch the onstart
  script itself via `vastai logs <instance_id>`.
- If `llama-server` OOMs on GPU memory, lower `CTX_SIZE` (context length)
  in `terraform.tfvars`/`.env`, or scale up `NUM_GPUS`.
- If `vastai search offers` finds nothing, your `GPU_NAME`/`NUM_GPUS`
  combination may not be available right now — check
  https://cloud.vast.ai/create/ for what's currently listed, or lower
  `MIN_RELIABILITY`.
- `terraform destroy` failing to find the instance usually means it was
  already destroyed manually — delete `terraform/.vast_instance_id` and
  re-run.
- Web console shows a network/fetch error: almost always the self-signed
  cert hasn't been trusted yet for that instance — visit
  `https://<ip>:<port>/v1/models` directly first (see above). Also check
  `/workspace/caddy.log` on the instance if it persists.

## Teardown

```bash
./destroy.sh
```
