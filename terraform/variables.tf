variable "project_id" {
  description = "GCP project ID to deploy into"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone (must have capacity/quota for the chosen machine_type)"
  type        = string
  default     = "us-central1-a"
}

variable "allowed_ip" {
  description = "CIDR (e.g. 1.2.3.4/32) allowed to reach SSH and the vLLM API. Keep this to your own IP."
  type        = string
}

variable "machine_type" {
  description = "GCE machine type. A2 ultragpu family bundles A100 80GB GPUs (1g/2g/4g/8g = GPU count). A3 highgpu family bundles H100 80GB GPUs."
  type        = string
  default     = "a2-ultragpu-8g"
}

variable "tensor_parallel_size" {
  description = "vLLM --tensor-parallel-size. Must match the GPU count implied by machine_type."
  type        = number
  default     = 8
}

variable "use_spot" {
  description = "Use Spot (preemptible) pricing. Much cheaper, but the VM can be reclaimed and will NOT auto-restart itself."
  type        = bool
  default     = true
}

variable "boot_disk_size_gb" {
  description = "Boot disk size. Needs room for the model weights (~300GB+ for a 284B-param checkpoint) plus the vLLM container image."
  type        = number
  default     = 1024
}

variable "boot_disk_type" {
  type    = string
  default = "pd-ssd"
}

variable "boot_image" {
  description = "Boot image. Defaults to a GCP Deep Learning VM image (drivers/Docker/NVIDIA toolkit preinstalled). Verify the family still exists before deploying: gcloud compute images list --project deeplearning-platform-release --filter=\"family~common-cu\""
  type        = string
  default     = "projects/deeplearning-platform-release/global/images/family/common-cu123-debian-11-py310"
}

variable "hf_model_id" {
  description = "Hugging Face model repo to serve"
  type        = string
  default     = "cebeuq/DeepSeek-V4-Flash-0731-abliterated"
}

variable "hf_token" {
  description = "Hugging Face access token (needs read access to the model repo)"
  type        = string
  sensitive   = true
}

variable "api_key" {
  description = "Bearer API key clients must present to query the vLLM server"
  type        = string
  sensitive   = true
}

variable "vllm_port" {
  type    = number
  default = 8000
}

variable "max_model_len" {
  description = "vLLM --max-model-len (context length). Lower this if you hit GPU memory limits."
  type        = number
  default     = 8192
}

variable "auto_shutdown_minutes" {
  description = "Safety net: the VM shuts itself down after this many minutes so an idle multi-GPU instance can't rack up cost unattended. Set to 0 to disable."
  type        = number
  default     = 720
}
