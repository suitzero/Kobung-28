output "instance_status" {
  value = data.external.vast_status.result.status
}

output "public_ip" {
  description = "Only meaningful when public_expose = true"
  value       = data.external.vast_status.result.public_ip
}

output "public_port" {
  description = "Host-mapped HTTPS port (Caddy, self-signed cert). Only meaningful when public_expose = true"
  value       = data.external.vast_status.result.public_port
}

output "ssh_host" {
  value = data.external.vast_status.result.ssh_host
}

output "ssh_port" {
  value = data.external.vast_status.result.ssh_port
}

output "ssh_tunnel_command" {
  description = "Run this, then the API is reachable at http://localhost:8000/v1"
  value       = "ssh -p ${data.external.vast_status.result.ssh_port} root@${data.external.vast_status.result.ssh_host} -L ${var.server_port}:localhost:${var.server_port}"
}

output "api_base_url" {
  value = var.public_expose ? "https://${data.external.vast_status.result.public_ip}:${data.external.vast_status.result.public_port}/v1" : "http://localhost:${var.server_port}/v1 (after running ssh_tunnel_command)"
}

output "web_console_url" {
  description = "GitHub Pages console URL query params (host/port prefilled). Only meaningful when public_expose = true — the console needs a public https endpoint, since a browser can't use an SSH tunnel."
  value       = var.public_expose ? "https://${data.external.vast_status.result.public_ip}:${data.external.vast_status.result.public_port}" : ""
}
