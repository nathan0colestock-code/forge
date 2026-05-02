---
name: forge-build
description: Run the full Forge build pipeline from APP_SPEC.md to a deployed live URL. Invoke when the user says "go", "build it", "ship it", or runs /forge-build. Reads APP_SPEC.md and forge.config.json, then drives the orchestrator subagent through Phases 0–5.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion
---

# Forge Build

Drive the full build pipeline. The user has approved `APP_SPEC.md` and now wants Forge to take over.

## Pre-flight checks

Before delegating to the orchestrator, verify:

1. `APP_SPEC.md` exists at the project root.
2. `APP_SPEC.md` has no surviving `[ASSUMED: ...]` flags (they should have been resolved during spec interview).
3. `APP_SPEC.md` has no empty required sections (One-Sentence Purpose, Target Users, Core User Stories, Success Criteria).
4. `forge.config.json` exists.
5. `.env.local` exists (if not, run integration setup first).

If any check fails, stop and tell the user exactly what to do.

## Invoking the orchestrator

Spawn the orchestrator subagent with the Task tool:

```
Task(
  subagent_type="orchestrator",
  description="Build app per APP_SPEC.md",
  prompt=<see prompt template below>
)
```

### Prompt template

```
You are the Forge orchestrator. The user has approved APP_SPEC.md and is no longer available.

Project root: <pwd>
Spec: APP_SPEC.md
Config: forge.config.json

Run the full pipeline as defined in PIPELINE.md and your agent definition. Do not ask the user any questions. When done, write a summary to BUILD_LOG.md and print the live URL.

Honor:
- Spec sovereignty (re-anchor to APP_SPEC.md when conflicts arise)
- Loop caps from forge.config.json (soft failures only — log and proceed)
- Auto-deploy = <value of autoDeploy>
- All subagent definitions in .claude/agents/

Begin with Phase 0.1 (spec validation pass) and proceed.
```

## After the orchestrator returns

Read its summary. Print to the user:

- Live URL
- Final visual QA score
- Test pass count
- Total iterations across all loops
- Any soft failures (cap hits)
- Path to `BUILD_LOG.md`
- **Lessons written** (count) and **rollup queue size** (framework-wide lessons awaiting upstream PR)
- A reminder: `/forge-rollup` to PR framework-wide lessons back to the forge repo

If the orchestrator soft-failed, tell the user:
- Which phase(s) capped out
- The current state in `.forge/state/`
- How to resume: re-run `/forge-build` and choose "resume"

## Resuming a previous run

If `.forge/state/phase.json` exists at start, ask the user (one question via `AskUserQuestion`):

> A previous build was interrupted at phase X (iteration Y). Resume from where it left off, or restart from scratch?

Pass the answer through to the orchestrator as part of the prompt.
