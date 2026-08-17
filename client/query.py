#!/usr/bin/env python3
"""Query the self-hosted vLLM server.

Usage:
    VLLM_HOST=<ip> VLLM_API_KEY=<key> python3 query.py "your prompt here"
"""
import os
import sys

from openai import OpenAI

def main() -> None:
    host = os.environ.get("VLLM_HOST")
    if not host:
        sys.exit("set VLLM_HOST to the server's IP (see `terraform output server_ip`)")
    api_key = os.environ.get("VLLM_API_KEY")
    if not api_key:
        sys.exit("set VLLM_API_KEY to the key you configured in .env")

    port = os.environ.get("VLLM_PORT", "8000")
    model = os.environ.get("VLLM_MODEL", "cebeuq/DeepSeek-V4-Flash-0731-abliterated")
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Hello!"

    client = OpenAI(base_url=f"http://{host}:{port}/v1", api_key=api_key)

    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            print(delta, end="", flush=True)
    print()

if __name__ == "__main__":
    main()
