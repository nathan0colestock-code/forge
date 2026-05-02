---
name: forge-watch
description: One run of the GitHub-issue watcher loop. Polls the app's open issues, picks up `forge:auto` items, dispatches subagents, opens PRs. Run on demand or set up as a recurring task with `/loop 30m /forge-watch`.
allowed-tools: Read, Write, Edit, Bash, Task, AskUserQuestion
---

# Forge Watch

Run a single iteration of the issue-watcher. Use `/loop 30m /forge-watch` for continuous auto-improvement.

## When to invoke

- **One-shot:** user runs `/forge-watch` after a build to clear the queue once.
- **Recurring:** `/loop 30m /forge-watch` (or another interval) to keep the app continuously improving in the background.

## Pre-conditions

1. Current dir is a Forge app repo with `git remote get-url origin` returning a GitHub URL.
2. `gh` CLI is authenticated (`gh auth status`). If not, surface and stop.
3. Repo has `forge:*` labels installed. If not, suggest `scripts/forge-init-labels.sh` and stop.
4. `forge.config.json` → `watcher.enabled` is not `false`.

## Process

1. Spawn the `issue-watcher` subagent:

```
Task(
  subagent_type="issue-watcher",
  description="Watcher run",
  prompt="Run one full pass: scan open GitHub issues, pick up eligible forge:auto items, dispatch subagents, open PRs. Honor caps from forge.config.json. Project root: <pwd>."
)
```

2. Print the watcher's summary verbatim to the user.

3. If running under `/loop`, just exit — the harness re-invokes us. If one-shot, suggest:

> Run `/loop 30m /forge-watch` to keep this running in the background, or invoke again manually.

## Failure modes

- `gh` not authed → instruct user to run `gh auth login`.
- Repo missing forge labels → instruct user to run `scripts/forge-init-labels.sh`.
- Watcher returns blocker → relay verbatim to user; don't try to fix.
