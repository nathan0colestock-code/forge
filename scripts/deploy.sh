#!/usr/bin/env bash
# deploy.sh — deploy the current app to Fly.io.
# Run from inside an app directory created by forge-init.
#
# Usage: deploy.sh [--domain myapp.yourdomain.com]

set -euo pipefail

DOMAIN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="$2"
      shift 2
      ;;
    *)
      echo "✗ Unknown argument: $1"
      echo "Usage: deploy.sh [--domain myapp.yourdomain.com]"
      exit 1
      ;;
  esac
done

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

FLY_URL="https://$(grep -E '^app\s*=' fly.toml | head -1 | sed -E 's/.*"([^"]+)".*/\1/').fly.dev"
echo
echo "✓ Deployed: $FLY_URL"

if [[ -n "$DOMAIN" ]]; then
  echo
  echo "› Registering TLS certificate for $DOMAIN"
  if "$FLY" certs show "$DOMAIN" &>/dev/null; then
    echo "  Certificate already exists for $DOMAIN"
  else
    "$FLY" certs create "$DOMAIN"
  fi

  echo
  echo "  Next: add a DNS record at your registrar:"
  echo "    CNAME  $(echo "$DOMAIN" | cut -d. -f1)  →  $(echo "$FLY_URL" | sed 's|https://||')"
  echo
  echo "  Then verify with: fly certs show $DOMAIN"
  echo "  Live at: https://$DOMAIN  (after DNS propagates)"
fi
