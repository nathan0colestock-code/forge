# Forge Build Pipeline

The orchestrator (`/.claude/skills/forge-build/SKILL.md`) drives this pipeline by invoking subagents via the Task tool. The user does not interact with the pipeline once it starts.

## Phase 0 — Setup (sequential)

| Step | Subagent | Output |
|---|---|---|
| 0.1 | `spec` | Validated `APP_SPEC.md` |
| 0.2 | (skill) `integration-setup` | All third-party services provisioned, `.env.local` populated, `INTEGRATION_STATUS.md` written |
| 0.3 | `logger` | `src/lib/logger.ts` wired to Better Stack; logging middleware on every API route |
| 0.4 | (skill) `issue-breakdown` | `ISSUES.md` |

## Phase 1 — Architecture (parallel)

| Subagent | Output |
|---|---|
| `architect` | `ARCHITECTURE.md`, scaffolded directory structure, decision log |
| `datamodel` | `drizzle/schema.ts`, initial migration, `API_CONTRACTS.md`, seed script |

The orchestrator merges outputs before Phase 2. Schema fields and architecture component names must agree; conflicts go through the spec-anchored resolver.

## Phase 2 — Design loop (iterative, exit when Visual QA score ≥ 8)

| Step | Subagent | Notes |
|---|---|---|
| 2.1 | `designer` | First pass: 3 distinct directions as working React components with realistic data. Subsequent passes: a single revised design integrating persona feedback. |
| 2.2 | `persona` × N (parallel) | One persona per Target User in spec. Each instantiated with a persona prompt; provides structured feedback on the designs. |
| 2.3 | `designer` | Integrate feedback, produce revised design |
| 2.4 | `visual-qa` (skill: `visual-score`) | Screenshot the candidate, score 0–10 |

Loop until score ≥ 8 OR iteration cap (default 5) hit. If cap hit, the orchestrator surfaces the last design + score and proceeds anyway, logging the failure.

## Phase 3 — Build (parallel where possible)

| Step | Subagent | Depends on | Notes |
|---|---|---|---|
| 3.1a | `coder` (UI shell) | Phase 1 + Phase 2 final design | Builds all screens + nav |
| 3.1b | `coder` (API routes) | Phase 1 datamodel | Builds all API routes + DB queries |
| 3.2 | `coder` (integration) | 3.1a + 3.1b | Wires frontend ↔ backend |
| 3.3 | `ui-polish` | 3.2 | Animations, micro-interactions, loading/empty/error states |

## Phase 4 — Quality (sequential, looped)

| Step | Subagent | Notes |
|---|---|---|
| 4.1 | `tester` | Writes Playwright tests for every user story; runs them against `npm run dev` |
| 4.2 | `debug` (skill: `debug-loop`) | If failures: queries Better Stack, fixes root cause, reruns |
| 4.3 | `visual-qa` | Screenshots full app on desktop/mobile/tablet; score ≥ 8 required |

Loop until 4.1 green AND 4.3 ≥ 8, or cap hit.

## Phase 5 — Deploy

| Step | Subagent | Notes |
|---|---|---|
| 5.1 | `infra` | `fly deploy`. Migrations run via `release_command` in `fly.toml`. |
| 5.2 | `visual-qa` | Screenshots the live URL (not localhost); records final score |
| 5.3 | `debug` | If live app shows issues local tests missed: fix and redeploy |

## Outputs

- `APP_SPEC.md` (input — frozen after Phase 0.1)
- `ARCHITECTURE.md`, `API_CONTRACTS.md`, `ISSUES.md`, `INTEGRATION_STATUS.md` (Phase 0–1)
- `BUILD_LOG.md` — every orchestrator decision, agent invocation, and conflict resolution
- `BUGS.md` — every bug found by the debug agent + the root-cause fix
- A live Fly.io URL printed at the end

## Conflict resolution

When two subagents produce conflicting outputs, the orchestrator:

1. Re-reads the relevant section of `APP_SPEC.md`
2. Evaluates each option against the user stories + success criteria
3. Picks the option that most directly serves the spec
4. Logs the decision + rationale to `BUILD_LOG.md`
5. Proceeds — never pauses for human input

## Iteration caps (defaults; override in `forge.config.json`)

```json
{
  "designLoop":   { "maxIterations": 5 },
  "qualityLoop":  { "maxIterations": 5 },
  "deployLoop":   { "maxIterations": 3 },
  "wallClockMin": 0,
  "autoDeploy": true
}
```

`wallClockMin: 0` means no wall-clock cap — the orchestrator runs as long as it needs. Only per-loop iteration caps apply.

Hitting a cap is a soft failure: the orchestrator logs the state and proceeds to the next phase with whatever it has. The user can rerun later with `--continue` to pick up.
