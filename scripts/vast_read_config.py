#!/usr/bin/env python3
"""Reads null_resource.vast_instance's triggers back out of terraform state
(via `terraform show -json`, piped in on stdin) and prints them as
KEY=value lines suitable for appending to $GITHUB_OUTPUT.

Used by start.yml so a resumed instance is refreshed with the exact same
hf_repo/gpu_name/public_expose/etc. it was originally deployed with —
passing different values (e.g. workflow input defaults) would make
terraform think the resource's config changed and try to replace it.
"""
import json
import sys

data = json.load(sys.stdin)
resources = data.get("values", {}).get("root_module", {}).get("resources", [])
match = [r for r in resources if r["address"] == "null_resource.vast_instance"]
if not match:
    sys.exit("null_resource.vast_instance not found in terraform state - deploy first")

triggers = match[0]["values"]["triggers"]
keys = [
    "hf_repo", "hf_file_glob", "gpu_name", "num_gpus", "min_reliability",
    "disk_gb", "base_image", "llama_cpp_ref", "huggingface_hub_version",
    "vastai_version", "ctx_size", "public_expose", "server_port", "https_port",
]
for key in keys:
    print(f"{key}={triggers[key]}")
