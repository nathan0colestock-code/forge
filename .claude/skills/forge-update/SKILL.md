---
name: forge-update
description: Pull the latest Forge framework improvements (merged rollup PRs) into the current app. Updates .claude/agents/, .claude/skills/, and shared config files; preserves the app's lessons files and per-app customizations.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

# Forge Update

Refresh this app's `.claude/` framework files from the upstream Forge repo.

## When to invoke

- After merging a `forge-rollup` PR upstream
- Periodically: `/loop 24h /forge-update` if you want apps to track framework improvements
- Before starting a new feature build, to ensure you're on the latest agent definitions

## Process

1. **Locate the Forge repo.** Default `~/forge`; override with env var `FORGE_REPO` or `.forge/config.json` → `forgeRepo`. If not found, ask the user once and persist.

2. **Fetch latest main.**
   ```bash
   cd "$FORGE_REPO" && git fetch origin main && git checkout main && git pull --ff-only
   ```

3. **Compute diff vs current `.claude/`.** For each file in `$FORGE_REPO/.claude/`:
   - If missing in app `.claude/`: add it (after diff preview).
   - If present and identical: skip.
   - If present and different: this is a real update.

4. **Preserve per-app artifacts.** Never overwrite or delete:
   - `.claude/agents/*.lessons.md`
   - `.claude/settings.local.json`
   - Anything under `.forge/` (the app's state directory)

5. **Show the user a summary, not the full diff.** Number of files changing, names, lines added/removed. If they confirm, apply.

6. **Apply.** Copy new framework files into the app's `.claude/`. Use `cp` with explicit paths — no `rm -rf` of the whole directory.

7. **Validate.** After copy:
   - Run `claude --validate-agents` if available
   - Otherwise `grep -l '^---' .claude/agents/*.md` to confirm frontmatter intact
   - Lint any JSON files (`forge.config.json` etc) with `python -m json.tool`

8. **Commit.** A single commit in the app repo:
   ```
   forge: update framework to <forge-sha-short>
   
   Files changed: <list>
   Source: <forge repo URL>@<sha>
   ```

9. **Print summary** with what changed and a reminder: lessons files were preserved; subagents will read both the new core prompts AND the app-specific lessons next build.

## Rules

- **Confirm before apply.** Even though Forge is "you don't touch anything during a build", framework updates can change behavior — show the diff summary and require confirmation.
- **Never overwrite lessons.** Lessons are app-private learning. Framework updates change the *baseline*; lessons layer on top.
- **No partial applies.** Either apply all framework changes atomically (one commit) or none. Avoids weird in-between states.
- **No silent updates during a build.** If `forge-update` is somehow invoked mid-build, refuse and tell the user to finish the current build first.

## Failure modes

- **Forge repo path unknown:** prompt once, save to `.forge/config.json`.
- **Local uncommitted changes in app:** stash first, apply, then surface the stash to the user (don't auto-restore — they should review).
- **Lessons file conflicts** (theoretical — should never happen since framework doesn't ship lessons): keep the app's version, skip the framework's.
- **Agent definition validation fails after copy:** revert the commit, surface the broken file.
