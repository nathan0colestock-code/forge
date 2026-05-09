# Forge Build Pipeline

The orchestrator (`/.claude/skills/forge-build/SKILL.md`) drives this pipeline by invoking subagents via the Task tool. The user does not interact with the pipeline once it starts.

## Phase 0 — Setup

| Step | Subagent | Output |
|---|---|---|
| 0.1 | `spec` | Validated `APP_SPEC.md`, `.forge/state/spec.json`, `.forge/state/assumptions.md` |
| 0.2 | (skill) `integration-setup` | All third-party services provisioned, `.env.local` populated, `INTEGRATION_STATUS.md` written |
| 0.3 | `logger` | `src/lib/logger.ts` finalized; logging middleware on every API route |
| 0.4 | (skill) `issue-breakdown` | `ISSUES.md` |

**Parallelism:** 0.1 → 0.2 → (0.3 ∥ 0.4). Logger setup and issue breakdown are independent.

## Phase 1 — Architecture (parallel)

| Subagent | Output |
|---|---|
| `architect` | `ARCHITECTURE.md`, scaffolded directory structure, decision log |
| `datamodel` | `drizzle/schema.ts`, initial migration, `API_CONTRACTS.md`, seed script |

The orchestrator merges outputs before Phase 2. Schema fields and architecture component names must agree; conflicts go through the spec-anchored resolver (see "Conflict resolution" below).

## Phase 2 — Design loop (iterative, exit when Visual QA score ≥ minVisualScore)

| Step | Subagent | Notes |
|---|---|---|
| 2.1 | `designer` | First pass: 3 distinct directions as working React components with realistic data, **including a brand-mark/logo concept rendered at 192px and 512px**. Subsequent passes: a single revised design integrating persona feedback. |
| 2.2 | `persona` × N **and** `visual-qa` (parallel) | Both judge the same iteration's screenshots simultaneously. Personas write to `.forge/state/persona-feedback-<slug>-<n>.md`; visual-qa writes `.forge/state/visual-qa-<n>.md`. |
| 2.3 | `designer` | Integrate combined feedback into next iteration, OR finalize if score ≥ `minVisualScore`. |

On finalization, the designer also runs `npm run icons:generate` to produce `public/icons/icon-{180,192,512,maskable-512}.png` and `public/apple-touch-icon.png` from the chosen brand mark.

Loop until score ≥ `designLoop.minVisualScore` OR iteration cap hit. **Hard floor:** if the cap is hit below `designLoop.floorVisualScore`, the build fails — orchestrator does NOT proceed to Phase 3.

## Phase 3 — Build (parallel where possible)

| Step | Subagent | Depends on | Notes |
|---|---|---|---|
| 3.1a | `coder` (UI shell) | Phase 1 + Phase 2 final design | Builds all screens + nav |
| 3.1b | `coder` (API routes) | Phase 1 datamodel | Builds all API routes + DB queries |
| 3.2 | `coder` (integration) | 3.1a + 3.1b | Wires frontend ↔ backend |
| 3.3 | `ui-polish` | 3.2 | Animations, micro-interactions, loading/empty/error states |

Tester (Phase 4.1) may begin writing per-feature tests in parallel with 3.3 once the corresponding 3.1b feature is complete.

## Phase 4 — Quality (sequential, looped)

| Step | Subagent | Notes |
|---|---|---|
| 4.1 | `tester` | Writes Playwright tests for every user story; runs them against `npm run start` (built app, not dev). Auth flows use `playwright/global-setup.ts`. |
| 4.2 | `debug` (skill: `debug-loop`) | If failures: queries Better Stack, fixes root cause, reruns |
| 4.3 | `visual-qa` | Screenshots full app on desktop/mobile/tablet; score ≥ `qualityLoop.minVisualScore` required |
| 4.4 | `accessibility-check` (skill) | WCAG 2.1 AA serious/critical violations must be 0 |
| 4.5 | `code-review` ∥ `security-review` (skills) | Read-only audits before deploy. Required findings block; suggestions don't. |

Loop until 4.1 green AND 4.3 ≥ minVisualScore AND 4.4 clean AND 4.5 has no required-fix findings, OR cap hit. **Hard floor:** below `qualityLoop.floorVisualScore` or with failing tests at cap, build fails — does NOT deploy.

## Phase 5 — Deploy

Skipped if any prior phase hit its hard floor.

| Step | Subagent | Notes |
|---|---|---|
| 5.1 | `infra` | `fly deploy`. Migrations run via `release_command` in `fly.toml`. |
| 5.2 | `visual-qa` (final, opus) | Screenshots the live URL (not localhost); records final score |
| 5.3 | `debug` | If live app shows issues local tests missed: fix and redeploy |

## Phase 6 — Retro (always runs, even on soft-failure)

| Step | Subagent | Notes |
|---|---|---|
| 6.1 | `retro` | Reads BUILD_LOG, BUGS, handoff scorecards, visual-QA + persona feedback patterns. Writes dated lessons to `.claude/agents/<name>.lessons.md` per subagent. Queues framework-wide lessons in `.forge/rollup/queue.md`. **Files GitHub issues** for concrete improvement opportunities (polish, debt, design follow-ups) with the `forge:auto` label so the watcher can pick them up post-build. |
| 6.2 | `debug`, `visual-qa`, `tester` | These also file targeted GitHub issues during their normal phases — debt the debug agent spots while fixing a primary bug, polish items keeping visual-QA below 10, and missing test coverage flagged by the tester. See `LABELS.md`. |

