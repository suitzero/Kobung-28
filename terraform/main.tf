locals {
  state_file = "${path.module}/.vast_instance_id"
}

resource "null_resource" "vast_instance" {
  triggers = {
    # Sensitive values here end up in tfstate (a general terraform
    # caveat, not specific to this design) — keep terraform.tfstate out
    # of git (already gitignored) and treat it as a secret.
    vast_api_key    = var.vast_api_key
    hf_repo         = var.hf_repo
    hf_file_glob    = var.hf_file_glob
    hf_token        = var.hf_token
    api_key         = var.api_key
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
      VAST_API_KEY    = var.vast_api_key
      HF_REPO         = var.hf_repo
      HF_FILE_GLOB    = var.hf_file_glob
      HF_TOKEN        = var.hf_token
      API_KEY         = var.api_key
      GPU_NAME        = var.gpu_name
      NUM_GPUS        = var.num_gpus
      MIN_RELIABILITY = var.min_reliability
      DISK_GB         = var.disk_gb
      BASE_IMAGE      = var.base_image
      LLAMA_CPP_REF   = var.llama_cpp_ref
      CTX_SIZE        = var.ctx_size
      PUBLIC_EXPOSE   = var.public_expose
      SERVER_PORT     = var.server_port
      STATE_FILE      = local.state_file
    }
  }

  provisioner "local-exec" {
    when    = destroy
    command = "${path.module}/../scripts/vast_destroy.sh"
    environment = {
      VAST_API_KEY = self.triggers.vast_api_key
      STATE_FILE   = local.state_file
    }
  }
}

data "external" "vast_status" {
  depends_on = [null_resource.vast_instance]
  program    = ["${path.module}/../scripts/vast_status.sh"]
  query = {
    vast_api_key = var.vast_api_key
    state_file   = local.state_file
    server_port  = tostring(var.server_port)
  }
}
