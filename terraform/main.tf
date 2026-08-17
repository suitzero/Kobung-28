locals {
  services = [
    "compute.googleapis.com",
    "secretmanager.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# --- Networking -------------------------------------------------------

resource "google_compute_network" "vpc" {
  name                    = "deepseek-vllm-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "deepseek-vllm-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

resource "google_compute_firewall" "allow_ssh" {
  name          = "deepseek-vllm-allow-ssh"
  network       = google_compute_network.vpc.id
  direction     = "INGRESS"
  source_ranges = [var.allowed_ip]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_compute_firewall" "allow_vllm_api" {
  name          = "deepseek-vllm-allow-api"
  network       = google_compute_network.vpc.id
  direction     = "INGRESS"
  source_ranges = [var.allowed_ip]

  allow {
    protocol = "tcp"
    ports    = [tostring(var.vllm_port)]
  }
}

resource "google_compute_address" "static_ip" {
  name   = "deepseek-vllm-ip"
  region = var.region
}

# --- Identity & secrets -------------------------------------------------

resource "google_service_account" "vllm_sa" {
  account_id   = "deepseek-vllm-server"
  display_name = "DeepSeek vLLM server"
}

resource "google_secret_manager_secret" "hf_token" {
  secret_id = "deepseek-vllm-hf-token"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "hf_token" {
  secret      = google_secret_manager_secret.hf_token.id
  secret_data = var.hf_token
}

resource "google_secret_manager_secret" "api_key" {
  secret_id = "deepseek-vllm-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.api_key
}

resource "google_secret_manager_secret_iam_member" "hf_token_access" {
  secret_id = google_secret_manager_secret.hf_token.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.vllm_sa.email}"
}

resource "google_secret_manager_secret_iam_member" "api_key_access" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.vllm_sa.email}"
}

# --- GPU server -----------------------------------------------------------

resource "google_compute_instance" "vllm_server" {
  name         = "deepseek-vllm-server"
  machine_type = var.machine_type
  zone         = var.zone

  # GPU instances cannot live-migrate.
  scheduling {
    on_host_maintenance = "TERMINATE"
    automatic_restart   = var.use_spot ? false : true
    preemptible         = var.use_spot
    provisioning_model  = var.use_spot ? "SPOT" : "STANDARD"
  }

  boot_disk {
    initialize_params {
      # Deep Learning VM image: ships with NVIDIA drivers, Docker and the
      # NVIDIA container toolkit preinstalled so the startup script doesn't
      # have to build any of that from scratch. Family names shift with CUDA
      # versions over time — verify with:
      #   gcloud compute images list --project deeplearning-platform-release --filter="family~common-cu"
      image   = var.boot_image
      size_gb = var.boot_disk_size_gb
      type    = var.boot_disk_type
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.subnet.id
    access_config {
      nat_ip = google_compute_address.static_ip.address
    }
  }

  service_account {
    email  = google_service_account.vllm_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = templatefile("${path.module}/../scripts/startup.sh.tpl", {
    project_id            = var.project_id
    hf_token_secret       = google_secret_manager_secret.hf_token.secret_id
    api_key_secret        = google_secret_manager_secret.api_key.secret_id
    hf_model_id           = var.hf_model_id
    vllm_port             = var.vllm_port
    tensor_parallel_size  = var.tensor_parallel_size
    max_model_len         = var.max_model_len
    auto_shutdown_minutes = var.auto_shutdown_minutes
  })

  depends_on = [
    google_secret_manager_secret_version.hf_token,
    google_secret_manager_secret_version.api_key,
  ]
}
