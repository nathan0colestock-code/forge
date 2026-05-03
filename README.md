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
- A **professional brand mark + iPhone home-screen icon** generated from the chosen direction (180, 192, 512, maskable 512, plus apple-touch-icon)
- Turso + Drizzle, Clerk auth, R2 storage, Resend email — all provisioned automatically
- Build-time env validation (zod) so missing secrets fail the build, not the first request
- Playwright tests covering every user story, on desktop + mobile, run against the **built** app
- Authed flows pre-wired with a Clerk test user via `playwright/global-setup.ts`
- Non-blocking, batched, retrying structured JSON logging to Better Stack
- Auto-deploy to Fly.io, with a CI workflow on GitHub Actions (caches + parallel jobs)
- Quality gates: visual QA score, a11y serious/critical = 0, code-review + security-review before deploy
- A `BUILD_LOG.md`, `BUGS.md`, `INTEGRATION_STATUS.md`, and `BUILD_FAILED.md` (only when a hard floor is hit) capturing every decision

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
    ├── deploy.sh            # fly deploy helper
    └── screenshot.sh        # playwright screenshot helper
```

## License

MIT.
