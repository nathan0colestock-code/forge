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
2. `APP_SPEC.md` has no surviving `[ASSUMED: ...]` flags.
3. `APP_SPEC.md` has no empty required sections (One-Sentence Purpose, Target Users, Core User Stories, Brand & App Icon, Success Criteria).
4. `forge.config.json` exists.
5. `.env.local` exists (if not, run integration setup first).
6. `.forge/state/spec.json` exists (the spec agent should have produced it).

If any check fails, stop and tell the user exactly what to do.

## Print the assumption checklist

Read `.forge/state/assumptions.md` if it exists. Print every bullet to the user before starting:

```
The spec agent assumed the following defaults. They look reasonable, but you can edit APP_SPEC.md before saying "go" again to override:

  - Brand color: warm coral (#FF6B5C) — defaulted because transcript was silent
  - …

Proceeding in 3 seconds. Press Ctrl-C to abort.
```

Then proceed.

## Resume vs. restart

If `.forge/state/phase.json` exists at start, ask the user (one question via `AskUserQuestion`) with three options:
- **Resume** from where it stopped
- **Restart** from scratch (archives existing state to `.forge/state/archive-<ts>/`)
- **Show status first**, then re-ask

If they choose "Show status first", print:
- Last completed phase
- Last loop iteration + score
- Hard failures, if any (`BUILD_FAILED.md` excerpt)
- Re-ask resume/restart.

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
Spec: APP_SPEC.md (structured form: .forge/state/spec.json)
Config: forge.config.json
Resume mode: <resume | restart>

Run the full pipeline as defined in PIPELINE.md and your agent definition. Do not ask the user any questions. When done, write a summary to BUILD_LOG.md and print the live URL OR write BUILD_FAILED.md if a hard floor was hit.

Honor:
- Spec sovereignty (re-anchor to APP_SPEC.md when conflicts arise; verbatim quote required in BUILD_LOG.md)
- Loop caps + hard floors from forge.config.json
- Mid-build user notes in .forge/state/notes.md (poll between phases)
- Auto-deploy = <value of autoDeploy>
- All subagent definitions in .claude/agents/

Begin with Phase 0.1 (spec validation pass) and proceed.
```

## After the orchestrator returns

Read its summary. Print to the user:

- Live URL (if successful)
- Final visual QA score
- Test pass count
- Total iterations across all loops
- Any soft failures (cap hits above floor)
- Any hard failures (cap hits below floor → no deploy)
- Path to `BUILD_LOG.md`
- Path to `BUILD_FAILED.md` (if applicable)
- **Lessons written** (count, from Phase 6 retro) and **rollup queue size** (framework-wide lessons awaiting upstream PR)
- A reminder: `/forge-rollup` to PR framework-wide lessons back to the forge repo; `/loop 1h /forge-watch-logs` and `/loop 30m /forge-watch` to start the Phase 7 continuous-improvement loops

If the orchestrator soft-failed, tell the user:
- Which phase(s) capped out
- The current state in `.forge/state/`
- How to resume: re-run `/forge-build` and choose "Resume"

If the orchestrator hard-failed, tell the user:
- Why the build refused to deploy (e.g. visual score below floor)
- What to fix in `APP_SPEC.md` (often: tighten Brand & App Icon or Design Vibe)
- Then re-run `/forge-build` to resume from the failed phase
