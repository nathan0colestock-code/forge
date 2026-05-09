---
name: forge-rollup
description: Propagate framework-wide lessons (queued by the retro agent) back to the Forge framework repo as a reviewable PR. Run on demand from any Forge app, or periodically. Never auto-merges — the user reviews and merges every framework change.
allowed-tools: Read, Write, Edit, Bash, Task, AskUserQuestion
---

# Forge Rollup

Bridge per-app lessons back to the framework so subagents keep getting better across all future apps. This is the upstream half of the feedback loop.

## When to invoke

- Manually: user runs `/forge-rollup` from inside any Forge app after a build
- Periodically: a recurring `/loop 6h /forge-rollup` if the user wants steady drip-back

## Pre-conditions

- `.forge/rollup/queue.md` exists in the current app and contains at least one queued lesson
- The Forge framework repo path is configured (default: `~/forge`; override with env var `FORGE_REPO`)
- `gh` CLI is authenticated and can push to the Forge repo

## Process

### 1. Read the queue

Open `.forge/rollup/queue.md`. Each entry is one framework-wide lesson written by the retro agent:

```markdown
## architect — <date> — <title>
**Trigger:** ...
**What to do differently:** ...
**Evidence:** ...
**Proposed change to .claude/agents/architect.md:** <if the retro agent included one>
```

If the queue is empty, exit cleanly and tell the user.

### 2. Group by target file

Group queued lessons by which framework agent or skill they target. Common targets:
- `.claude/agents/<name>.md` — agent core prompt
- `.claude/skills/<name>/SKILL.md` — skill instructions
- `PIPELINE.md` — pipeline-level changes
- `forge.config.json` — defaults (caps, thresholds)

### 3. For each target, draft a minimal edit

Read the target file. Decide whether the lesson:
- **Adds a new rule** (most common) — append to the Rules section
- **Modifies a threshold** — edit a specific number with a comment
- **Refines an existing rule** — edit the relevant bullet

**Constraints on the diff:**
- Minimal. One concept added or refined per lesson.
- Preserves the existing structure of the file. No reorganizing.
- Includes the lesson's evidence as a brief comment when non-obvious.

If a lesson is too vague to translate into a concrete edit, **skip it and tell the user** — don't make speculative changes.

### 4. Open a branch in the Forge repo

```bash
cd "$FORGE_REPO"
git fetch origin main
git checkout -b "claude/rollup-$(date +%Y%m%d-%H%M)" origin/main
```

### 5. Apply the edits

For each grouped target, apply the diff. Run any sanity checks (e.g. validate YAML frontmatter still parses).

### 6. Commit per-target

One commit per file changed, so the diff is easy to review. Commit message format:

```
forge: rollup — <agent/skill>: <one-line of what's new>

Lessons: <comma-separated lesson titles>

From <app-name> build at <date>.

🤖 https://claude.ai/code/session_<id>
```

### 7. Push and open a PR

```bash
git push -u origin <branch>
```

Use `mcp__github__create_pull_request` (or `gh pr create`) with:

- **Title:** `forge: rollup of N lessons from <app-name>`
- **Body:** a table of lessons, each linking back to the source build's `BUILD_LOG.md` reference. Include each lesson's full text and the specific framework edit.

Mark **NOT a draft**. The user reviews and merges.

### 8. Mark queue entries as rolled-up

Move `.forge/rollup/queue.md` content to `.forge/rollup/applied-<date>.md` (don't delete; useful audit trail). Reset the queue.

### 9. Print summary to user

```
✓ Forge rollup PR opened

PR: https://github.com/.../pull/N
Lessons applied: 5
Files changed: 3 (.claude/agents/{architect,coder}.md, PIPELINE.md)
Source app: <app-name>

Review and merge when ready. After merge, run `/forge-update` from any app to pull the improved framework.
```

## Rules

- **Never auto-merge.** Framework changes always go through human review.
- **One PR per rollup invocation.** Don't accumulate across runs — each run produces a discrete reviewable batch.
- **Skip lessons you can't translate cleanly.** Better to defer than to make speculative edits. Tell the user which were skipped and why.
- **Preserve the framework's tone.** The agent prompts are written in a particular voice — match it. Don't introduce hedging language ("you might want to consider"); the framework speaks directly.
- **No new files unless the lesson clearly demands one.** Most rollups are edits, not additions.
- **Idempotency.** Running rollup twice on the same queue should produce zero new edits the second time (because the first run cleared the queue).

## Failure modes

- **Forge repo not found:** ask the user for `FORGE_REPO` path, save it to `.forge/config.json` for next time.
- **Branch creation fails:** main may have moved. `git fetch && rebase` and retry.
- **PR creation fails:** check `gh auth status`. If unauthenticated, prompt for login.
- **Lesson is incoherent:** skip it, log it back to the queue under "## Skipped" with a reason, surface to the user.
