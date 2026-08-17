output "server_ip" {
  description = "Public IP of the vLLM server (only reachable from allowed_ip)"
  value       = google_compute_address.static_ip.address
}

output "api_base_url" {
  value = "http://${google_compute_address.static_ip.address}:${var.vllm_port}/v1"
}

output "ssh_command" {
  value = "gcloud compute ssh --zone ${var.zone} --project ${var.project_id} ${google_compute_instance.vllm_server.name}"
}

output "curl_example" {
  value = "curl http://${google_compute_address.static_ip.address}:${var.vllm_port}/v1/chat/completions -H 'Authorization: Bearer <VLLM_API_KEY>' -H 'Content-Type: application/json' -d '{\"model\": \"${var.hf_model_id}\", \"messages\": [{\"role\": \"user\", \"content\": \"hello\"}]}'"
}
