#!/usr/bin/env bash
# deploy.sh — deploy the current app to Fly.io.
# Run from inside an app directory created by forge-init.

set -euo pipefail

if [[ ! -f fly.toml ]]; then
  echo "✗ No fly.toml in $(pwd). Are you in an app directory?"
  exit 1
fi

if ! command -v fly >/dev/null && ! command -v flyctl >/dev/null; then
  echo "✗ Fly CLI not installed. Run forge/scripts/bootstrap.sh"
  exit 1
fi

FLY="$(command -v fly || command -v flyctl)"

echo "› Building and deploying via Fly.io (remote builder)"
"$FLY" deploy --remote-only

echo "› Tailing logs for 30s"
timeout 30 "$FLY" logs || true

URL="https://$(grep -E '^app\s*=' fly.toml | head -1 | sed -E 's/.*"([^"]+)".*/\1/').fly.dev"
echo
echo "✓ Deployed: $URL"
