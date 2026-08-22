#!/usr/bin/env python3
"""Query the self-hosted llama.cpp server.

Usage:
    LLAMA_HOST=localhost LLAMA_API_KEY=<key> python3 query.py "your prompt here"

Defaults to localhost:8000, which is where the API lands after running the
`ssh_tunnel_command` terraform output (the default, private access mode).
"""
import os
import sys

from openai import OpenAI

def main() -> None:
    host = os.environ.get("LLAMA_HOST", "localhost")
    api_key = os.environ.get("LLAMA_API_KEY")
    if not api_key:
        sys.exit("set LLAMA_API_KEY to the key you configured in .env")

    port = os.environ.get("LLAMA_PORT", "8000")
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Hello!"

    client = OpenAI(base_url=f"http://{host}:{port}/v1", api_key=api_key)

    stream = client.chat.completions.create(
        # llama-server serves whichever single model it was started with,
        # so this value is ignored — kept for OpenAI-client compatibility.
        model="local",
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
