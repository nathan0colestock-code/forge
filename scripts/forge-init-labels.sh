#!/usr/bin/env bash
# forge-init-labels.sh — create the canonical forge:* labels in a GitHub repo.
# Run once per app, after `gh repo create`. Idempotent: re-runs are safe.
#
# Usage:
#   ./scripts/forge-init-labels.sh                  # current repo (from `gh repo view`)
#   ./scripts/forge-init-labels.sh owner/repo       # explicit
#   FORGE_REPO=owner/repo ./scripts/forge-init-labels.sh

set -euo pipefail

if ! command -v gh >/dev/null; then
  echo "✗ gh CLI not installed. Run forge/scripts/bootstrap.sh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "✗ gh not authenticated. Run: gh auth login"
  exit 1
fi

REPO="${1:-${FORGE_REPO:-}}"
if [[ -z "$REPO" ]]; then
  REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
fi
if [[ -z "$REPO" ]]; then
  echo "✗ Could not determine repo. Pass owner/repo as arg or run inside the app dir."
  exit 1
fi

echo "› Creating Forge labels in $REPO"

# label name | color hex (no #) | description
LABELS=(
  "forge:auto|6f42c1|Authorize automatic pickup by the issue watcher"
  "forge:in-progress|fbca04|Watcher has dispatched a subagent to work on this"
  "forge:pr-open|0e8a16|A PR has been opened that closes this issue"
  "forge:blocked|d93f0b|Watcher attempted but couldn't make progress"

  "forge:type=bug|d73a4a|A defect — something is broken"
  "forge:type=feature|0075ca|A new capability not yet built"
  "forge:type=polish|c2e0c6|Visual or UX refinement"
  "forge:type=debt|fef2c0|Code quality, refactor, or test coverage"
  "forge:type=design|c5def5|Design direction or token revision"
  "forge:type=infra|bfdadc|Deploy, CI, or environment work"

  "forge:agent=coder|1d76db|Routes to the coder subagent"
  "forge:agent=designer|5319e7|Routes to the designer subagent"
  "forge:agent=ui-polish|b60205|Routes to the ui-polish subagent"
  "forge:agent=tester|0e8a16|Routes to the tester subagent"
  "forge:agent=debug|d93f0b|Routes to the debug subagent"
  "forge:agent=infra|c5def5|Routes to the infra subagent"

  "forge:priority=p1|b60205|Blocks normal use"
  "forge:priority=p2|d93f0b|Important but not blocking"
  "forge:priority=p3|fbca04|Nice to have"
)

created=0
skipped=0
for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<< "$entry"
  # gh label create returns non-zero if exists; use --force to upsert
  if gh label create "$name" --color "$color" --description "$desc" --repo "$REPO" --force >/dev/null 2>&1; then
    created=$((created+1))
    echo "  ✓ $name"
  else
    skipped=$((skipped+1))
  fi
done

echo
echo "✓ Forge labels ready: $created upserted, $skipped skipped"
echo "  Forge agents will now use these labels when filing improvement issues."
echo "  Set up the watcher: /loop 30m /forge-watch"
