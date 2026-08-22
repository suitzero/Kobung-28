locals {
  state_file = "${path.module}/.vast_instance_id"
}

resource "null_resource" "vast_instance" {
  # Deliberately excludes secrets (vast_api_key, hf_token, api_key): this
  # map is a real tracked attribute and ends up in tfstate verbatim.
  # Secrets are passed to the provisioners only via `environment` (which
  # is config, not stored state) or inherited from the calling shell's
  # environment — never through triggers.
  triggers = {
    hf_repo         = var.hf_repo
    hf_file_glob    = var.hf_file_glob
    gpu_name        = var.gpu_name
    num_gpus        = var.num_gpus
    min_reliability = var.min_reliability
    disk_gb         = var.disk_gb
    base_image      = var.base_image
    llama_cpp_ref   = var.llama_cpp_ref
    ctx_size        = var.ctx_size
    public_expose   = var.public_expose
    server_port     = var.server_port
  }

  provisioner "local-exec" {
    command = "${path.module}/../scripts/vast_deploy.sh"
    environment = {
      VAST_API_KEY          = var.vast_api_key
      HF_REPO               = var.hf_repo
      HF_FILE_GLOB          = var.hf_file_glob
      HF_TOKEN              = var.hf_token
      API_KEY               = var.api_key
      GPU_NAME              = var.gpu_name
      NUM_GPUS              = var.num_gpus
      MIN_RELIABILITY       = var.min_reliability
      DISK_GB               = var.disk_gb
      BASE_IMAGE            = var.base_image
      LLAMA_CPP_REF         = var.llama_cpp_ref
      CTX_SIZE              = var.ctx_size
      PUBLIC_EXPOSE         = var.public_expose
      SERVER_PORT           = var.server_port
      AUTO_SHUTDOWN_MINUTES = var.auto_shutdown_minutes
      STATE_FILE            = local.state_file
    }
  }

  # No `environment` block needed here: VAST_API_KEY isn't in triggers (see
  # above), so it isn't available via `self`. destroy-time local-exec still
  # inherits it from whatever shell invoked `terraform destroy` — deploy.sh
  # / destroy.sh / the GitHub Actions workflow all export it before calling
  # terraform, same as any other child process would inherit it.
  provisioner "local-exec" {
    when    = destroy
    command = "${path.module}/../scripts/vast_destroy.sh"
    environment = {
      STATE_FILE = local.state_file
    }
  }
}

data "external" "vast_status" {
  depends_on = [null_resource.vast_instance]
  program    = ["${path.module}/../scripts/vast_status.sh"]
  # VAST_API_KEY intentionally omitted from query (query args are stored in
  # state); vast_status.sh reads it from its inherited process environment.
  query = {
    state_file  = local.state_file
    server_port = tostring(var.server_port)
  }
}
