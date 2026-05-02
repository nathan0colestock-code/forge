# Forge Canonical Stack

Every app built by Forge uses this stack. Not configurable per project — consistency is a feature.

| Layer | Choice | Free tier | Why |
|---|---|---|---|
| Framework | Next.js 15 (App Router) | OSS | PWA, SSR, API routes, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | OSS | Fast, themeable, real components |
| Animations | Framer Motion | OSS | Production motion + layout animations |
| Language | TypeScript (strict) | OSS | Forces correctness across agents |
| DB | Turso (LibSQL) | 5GB, 500M reads/mo | SQLite, edge, no cold starts |
| ORM | Drizzle | OSS | Type-safe, light, perfect with Turso |
| Auth | Clerk | 50k MAU | Drop-in, Next.js App Router-native |
| Storage | Cloudflare R2 | 10GB, zero egress | S3-compatible, no egress costs |
| Email | Resend | 3k/mo (100/day) | Dev-first, React Email |
| Deploy | Fly.io | ~$2–5/mo | Docker, global edge, no lock-in |
| PWA | next-pwa | OSS | Service worker, offline, installable |
| Tests | Playwright | OSS | Desktop + mobile, screenshots |
| Logs | Better Stack (Logs) | 1GB/day | Structured JSON, queryable |
| CI | GitHub Actions | 2000 min/mo | Lint, type, test, deploy on merge |

## Notes

- **Logging:** v1 ships a thin `log()` helper that POSTs JSON to Better Stack's HTTP source. OpenTelemetry was considered and dropped — it adds a lot of surface area in Next.js (especially edge) for the same agent-readable contract.
- **Better Stack query auth:** the debug agent reads logs via Better Stack's Telemetry API, which uses a separate **API token** (not the source token). Both are provisioned by `integration-setup`.
- **Resend `from` domain:** if your spec doesn't list a domain, Forge defaults to `onboarding@resend.dev` (Resend's no-DNS sandbox). Sufficient for testing, not for production volume.
- **Fly.io minimum:** one shared-cpu-1x machine with auto-stop costs ~$2/mo. With auto-stop disabled (always-on), ~$5/mo.
