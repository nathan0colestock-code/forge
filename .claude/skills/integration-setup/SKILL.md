---
name: integration-setup
description: Provision every third-party service the Forge stack needs (Turso, Clerk, R2, Resend, Better Stack, Fly.io, GitHub) in one pass. Writes .env.local, sets Fly + GitHub secrets, verifies all connections. Re-runnable.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

# Integration Setup

Provision the full Forge stack for the current app. Goal: after this skill runs, no human has to log into a dashboard to copy a key. The app is wired and ready to build.

This skill is **re-runnable + crash-safe**. Per-step progress is persisted to `.forge/state/integration-progress.json` so a re-run skips completed steps.

## Pre-conditions

- `APP_SPEC.md` and `.forge/state/spec.json` exist.
- These CLIs installed (run `scripts/bootstrap.sh` first if not): `turso`, `wrangler`, `fly`, `gh`.
- The user has accounts for: Turso, Clerk, Cloudflare, Resend, Better Stack, Fly.io, GitHub.

## Idempotent .env.local writer

Every value written goes through this helper (inline it once at the top of the run):

```bash
upsert_env() {
  local key="$1" val="$2" file="${3:-.env.local}"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    sed -i.bak -E "s|^${key}=.*|${key}=${val//|/\\|}|" "$file"
    rm -f "${file}.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$file"
  fi
}
```

Never use `>>` directly to add a key — re-runs will duplicate.

## Progress file

```json
{
  "turso": "done",
  "clerk": "done",
  "r2": "pending",
  "resend": "pending",
  "betterstack": "pending",
  "fly": "pending",
  "github": "pending",
  "verify": "pending"
}
```

Update after each step. On start, read it and skip any step marked `done`.

## Process

**Step 0: Read the spec.** Pull `slug`, auth providers, brand info, email-from domain (default `onboarding@resend.dev` if absent) from `.forge/state/spec.json`.

**Step 1: Existing credentials.** Read `.env.local`. For each variable, if it exists AND a quick verification call succeeds, mark that service `done` in progress.json.

**Step 2: Print all dashboard URLs the user will need, up-front.** This is the one batched-question moment. Print:

```
Open these tabs now (you'll paste keys in one batch at the end):
  Clerk:        https://dashboard.clerk.com/apps/new
  R2 tokens:    https://dash.cloudflare.com/?to=/:account/r2/api-tokens
  Resend:       https://resend.com/api-keys
  Better Stack: https://logs.betterstack.com/sources/new
                https://logs.betterstack.com/team/api-tokens
```

**Step 3: Turso (CLI, no manual step).**
```bash
turso auth login
turso db create <slug>
turso db show <slug> --url
turso db tokens create <slug>
```
Then `upsert_env TURSO_DATABASE_URL ...` and `upsert_env TURSO_AUTH_TOKEN ...`.

**Step 4: Cloudflare R2 (CLI part, no manual step yet).**
```bash
wrangler login
wrangler r2 bucket create <slug>-storage
```

**Step 5: Fly.io (CLI, no manual step).**
```bash
fly auth login
fly apps create <slug>
```
`upsert_env FLY_APP_NAME <slug>`.

**Step 6: GitHub (CLI, no manual step).**
```bash
gh auth login
gh repo create <slug> --private --source=. --remote=origin --push
```

**Step 7: Single batched question.** Use `AskUserQuestion` with one prompt that collects:
- Clerk Publishable Key
- Clerk Secret Key
- R2 Access Key ID + Secret Access Key + Account ID
- Resend API Key
- Better Stack Source Token + Source ID + API Token

Then `upsert_env` each. Compute the after-sign-in URL from `spec.json.keyScreens[0].route` (default `/dashboard`).

**Step 8: Push secrets to Fly + GitHub.** For every non-`NEXT_PUBLIC_*` key in `.env.local`:
```bash
fly secrets set <KEY>="<value>" -a <slug>
gh secret set <KEY> --body "<value>"
```
Plus:
```bash
gh secret set FLY_API_TOKEN --body "$(fly auth token)"
```

**Step 9: Verify everything.**

```bash
# Turso
turso db shell <slug> "SELECT 1"

# Clerk
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CLERK_SECRET_KEY" https://api.clerk.com/v1/users?limit=1
# Expect 200

# R2
wrangler r2 bucket list | grep "<slug>-storage"

# Resend — verify API key, NOT send a real email (the default from-domain
# can't email arbitrary recipients). Use the keys list endpoint:
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/api-keys
# Expect 200

# Better Stack write + read
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

If a check fails, write `.forge/state/integration-failure.md` with the exact retry command and stop. Do NOT mark `verify: done` until all pass.

**Step 10: Write `INTEGRATION_STATUS.md`.**

```markdown
# Integration Status: <app-name>
Generated: <ISO timestamp>

| Service | Status | Notes |
|---|---|---|
| Turso | ✅ | DB: <slug> |
| Clerk | ✅ | App: <slug> |
| Cloudflare R2 | ✅ | Bucket: <slug>-storage |
| Resend | ✅ | From: <email> (key verified, no test send) |
| Better Stack | ✅ | Source: <slug> |
| Fly.io | ✅ | App: <slug> |
| GitHub | ✅ | <repo URL> |

## Next step
Orchestrator proceeds to Phase 0.3: logger setup.
```

## Rules

- **Never store secrets in the repo.** `.env.local` is gitignored. CI secrets via `gh secret set`. Runtime via `fly secrets set`.
- **Re-runnable.** Skip any step whose progress.json marker is `done` AND verification still passes.
- **Idempotent env writes.** Always `upsert_env`, never `>>`.
- **Fail loudly on verification failures.** Write to `.forge/state/integration-failure.md` and stop.
- **One batched question** for all manual paste steps. Don't drip questions.
- **No real email sends as smoke checks.** The default Resend from-domain rejects most recipients; key-verification endpoint is enough.
- **Infer from spec, don't ask.** App name, auth providers, email-from, and post-auth URL come from `.forge/state/spec.json`.