Phase 6 also runs after a hard floor failure — the lessons feed back into the next attempt.

## Phase 7 — Continuous improvement (post-build, ongoing)

This phase runs *outside* a single `/forge-build` invocation. Once the app is shipped, the user starts **two** loops:

```
/loop 1h  /forge-watch-logs       # surface production anomalies as issues
/loop 30m /forge-watch             # work the issue queue, opening PRs
```

| Subagent | Loop | Notes |
|---|---|---|
| `log-watcher` | every `logWatcher.intervalMin` (default 60) | Queries Better Stack for the lookback window. Infers anomalies (new error classes, error spikes, slow endpoints, broken client routes) and files GitHub issues for ones above threshold. Skips during the post-deploy quiet window. Caps at `maxIssuesPerRun` (default 3). |
| `issue-watcher` | every `watcher.intervalMin` (default 30) | Polls open GitHub issues, picks up `forge:auto`-labeled items in priority order, dispatches the labeled `forge:agent=*`, opens a PR per issue. Never auto-merges. |

The two loops compose: the log watcher *finds* runtime problems users hit (which they often don't report), turns them into issues, and the issue watcher *works* them into PRs.

**Severity routing.** The log watcher applies `forge:auto` to most anomalies but withholds it from p1 errors that touch authentication, payments, or core user stories — those go through human triage first because auto-fix is too risky.

The watcher closes the loop:

1. **Build** files improvement issues during/after Phase 6.
2. **Watcher** picks them up, spawns the right subagent on a `claude/issue-N` branch, runs tests, opens a PR.
3. **User** reviews and merges.
4. **Subagent's `.lessons.md`** absorbs anything learned during the issue work for future builds.

Pickup rules (must all be true): open, has `forge:auto`, not in-progress, not assigned to a human, has all three required labels (`forge:type=*`, `forge:agent=*`, `forge:priority=*`). Priority order: p1 > p2 > p3, oldest first.

See `LABELS.md` for the full taxonomy. Run `scripts/forge-init-labels.sh` once per app to create the labels (or let `integration-setup` do it).

The retro phase makes Forge self-improving:

- **App-specific lessons** stay in this app's `.claude/agents/` and apply to every future build of this app.
- **Framework-wide lessons** are queued for `forge-rollup`, which opens a PR back to the upstream Forge repo. You review and merge. Other apps then run `/forge-update` to absorb the improvements.

The framework's **canonical agent definitions** (`.claude/agents/<name>.md`) never auto-mutate. Lessons accumulate alongside; agents read both files on entry and apply both as guidance.

## Handoff scorecards

Every subagent, on exit, writes a short rating of its upstream inputs to `.forge/state/handoffs.md`:

```
## <ISO ts> — <upstream> → <agent>
- Clear: 1–5
- Complete: 1–5
- Actionable: 1–5
- Notes: <one line>
```

The retro agent reads these across builds to identify systemic handoff weaknesses (e.g. "the architect → datamodel handoff scored < 3/5 across 4 of the last 5 builds — the architect prompt should require the data-shape table").

## Outputs

- `APP_SPEC.md` (input — frozen after Phase 0.1)
- `.forge/state/spec.json` — structured form, read by all downstream agents
- `ARCHITECTURE.md`, `API_CONTRACTS.md`, `ISSUES.md`, `INTEGRATION_STATUS.md` (Phase 0–1)
- `BUILD_LOG.md` — every orchestrator decision, agent invocation, and conflict resolution
- `BUGS.md` — every bug found by the debug agent + the root-cause fix
- `BUILD_FAILED.md` — written instead of a live URL when a hard floor is hit
- `.claude/agents/<name>.lessons.md` — accumulated lessons per subagent (committed to the app repo)
- `.forge/state/handoffs.md` — append-only handoff scorecard
- `.forge/rollup/queue.md` — framework-wide lessons awaiting `/forge-rollup` propagation
- A live Fly.io URL printed at the end (success only)

## Conflict resolution

When two subagents produce conflicting outputs, the orchestrator:

1. Re-reads the relevant section of `APP_SPEC.md` (or `.forge/state/spec.json`).
2. Evaluates each option against the user stories + success criteria.
3. Picks the option that most directly serves the spec.
4. Logs the decision to `BUILD_LOG.md` with a **verbatim quoted span** from the spec. No quote = log entry rejected.
5. Proceeds — never pauses for human input.

## Mid-build user notes

The orchestrator polls `.forge/state/notes.md` between phases. If it's non-empty, the contents are appended to the next agent's prompt as additional spec context, then cleared. This is the only allowed user influence after Phase 0.1.

## Iteration caps + floors (defaults; override in `forge.config.json`)

```json
{
  "designLoop":   { "maxIterations": 5, "minVisualScore": 8, "floorVisualScore": 6 },
  "qualityLoop":  { "maxIterations": 5, "minVisualScore": 8, "floorVisualScore": 7, "requireAllTestsPassing": true },
  "deployLoop":   { "maxIterations": 3 },
  "wallClockMin": 0,
  "autoDeploy": true
}
```

- `minVisualScore` is the **soft target** — the loop exits early when reached.
- `floorVisualScore` is the **hard floor** — below it at cap, build fails (no deploy).
- `wallClockMin: 0` = no wall-clock cap.

Hitting a soft target = success. Hitting a cap above the floor = soft failure (logged, build continues). Hitting a cap below the floor = hard failure (build stops, `BUILD_FAILED.md` written).
