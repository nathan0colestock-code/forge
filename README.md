# Forge

A portable, Git-based agentic development system for [Claude Code](https://claude.ai/code) that turns a voice-memo brain dump into a deployed, polished progressive web app.

After you approve the spec, you don't touch anything. Forge runs the full pipeline — architecture, design, code, tests, visual QA, deploy — and prints a live URL when it's done.

## Quickstart

```bash
# 1. Clone forge once (the framework lives here)
git clone https://github.com/<you>/forge.git ~/forge

# 2. Install local deps (Claude Code, fly, gh, wrangler, turso CLIs)
~/forge/scripts/bootstrap.sh

# 3. Initialize a new app from the framework
~/forge/scripts/forge-init.sh my-app   # creates ~/forge-apps/my-app

# 4. Open it in Claude Code
cd ~/forge-apps/my-app && claude
```

In Claude Code:

```
> [paste your voice memo transcript or brain dump]
> /spec-interview
# Claude fills SPEC_TEMPLATE.md → APP_SPEC.md, asks only what it can't infer.
# Review APP_SPEC.md. Edit anything you want.

> /forge-build
# Forge runs the full pipeline. Do not touch anything.
# When it finishes it prints a live URL.
```

## What you get per app

- A Next.js 15 PWA on the canonical Forge stack (see [STACK.md](./STACK.md))
- Tailwind + shadcn/ui + Framer Motion, with a real opinionated design (not generic AI aesthetic)
- Turso + Drizzle, Clerk auth, R2 storage, Resend email — all provisioned automatically
- Playwright tests covering every user story, on desktop + mobile
- Structured JSON logging to Better Stack
- Auto-deploy to Fly.io, with a CI workflow on GitHub Actions
- A `BUILD_LOG.md`, `BUGS.md`, and `INTEGRATION_STATUS.md` capturing every decision

## The feedback loop (Forge gets better every build)

Forge is **self-improving** along three axes:

**1. Lessons (per-agent learning).** After each build, a `retro` subagent reviews `BUILD_LOG.md`, `BUGS.md`, the handoff scorecard, and visual-QA / persona-feedback patterns. It writes dated, specific lessons to:
- **App-specific lessons** in `.claude/agents/<name>.lessons.md` (this app's repo). Every future build of *this* app reads them.
- **Framework-wide lessons** queued in `.forge/rollup/queue.md`. Run `/forge-rollup` to open a PR back to the upstream Forge repo. You review and merge. Other apps run `/forge-update` to absorb the improvements.

**2. Handoff scoring.** Every subagent rates its inputs on exit (clear / complete / actionable, 1–5). The retro agent reads these across builds to spot systemic weaknesses (e.g. "architect → datamodel scored < 3 in 4 of the last 5 builds — fix the architect prompt").

**3. GitHub issue auto-improvement loop.** Two complementary loops run after deploy:

- **Issue creation** — during Phase 6 the build files improvement issues (polish items below a 10, debt the debug agent spotted, design follow-ups, missing test coverage). Separately, the **`log-watcher`** subagent queries Better Stack on `/loop 1h /forge-watch-logs`, infers anomalies in production (new error classes, error spikes, slow endpoints, broken client routes), and files matching `forge:type=bug` / `forge:type=debt` issues — turning errors users hit but didn't report into actionable work.
- **Issue execution** — `/loop 30m /forge-watch` runs the `issue-watcher`, which polls open issues, picks up `forge:auto`-tagged ones, spawns the right working agent on a `claude/issue-N` branch, runs tests, and opens a PR per issue. You review and merge.

Severity routing: the log watcher withholds `forge:auto` for p1 errors (auth, payments, core stories) so they stay in your hands. Everything else flows through automatically.

**Constraint:** canonical agent definitions (`.claude/agents/<name>.md`) never auto-mutate, and the watcher never auto-merges. Framework changes go through review (`forge-rollup` PRs); app changes go through review (issue-watcher PRs). The system accumulates experience without anyone silently rewriting it.

See `LABELS.md` for the issue label taxonomy and `PIPELINE.md` for the full Phase 6 + Phase 7 details.

## How it works

Forge is a set of [Claude Code subagents](https://docs.claude.com/claude-code/sub-agents) and skills that the orchestrator invokes via the Task tool. There is no separate Node runtime — everything runs inside one Claude Code session.

```
.claude/
├── agents/        # 13 specialized subagents (architect, coder, tester, ...)
└── skills/        # The orchestrator + 8 supporting skills
```

The orchestrator (`/.claude/skills/forge-build/SKILL.md`) reads `APP_SPEC.md` and drives the pipeline described in [PIPELINE.md](./PIPELINE.md).

## Costs

Everything in the stack is free to start except Fly.io (~$2–5/mo for one always-on app). See [STACK.md](./STACK.md) for the full ledger.

## Safety

- **Auto-deploy is on by default.** Every successful build deploys to a real Fly.io app. Disable with `forge.config.json` → `autoDeploy: false`.
- **Iteration caps.** Each loop is capped at 5 iterations and total wall-clock at 60 min. Override in `forge.config.json` if needed.
- **Secrets never leave your machine.** `.env.local` is gitignored; Fly + GitHub secrets are set via CLI.

## Repo layout

```
forge/
├── README.md                # this file
├── STACK.md                 # the canonical stack
├── PIPELINE.md              # build pipeline
├── SPEC_TEMPLATE.md         # the app spec template
├── forge.config.json        # default build limits
├── .claude/
│   ├── agents/              # subagent definitions
│   └── skills/              # skills (orchestrator + helpers)
├── templates/
│   └── app/                 # the Next.js PWA scaffold
└── scripts/
    ├── bootstrap.sh         # install local CLIs
    ├── forge-init.sh        # bootstrap a new app from the framework
    ├── forge-init-labels.sh # create forge:* labels in the app's GH repo
    ├── deploy.sh            # fly deploy helper
    └── screenshot.sh        # playwright screenshot helper
```

## License

MIT.
