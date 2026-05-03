# App — Claude Code Onboarding

You are working inside a Forge-generated app. The framework's rules and pipeline are documented in:

- `PIPELINE.md` — build phases, parallelism, loops
- `STACK.md` — canonical stack (Next.js 15, Tailwind, Drizzle/Turso, Clerk, R2, Resend, Better Stack, Fly.io, Playwright)
- `SPEC_TEMPLATE.md` — spec structure
- `APP_SPEC.md` — **THIS APP'S** spec (after `/spec-interview`)
- `.forge/state/spec.json` — structured form of the spec, prefer reading this
- `forge.config.json` — caps, floors, model assignments

## Hard rules

1. **Read `APP_SPEC.md` before writing code.** Quote it when resolving conflicts.
2. **Every API route wraps in `src/lib/api-handler.ts`.** No bare exports.
3. **Every env var lives in `src/lib/env.ts`** (zod-validated at build time).
4. **Logging never blocks.** Use `log()` from `src/lib/logger.ts` — it queues and flushes async.
5. **No `any` / `@ts-ignore` / unjustified `as` casts.**
6. **No `console.log` outside `src/lib/logger.ts`.**
7. **Authed routes must call `auth()` from Clerk.**
8. **Tests live in `playwright/`.** Auth flows use the Clerk test user from `playwright/global-setup.ts`.
9. **App icon is mandatory.** `public/icons/icon-{180,192,512,maskable-512}.png` and `public/apple-touch-icon.png` must exist and look professional when added to an iPhone home screen. Generate with `npm run icons:generate`.

## How agents pass work

Shared state goes in `.forge/state/`. Don't read random files — read the ones the orchestrator points you to.

## How to read logs

```
curl -G "https://logs.betterstack.com/api/v2/query" \
  -H "Authorization: Bearer $BETTERSTACK_API_TOKEN" \
  --data-urlencode "source_id=$BETTERSTACK_SOURCE_ID" \
  --data-urlencode 'query=requestId:"<id>"'
```

## When in doubt

`/forge-build` from the framework's orchestrator drives the whole pipeline. Don't reach inside it manually unless an agent definition tells you to.
