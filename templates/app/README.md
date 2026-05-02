# __APP_NAME__

Built with [Forge](https://github.com/<you>/forge). Don't edit this file by hand — `forge-init` regenerates it.

## Local development

```bash
npm install
npx playwright install --with-deps chromium
cp .env.example .env.local      # then fill in (or run integration-setup)
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Visit http://localhost:3000.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | tsc --noEmit |
| `npm run test` | Playwright (all viewports) |
| `npm run test:a11y` | Accessibility audit |
| `npm run db:generate` | Generate Drizzle migration from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed local data |
| `npm run db:studio` | Drizzle Studio |
| `npm run screenshot` | Capture all key screens to .forge/state/screenshots/ |

## Stack

See the root `STACK.md` of the Forge framework. This project sits on Next.js 15, Tailwind, shadcn/ui, Framer Motion, Drizzle + Turso, Clerk, R2, Resend, Better Stack, and Fly.io.

## How to read logs

The `log()` helper in `src/lib/logger.ts` ships JSON to Better Stack via HTTP source ingest. Every API route logs request/response/error via `src/lib/api-handler.ts`.

To query:
- **Live tail:** Better Stack dashboard → Sources → `__APP_NAME__` → Live tail
- **Programmatic:** the debug agent uses the Telemetry API with `BETTERSTACK_API_TOKEN`

Common queries:

```
event:"api.request" status:>=500
event:"client.event" route:"/dashboard"
requestId:"<id>"
```

## Deployment

CI deploys on push to `main` after lint/typecheck/test pass. To deploy manually:

```bash
fly deploy --remote-only
```

Migrations run automatically as a `release_command` before traffic flips.
