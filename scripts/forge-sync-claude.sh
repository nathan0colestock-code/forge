#!/usr/bin/env bash
# forge-sync-claude.sh — sync framework agents/skills/CLAUDE.md into an
# existing Forge app. Preserves .claude/settings.local.json.
#
# Usage:
#   ./scripts/forge-sync-claude.sh <app-dir>

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <app-dir>"
  exit 1
fi

TARGET_DIR="$1"
FORGE_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "✗ $TARGET_DIR is not a directory"
  exit 1
fi

if [[ ! -d "$TARGET_DIR/.claude" ]]; then
  echo "✗ $TARGET_DIR/.claude not found — is this a Forge app?"
  exit 1
fi

SETTINGS_LOCAL_BACKUP=""
if [[ -f "$TARGET_DIR/.claude/settings.local.json" ]]; then
  SETTINGS_LOCAL_BACKUP="$(mktemp)"
  cp "$TARGET_DIR/.claude/settings.local.json" "$SETTINGS_LOCAL_BACKUP"
fi

echo "› Syncing .claude/agents"
rm -rf "$TARGET_DIR/.claude/agents"
cp -R "$FORGE_ROOT/.claude/agents" "$TARGET_DIR/.claude/agents"

echo "› Syncing .claude/skills"
rm -rf "$TARGET_DIR/.claude/skills"
cp -R "$FORGE_ROOT/.claude/skills" "$TARGET_DIR/.claude/skills"

echo "› Syncing .claude/settings.json"
cp "$FORGE_ROOT/.claude/settings.json" "$TARGET_DIR/.claude/settings.json"

if [[ -n "$SETTINGS_LOCAL_BACKUP" ]]; then
  cp "$SETTINGS_LOCAL_BACKUP" "$TARGET_DIR/.claude/settings.local.json"
  rm "$SETTINGS_LOCAL_BACKUP"
  echo "› Restored settings.local.json"
fi

echo "› Syncing framework docs"
cp "$FORGE_ROOT/SPEC_TEMPLATE.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/PIPELINE.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/STACK.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/PRINCIPLES.md" "$TARGET_DIR/"
cp "$FORGE_ROOT/CLAUDE.md" "$TARGET_DIR/CLAUDE.framework.md"

cat <<EOF

✓ Synced framework into $TARGET_DIR

Inspected: $(ls "$TARGET_DIR/.claude/agents" | wc -l | tr -d ' ') agents, $(ls "$TARGET_DIR/.claude/skills" | wc -l | tr -d ' ') skills.
EOF
