# CobraAgent — Scheduled/triggered AI runner
# Built by OnyxAi
#
# The "Zero Limits Hack": use GitHub Actions as a free runner.
# - Public repos: UNLIMITED free minutes
# - Private repos: 2,000 free minutes/month
#
# Configure via agent-config.json (download from the CobraAgent /agent page
# after deploying). No GitHub secrets required — the provider config lives
# in the deployed app's database.
#
# Trigger modes:
#   1. Cron schedule (hourly by default)
#   2. repository_dispatch webhook (instant trigger via GitHub API)
#   3. Manual via workflow_dispatch (Actions tab → Run workflow)

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None  # Only needed for standalone mode


def load_config():
    """Load agent-config.json from the repo root."""
    config_path = os.environ.get("COBRA_CONFIG_PATH", "agent-config.json")
    if not os.path.exists(config_path):
        print(f"ERROR: {config_path} not found.", file=sys.stderr)
        print("Download it from the CobraAgent /agent page and commit it to the repo.", file=sys.stderr)
        sys.exit(1)
    with open(config_path) as f:
        return json.load(f)


def run_standalone(config):
    """Run the agent locally using the openai SDK (provider config in the file)."""
    if OpenAI is None:
        print("ERROR: openai package not installed. Run: pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    base_url = config.get("baseUrl")
    api_key = config.get("apiKey", "")
    model = config.get("model", "gpt-4o-mini")
    prompt = config.get("prompt", "You are CobraAgent, built by OnyxAi. Be concise.")

    if not base_url:
        print("ERROR: baseUrl missing in agent-config.json", file=sys.stderr)
        sys.exit(1)

    print(f"[CobraAgent] Standalone mode at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    print(f"[CobraAgent] Provider: {base_url}", file=sys.stderr)
    print(f"[CobraAgent] Model:    {model}", file=sys.stderr)

    client = OpenAI(base_url=base_url, api_key=api_key)
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are CobraAgent, built by OnyxAi. Be concise and structured."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=800,
        )
        output = resp.choices[0].message.content or ""
    except Exception as e:
        result = {
            "status": "failed",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        print("=== COBRA_AGENT_RESULT ===")
        print(json.dumps(result, indent=2))
        with open("agent-output.json", "w") as f:
            json.dump(result, f, indent=2)
        sys.exit(2)

    result = {
        "status": "success",
        "model": model,
        "prompt": prompt[:200],
        "output_preview": output[:500],
        "output_full_chars": len(output),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    print("=== COBRA_AGENT_RESULT ===")
    print(json.dumps(result, indent=2))
    with open("agent-output.json", "w") as f:
        json.dump(result, f, indent=2)
    return 0


def run_webhook(config):
    """Trigger the deployed CobraAgent web app via webhook. No secrets needed —
    the provider config lives server-side in the app."""
    webhook_url = config.get("webhookUrl")
    if not webhook_url:
        print("ERROR: webhookUrl missing in agent-config.json", file=sys.stderr)
        print("Download agent-config.json from the /agent page after configuring the agent.", file=sys.stderr)
        sys.exit(1)

    token = config.get("webhookToken", "")
    override_prompt = config.get("overridePrompt")

    print(f"[CobraAgent] Webhook mode at {datetime.now(timezone.utc).isoformat()}", file=sys.stderr)
    print(f"[CobraAgent] Webhook URL: {webhook_url}", file=sys.stderr)

    headers = {"Content-Type": "application/json"}
    if token:
        headers["X-Agent-Token"] = token
    if override_prompt:
        headers["X-Agent-Prompt"] = override_prompt

    data = json.dumps({}).encode("utf-8")
    req = urllib.request.Request(webhook_url, data=data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = resp.read().decode("utf-8")
            print("=== COBRA_AGENT_RESULT ===")
            print(body)
            result = json.loads(body)
            with open("agent-output.json", "w") as f:
                json.dump(result, f, indent=2)
            return 0 if result.get("run", {}).get("status") != "failed" else 1
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"ERROR: webhook returned HTTP {e.code}: {body}", file=sys.stderr)
        result = {
            "status": "failed",
            "error": f"HTTP {e.code}: {body[:500]}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        with open("agent-output.json", "w") as f:
            json.dump(result, f, indent=2)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="CobraAgent runner — built by OnyxAi")
    parser.add_argument(
        "--webhook",
        action="store_true",
        help="Trigger the deployed CobraAgent web app via webhook",
    )
    args = parser.parse_args()

    config = load_config()

    if args.webhook or config.get("webhookUrl"):
        return run_webhook(config)
    return run_standalone(config)


if __name__ == "__main__":
    sys.exit(main())
