# Forge — Claude Code Onboarding

This file is read by Claude Code at the start of every session. It points every agent at the framework rules so they don't have to reconstruct context from scratch.

## What this repo is

Forge is a Claude Code agent system (subagents + skills) that turns an `APP_SPEC.md` into a deployed Next.js PWA. It is **not** a Node app. Nothing here runs at runtime — everything lives in `.claude/agents/`, `.claude/skills/`, `templates/app/`, and `scripts/`.

## Where the truth lives

| Question | Read |
|---|---|
| What principles guide every decision? | `PRINCIPLES.md` |
| What's the build pipeline? | `PIPELINE.md` |
| What's the canonical stack? | `STACK.md` |
| What does the spec look like? | `SPEC_TEMPLATE.md` |
| What are the iteration caps / floors? | `forge.config.json` |
| What's the current app's spec? | `APP_SPEC.md` (project root, after Phase 0.1) |
| Pre-processed spec for agents | `.forge/state/spec.json` (after Phase 0.1) |
| Open questions surfaced by spec agent | `.forge/state/assumptions.md` |
| Mid-build user notes | `.forge/state/notes.md` (orchestrator polls between phases) |
| Hard-won integration lessons (Clerk, Fly, etc.) | `docs/clerk-integration.md` |

## Read before working

Every agent, on entry, reads (in order): its own `.claude/agents/<name>.md` definition, this `CLAUDE.md`, and `PRINCIPLES.md`. The principles document is short on purpose — read it every time, don't try to remember it.

## Hard rules (every agent)

1. **The spec is sovereign.** Re-anchor every decision to `APP_SPEC.md` (or `.forge/state/spec.json`). Conflict resolutions must include a verbatim quoted span from the spec.
2. **No `console.log`** outside `src/lib/logger.ts`. Use the structured logger.
3. **No `any`, no `@ts-ignore`, no `as` casts** without a comment justifying them.
4. **Every API route uses `src/lib/api-handler.ts`.** Never bare-export a `POST`/`GET`.
5. **Every authed route calls `auth()` from Clerk** and rejects unauthenticated requests.
6. **No hardcoded secrets.** Validated env vars live in `src/lib/env.ts`.
7. **Logging never blocks the response.** Use the queue/buffer in `logger.ts`.
8. **Quality floor is hard.** If a loop hits its cap below `floorVisualScore` or with failing tests, the build fails — it does NOT deploy.
9. **Comments explain WHY, not WHAT.** Default to no comments.
10. **App icon is a deliverable, not an afterthought.** Every Forge app ships professional iPhone-quality home-screen icons (180, 192, 512, maskable 512) generated from the chosen brand mark.
11. **This repo is public.** Every commit must be safe to publish. Before staging anything, sanity-check that you are NOT committing: API keys, OAuth tokens, JWTs, Clerk/Resend/Turso/R2/Fly/Better Stack/GitHub credentials, `.env`/`.env.local`, private keys (`*.pem`/`*.key`), `settings.local.json`, customer data, real user emails, or internal hostnames. `.env.example` is the only env file allowed in the repo, and it must contain placeholders only. If integration-setup or any agent ever wants to write a real value into a tracked file, that's a bug — write to `.env.local` (gitignored) or use `gh secret set` / `fly secrets set`.

## Forbidden

- Adding libraries outside the canonical stack (see `STACK.md`) without orchestrator approval logged in `BUILD_LOG.md`.
- Pausing for user input mid-build. After spec approval, the only allowed user prompt is the resume/restart question on a re-run.
- Suppressing errors with bare `try/catch { return }`. Caught errors must be logged.

## Per-agent definitions

Each subagent's rules + I/O are in `.claude/agents/<name>.md`. Read your own definition every time you're invoked — it's authoritative for your scope.

## Per-skill workflows

Skills (the orchestrator + 8 helpers) are in `.claude/skills/<name>/SKILL.md`. They're invoked by name (`/forge-build`, `/spec-interview`, etc.).
