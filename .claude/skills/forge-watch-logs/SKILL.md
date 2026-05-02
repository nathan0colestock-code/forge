---
name: forge-watch-logs
description: One run of the production log watcher. Queries Better Stack for the last interval, infers anomalies, files GitHub issues for new error classes, latency regressions, and broken client routes. Pair with `/loop 1h /forge-watch-logs` for continuous coverage post-deploy.
allowed-tools: Read, Write, Edit, Bash, Task
---

# Forge Watch Logs

Run a single log-watcher pass against Better Stack. Use `/loop 1h /forge-watch-logs` for continuous post-deploy monitoring.

## When to invoke

- **One-shot:** user runs `/forge-watch-logs` to scan the last interval and clear the queue once.
- **Recurring:** `/loop 1h /forge-watch-logs` (or another interval matching `forge.config.json` → `logWatcher.intervalMin`) to continuously surface production issues as the watcher catches them.

## Pre-conditions

1. Current directory is a Forge app repo with a deployed Fly.io app.
2. `.env.local` contains `BETTERSTACK_API_TOKEN` and `BETTERSTACK_SOURCE_ID`.
3. `gh` CLI is authenticated.
4. Repo has Forge labels installed (`scripts/forge-init-labels.sh`).
5. `forge.config.json` → `logWatcher.enabled` is not `false`.

If any pre-condition fails, surface it and exit cleanly.

## Process

1. Source `.env.local` so `BETTERSTACK_*` are available.
2. Spawn the `log-watcher` subagent:

```
Task(
  subagent_type="log-watcher",
  description="Production log watcher run",
  prompt="Run one full pass per your agent definition: query Better Stack for the lookback window, infer anomalies, file GitHub issues for ones above thresholds. Honor caps from forge.config.json → logWatcher. Project root: <pwd>."
)
```

3. Print the watcher's summary verbatim.

4. If running under `/loop`, exit and let the harness re-invoke. If one-shot, suggest:

> Run `/loop 1h /forge-watch-logs` to keep monitoring continuously.

## Pairing with the issue watcher

The log-watcher *files* issues; the `issue-watcher` (run via `/forge-watch`) *works* them. For full continuous improvement, run both loops in parallel:

```
/loop 1h /forge-watch-logs       # surface production anomalies as issues
/loop 30m /forge-watch            # work the issue queue, opening PRs
```

Issues filed with `forge:auto` get picked up automatically; p1 errors (auth, payments, core stories) get filed without `forge:auto` so you triage first.

## Failure modes

- **No `BETTERSTACK_API_TOKEN`:** instruct user to verify `.env.local` against `.env.example`.
- **Rate limit (429):** exit cleanly; the `/loop` will retry on next interval.
- **Empty Better Stack source:** if logs have been silent for >24h, log-watcher files an `forge:type=infra` "logs appear down" issue itself.
