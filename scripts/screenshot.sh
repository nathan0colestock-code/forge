#!/usr/bin/env bash
# screenshot.sh — wrapper around the per-app screenshot helper.
# Used by the visual-score skill outside of test runs.
#
# Usage:
#   ./scripts/screenshot.sh <base-url> <out-dir>
# Example:
#   ./scripts/screenshot.sh http://localhost:3000 .forge/state/screenshots/3

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
OUT_DIR="${2:-.forge/state/screenshots/manual}"
ITER="$(basename "$OUT_DIR")"

if [[ ! -f scripts/screenshot.ts ]]; then
  echo "✗ No scripts/screenshot.ts in $(pwd). Are you in an app directory?"
  exit 1
fi

mkdir -p "$OUT_DIR"
PLAYWRIGHT_BASE_URL="$BASE_URL" npx tsx scripts/screenshot.ts "$ITER" "$BASE_URL"
echo "✓ Screenshots written to $OUT_DIR/{desktop,mobile,tablet}/"
