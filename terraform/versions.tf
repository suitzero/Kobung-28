terraform {
  required_version = ">= 1.5"

  required_providers {
    external = {
      source  = "hashicorp/external"
      version = "~> 2.3"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# There is no maintained official Terraform provider for vast.ai (the one
# community provider on the registry, aalekhpatel07/vastai, has been
# unmaintained for years and doesn't cover instance search/rent). Instead
# this wraps the official `vastai` CLI (actively maintained, pip install
# vastai) with local-exec provisioners, giving `terraform apply` /
# `terraform destroy` ergonomics backed by a tool that's actually kept up
# to date with vast.ai's API.
