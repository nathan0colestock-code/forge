#!/usr/bin/env bash
# forge-init.sh — bootstrap a new Forge app from this framework.
#
# Usage:
#   ./scripts/forge-init.sh <app-name> [target-parent-dir]
#
# Creates a self-contained app at <target-parent-dir>/<app-name>:
#   - Copies templates/app/* to the app root
#   - Copies .claude/ (agents, skills, settings) so Claude Code knows the agents
#   - Copies SPEC_TEMPLATE.md, PIPELINE.md, STACK.md, forge.config.json
#   - Inits a fresh git repo
#
# Default target-parent-dir is ../ (sibling to forge).

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <app-name> [target-parent-dir]"
  exit 1
fi

APP_NAME="$1"
TARGET_PARENT="${2:-$(cd "$(dirname "$0")/../.." && pwd)}"
SLUG="$(echo "$APP_NAME" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9-')"
TARGET_DIR="$TARGET_PARENT/$SLUG"

if [[ -e "$TARGET_DIR" ]]; then
  echo "Error: $TARGET_DIR already exists"
  exit 1
fi

FORGE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "› Creating $TARGET_DIR"
mkdir -p "$TARGET_DIR"

echo "› Copying app template"
cp -R "$FORGE_ROOT/templates/app/." "$TARGET_DIR/"

echo "› Copying .claude (agents + skills + settings)"
cp -R "$FORGE_ROOT/.claude" "$TARGET_DIR/.claude"

echo "› Copying framework docs (read-only references)"
cp "$FORGE_ROOT/SPEC_TEMPLATE.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/PIPELINE.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/STACK.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/forge.config.json" "$TARGET_DIR/"

echo "› Personalizing project name"
# package.json name
if command -v node >/dev/null; then
  node -e "
    const fs=require('fs');const p='$TARGET_DIR/package.json';
    const pkg=JSON.parse(fs.readFileSync(p,'utf8'));
    pkg.name='$SLUG';
    fs.writeFileSync(p,JSON.stringify(pkg,null,2)+'\n');
  "
fi
# fly.toml + README placeholders
sed -i.bak "s/__APP_NAME__/$SLUG/g" "$TARGET_DIR/fly.toml" "$TARGET_DIR/README.md" 2>/dev/null || true
rm -f "$TARGET_DIR/fly.toml.bak" "$TARGET_DIR/README.md.bak"

echo "› Initializing git"
( cd "$TARGET_DIR" && git init -q && git add -A && git commit -q -m "forge: initial scaffold for $SLUG" )

# ── Propagate developer profile to new app repo ──────────────────────────────
# Source: FORGE_DEVELOPER_PROFILE env var, or ~/.forge/credentials.json, or
#         FORGE_DEVELOPER_PROFILE GitHub secret on the forge framework repo.
PROFILE_VALUE=""
if [[ -n "${FORGE_DEVELOPER_PROFILE:-}" ]]; then
  PROFILE_VALUE="$FORGE_DEVELOPER_PROFILE"
elif [[ -f "$HOME/.forge/credentials.json" ]]; then
  PROFILE_VALUE="$(base64 < "$HOME/.forge/credentials.json" | tr -d '\n')"
fi

if [[ -n "$PROFILE_VALUE" ]] && command -v gh >/dev/null 2>&1; then
  # Create the GitHub repo and set the secret on it
  echo "› Creating GitHub repo and pushing"
  ( cd "$TARGET_DIR" \
    && gh repo create "$SLUG" --private --source=. --remote=origin --push -q 2>/dev/null \
    && gh secret set FORGE_DEVELOPER_PROFILE --body "$PROFILE_VALUE" \
    && echo "  ✓ FORGE_DEVELOPER_PROFILE secret set on github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)" \
  ) || echo "  ⚠ GitHub push skipped (run 'gh repo create' manually if needed)"
else
  echo "  ℹ️  No developer profile found — run /forge-secrets after opening Claude Code"
fi

cat <<EOF

✓ Forge app initialized: $TARGET_DIR

Next:
  cd "$TARGET_DIR"
  claude
    > [paste your voice memo or brain dump]
    > /spec-interview
    # …review APP_SPEC.md…
    > /forge-build

EOF
