variable "vast_api_key" {
  description = "vast.ai API key (https://cloud.vast.ai/manage-keys/)"
  type        = string
  sensitive   = true
}

variable "hf_repo" {
  description = "Hugging Face repo holding the pre-quantized GGUF weights to serve"
  type        = string
  default     = "apetersson/DeepSeek-V4-Flash-0731-Abliterated-DS4-Quality128"
}

variable "hf_file_glob" {
  description = "Glob passed to `huggingface-cli download --include` to select which files to pull from hf_repo"
  type        = string
  default     = "*.gguf"
}

variable "hf_token" {
  description = "Optional Hugging Face token, only needed if hf_repo is gated"
  type        = string
  sensitive   = true
  default     = ""
}

variable "api_key" {
  description = "Bearer API key clients must present to query llama-server"
  type        = string
  sensitive   = true
}

variable "gpu_name" {
  description = "vast.ai gpu_name filter, e.g. A100_SXM4, H100_SXM, RTX_4090. Must total enough VRAM for the chosen quant (~110GB for the default DS4-Quality128 model) plus headroom for KV cache."
  type        = string
  default     = "A100_SXM4"
}

variable "num_gpus" {
  description = "Number of GPUs to rent (must match gpu_name's availability on vast.ai)"
  type        = number
  default     = 2
}

variable "min_reliability" {
  description = "Minimum vast.ai host reliability score (0-1) to consider when searching offers"
  type        = number
  default     = 0.95
}

variable "disk_gb" {
  description = "Disk space to rent, needs to hold the GGUF model (~110GB+ for the default) plus the llama.cpp build"
  type        = number
  default     = 200
}

variable "base_image" {
  description = "Docker image the vast.ai instance boots from. Needs apt + a C++ toolchain; llama.cpp is built from source inside onstart."
  type        = string
  default     = "nvidia/cuda:12.4.1-devel-ubuntu22.04"
}

variable "llama_cpp_ref" {
  description = "git ref (branch/tag) of ggml-org/llama.cpp to build"
  type        = string
  default     = "master"
}

variable "ctx_size" {
  description = "llama-server --ctx-size (context length)"
  type        = number
  default     = 8192
}

variable "public_expose" {
  description = "If true, maps the API port to a public vast.ai host port (still gated by api_key). If false (default), the server only binds inside the instance and is reachable solely via SSH port-forward — recommended for a private, personal-use endpoint."
  type        = bool
  default     = false
}

variable "server_port" {
  type    = number
  default = 8000
}
