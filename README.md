# Forge

**Forge turns a brain dump into a deployed, polished progressive web app.** Paste a voice memo, approve the spec, walk away. Forge runs the whole pipeline — architecture, design, code, tests, visual QA, deploy — and prints a live URL.

It's a set of [Claude Code](https://claude.ai/code) subagents and skills. No separate runtime. Open it in Claude Code and you're done.

## Get it

Paste this into Claude Code:

```
Clone https://github.com/nathan0colestock-code/forge into ~/forge, run
~/forge/scripts/bootstrap.sh, and tell me what to do next.
```

## Use it

Open Claude Code in any directory and paste:

```
Read ~/forge/README.md and ~/forge/PIPELINE.md, then walk me through
building my first Forge app. I'll describe what I want to build; you
ask whatever you need to fill out the spec, then run /forge-build.
```

That's the whole interface. Claude handles the rest.

## What you get per app

- A Next.js 15 PWA on the canonical Forge stack ([STACK.md](./STACK.md))
- Opinionated design + a real iPhone home-screen icon (180/192/512/maskable)
- Auth (Clerk), DB (Turso/Drizzle), storage (R2), email (Resend), logs (Better Stack), deploy (Fly.io) — all provisioned for you
- Playwright tests covering every user story, on desktop + mobile
- CI on GitHub Actions; auto-deploy on merge to `main`
- Hard quality floors (visual + a11y + tests) — bad builds refuse to ship
- A `BUILD_LOG.md` capturing every decision, and `.lessons.md` files that make Forge get better with every build you ship

## How it works

[PIPELINE.md](./PIPELINE.md) shows the full Phase 0–7 flow. The orchestrator agent reads `APP_SPEC.md` and drives every step. Quality gates between phases. Two ongoing loops after deploy: a log watcher that turns production anomalies into GitHub issues, and an issue watcher that opens PRs that fix them.

## Costs

Free to start except Fly.io (~$2–5/mo for one always-on app). See [STACK.md](./STACK.md).

## Safety

- **`.env.local` is gitignored.** Secrets go to Fly Secrets and GitHub Secrets via CLI, never into the repo.
- **This repo is public** — `./scripts/safe-to-publish.sh` scans for accidentally-committed credentials before every push.
- **Watchers never auto-merge.** Every change flows through a PR you approve.

## License

MIT.
