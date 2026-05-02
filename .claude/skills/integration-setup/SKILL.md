---
name: integration-setup
description: Provision every third-party service the Forge stack needs (Turso, Clerk, R2, Resend, Better Stack, Fly.io, GitHub) in one pass. Writes .env.local, sets Fly + GitHub secrets, verifies all connections. Re-runnable.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

# Integration Setup

Provision the full Forge stack for the current app. The goal: after this skill runs, no human has to log into a dashboard to copy a key. The app is wired and ready to build.

This skill is **re-runnable** — any service that's already configured and valid is skipped.

## Pre-conditions

- `APP_SPEC.md` exists (used to derive app name, auth providers, email needs).
- These CLIs installed (run `scripts/bootstrap.sh` first if not): `turso`, `wrangler`, `fly`, `gh`.
- The user has accounts (or is willing to create them) for: Turso, Clerk, Cloudflare, Resend, Better Stack, Fly.io, GitHub.

## Process

**Step 0: Read the spec.** Pull the app name, slugify it (lowercase, hyphens). Pull the auth providers. Pull the email-from domain (default `onboarding@resend.dev` if absent).

**Step 1: Check existing credentials.** Read `.env.local`. For each variable below, if it exists AND a quick verification call succeeds, skip that step.

**Step 2: Turso.**
```bash
turso auth login        # opens browser if not authed
turso db create <slug>
turso db show <slug> --url
turso db tokens create <slug>
```
Append to `.env.local`:
- `TURSO_DATABASE_URL=...`
- `TURSO_AUTH_TOKEN=...`

**Step 3: Clerk.** No CLI. Open `https://dashboard.clerk.com/apps/new`. Print:
> Create an app named `<app-name>`. Enable Email + these OAuth providers: <from spec>. Press Enter when done.

Then prompt (via `AskUserQuestion` or readline) for Publishable Key and Secret Key. Write:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...`
- `CLERK_SECRET_KEY=sk_...`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=<inferred from spec — first authed key screen, default /dashboard>`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=<same>`

**Step 4: Cloudflare R2.**
```bash
wrangler login                              # opens browser
wrangler r2 bucket create <slug>-storage
```
Open `https://dash.cloudflare.com/?to=/:account/r2/api-tokens`. Print:
> Create an API token with R2 Read & Write permissions. Paste the Access Key ID and Secret Access Key when ready.

Capture, then write:
- `CLOUDFLARE_ACCOUNT_ID=...`
- `CLOUDFLARE_R2_BUCKET_NAME=<slug>-storage`
- `CLOUDFLARE_R2_ACCESS_KEY_ID=...`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY=...`
- `CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`

**Step 5: Resend.** Open `https://resend.com/api-keys`. Print:
> Create an API key named `<app-name>` with Sending Access. Paste it here.

Capture, write:
- `RESEND_API_KEY=re_...`
- `RESEND_FROM_EMAIL=<from spec, default onboarding@resend.dev>`

**Step 6: Better Stack — Logs source.** Open `https://logs.betterstack.com/sources/new`. Print:
> Create a new source. Platform: HTTP. Name: `<app-name>`. Paste the Source Token AND the Telemetry API token (Settings → API tokens) here.

Capture, write:
- `BETTERSTACK_SOURCE_TOKEN=...` (used to write logs)
- `BETTERSTACK_INGEST_URL=https://in.logs.betterstack.com`
- `BETTERSTACK_API_TOKEN=...` (used by the debug agent to read logs)
- `BETTERSTACK_SOURCE_ID=...` (shown in source settings)

**Step 7: Fly.io.**
```bash
fly auth login          # opens browser
fly apps create <slug>
```
Read `.env.local`. For every non-`NEXT_PUBLIC_*` variable, run:
```bash
fly secrets set <KEY>="<value>" -a <slug>
```
Then `FLY_APP_NAME=<slug>` to `.env.local`.

**Step 8: GitHub.**
```bash
gh auth login           # opens browser
gh repo create <slug> --private --source=. --remote=origin --push
gh secret set <KEY> --body "<value>"   # for each non-PUBLIC env var
gh secret set FLY_API_TOKEN --body "$(fly auth token)"

# Create the canonical Forge labels so the issue watcher can route work.
$FORGE_REPO/scripts/forge-init-labels.sh
```

**Step 9: Verify everything.**

For each service, run a smoke check. Fail loudly on any error — print which service failed and what to retry.

```bash
# Turso
turso db shell <slug> "SELECT 1"

# Clerk (lists users; requires CLERK_SECRET_KEY)
curl -s -H "Authorization: Bearer $CLERK_SECRET_KEY" https://api.clerk.com/v1/users?limit=1

# R2
wrangler r2 bucket list | grep "<slug>-storage"

# Resend (sends a test email to a configurable address)
curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"'"$RESEND_FROM_EMAIL"'","to":"<test address>","subject":"Forge smoke","html":"<p>ok</p>"}'

# Better Stack (write + read)
curl -s -X POST $BETTERSTACK_INGEST_URL \
  -H "Authorization: Bearer $BETTERSTACK_SOURCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dt":"'"$(date -u +%FT%TZ)"'","message":"forge integration smoke","level":"info"}'
sleep 5
curl -s -G https://logs.betterstack.com/api/v2/query \
  -H "Authorization: Bearer $BETTERSTACK_API_TOKEN" \
  --data-urlencode "source_id=$BETTERSTACK_SOURCE_ID" \
  --data-urlencode "query=forge integration smoke"

# Fly
fly status -a <slug>

# GitHub
gh repo view <slug>
```

If the test-email recipient isn't already configured, ask the user once for it (and remember it in `.forge/state/test-email.txt`).

**Step 10: Write `INTEGRATION_STATUS.md`.**

```markdown
# Integration Status: <app-name>
Generated: <ISO timestamp>

| Service | Status | Notes |
|---|---|---|
| Turso | ✅ | DB: <slug> |
| Clerk | ✅ | App: <slug> |
| Cloudflare R2 | ✅ | Bucket: <slug>-storage |
| Resend | ✅ | From: <email> |
| Better Stack | ✅ | Source: <slug> |
| Fly.io | ✅ | App: <slug> |
| GitHub | ✅ | <repo URL> |

## Next step
Orchestrator proceeds to Phase 0.3: logger setup.
```

## Rules

- **Never store secrets in the repo.** `.env.local` is gitignored. CI secrets via `gh secret set`. Runtime via `fly secrets set`.
- **Re-runnable.** Skip any step whose verification passes.
- **Fail loudly on verification failures.** Print the exact service + retry command.
- **One pause per manual step.** Open the right URL, print the minimum instructions, wait.
- **Infer from spec, don't ask.** App name, auth providers, email-from, and post-auth URL all come from `APP_SPEC.md`.
