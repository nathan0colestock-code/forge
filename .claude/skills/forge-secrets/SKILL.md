---
name: forge-secrets
description: Zero-touch secret provisioning for Forge apps. Generates a secrets bundle on first run (interactive), then applies it to .env.local, Fly, and GitHub — works in cloud environments (CI, Codespaces) with no browser OAuth flows.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

# Forge Secrets

Provision or refresh every secret the canonical Forge stack needs — without any `*auth login` browser flows. Works on a fresh local clone, a GitHub Codespace, or a CI runner.

## Two modes

**Generate mode** (no bundle exists): Walk through each service interactively, collect the tokens, write a `secrets.bundle.json`, and apply it.

**Apply mode** (bundle already exists): Read the bundle from `--bundle <path>` or `FORGE_SECRETS_BUNDLE` env var, validate, and apply via `scripts/forge-secrets.sh`.

---

## Generate mode (interactive)

Run this once per app to create the bundle. After that, apply mode is the norm.

**Step 0: Detect mode.**
- If `FORGE_SECRETS_BUNDLE` is set or `--bundle <path>` was passed → jump to Apply mode.
- If `CI=true` or `FORGE_NONINTERACTIVE=true` is set AND no bundle → error loudly:
  ```
  ✗ Non-interactive environment detected but no bundle provided.
  Set FORGE_SECRETS_BUNDLE to a file path or base64-encoded JSON, or pass --bundle.
  Generate a bundle first on a developer machine: /forge-secrets (no --bundle flag).
  ```

**Step 1: Derive app slug.** Read `APP_SPEC.md` (first `# heading`). Slugify. If no `APP_SPEC.md`, ask for the app name.

**Step 2: Turso.**
```
Open: https://turso.tech/app/databases/new
Create a database named <slug>.
Paste the Database URL (libsql://…) and an Auth Token from "Create token".
```
Collect `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.

**Step 3: Clerk.**
```
Open: https://dashboard.clerk.com/apps/new
Create an app named <slug>. Enable Email/Password + any OAuth from the spec.
Under "API Keys", copy the Publishable Key (pk_…) and Secret Key (sk_…).
```
Collect `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

**Step 4: Cloudflare R2.** (Skip if spec has no file-storage requirement.)
```
Open: https://dash.cloudflare.com → R2 → Create bucket → name: <slug>-storage
Open: Account → R2 → Manage R2 API tokens → Create API token (R2 Read & Write)
Paste: Account ID, Access Key ID, Secret Access Key.
```
Collect `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_BUCKET_NAME=<slug>-storage`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`.
Compute `CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`.

**Step 5: Resend.** (Skip if spec has no email requirement.)
```
Open: https://resend.com/api-keys
Create a key named <slug> with Sending Access.
Paste the API key (re_…).
```
Collect `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (from spec, default `onboarding@resend.dev`).

**Step 6: Better Stack.**
```
Open: https://logs.betterstack.com/sources/new
Platform: HTTP. Name: <slug>. Press Create.
Copy the Source Token (shown once).
Open: https://logs.betterstack.com/settings/api-tokens
Create a token named <slug>. Copy it.
Paste: Source Token, Source ID (from the source's Settings tab), Telemetry API Token.
```
Collect `BETTERSTACK_SOURCE_TOKEN`, `BETTERSTACK_SOURCE_ID`, `BETTERSTACK_API_TOKEN`.

**Step 7: Fly.io.**
```
Open: https://fly.io/dashboard
Create an app named <slug> (or use the CLI: fly apps create <slug>).
Open: https://fly.io/user/personal_access_tokens
Create a token named <slug>-deploy. Copy it.
Paste: Fly API token.
```
Collect `FLY_API_TOKEN`. Set `FLY_APP_NAME=<slug>`.

**Step 8: Write the bundle.**
Write to `secrets.bundle.json` (gitignored). Structure:

```json
{
  "version": "1",
  "turso": {
    "TURSO_DATABASE_URL": "...",
    "TURSO_AUTH_TOKEN": "..."
  },
  "clerk": {
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_...",
    "CLERK_SECRET_KEY": "sk_..."
  },
  "cloudflare": {
    "CLOUDFLARE_ACCOUNT_ID": "...",
    "CLOUDFLARE_R2_BUCKET_NAME": "...",
    "CLOUDFLARE_R2_ACCESS_KEY_ID": "...",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY": "...",
    "CLOUDFLARE_R2_ENDPOINT": "https://..."
  },
  "resend": {
    "RESEND_API_KEY": "re_...",
    "RESEND_FROM_EMAIL": "..."
  },
  "betterstack": {
    "BETTERSTACK_SOURCE_TOKEN": "...",
    "BETTERSTACK_SOURCE_ID": "...",
    "BETTERSTACK_API_TOKEN": "..."
  },
  "fly": {
    "FLY_APP_NAME": "...",
    "FLY_API_TOKEN": "..."
  }
}
```

Print:
```
✓ secrets.bundle.json written.

  ⚠ KEEP THIS FILE SECURE — it contains all your app credentials.
  Add it to .gitignore (already done) and store a backup in your vault.

  To share with CI (GitHub Actions):
    export FORGE_SECRETS_BUNDLE=$(base64 < secrets.bundle.json)
    gh secret set FORGE_SECRETS_BUNDLE --body "$FORGE_SECRETS_BUNDLE"

  To apply on a new machine:
    FORGE_SECRETS_BUNDLE=./secrets.bundle.json ./scripts/forge-secrets.sh
```

Then proceed to Apply mode.

---

## Apply mode (non-interactive)

Invoke the script and report results:

```bash
./scripts/forge-secrets.sh --bundle secrets.bundle.json
```

Or if `FORGE_SECRETS_BUNDLE` is already set:
```bash
./scripts/forge-secrets.sh
```

Report the output verbatim. If verification fails, print which services failed and what to retry.

---

## Rules

- Never commit `secrets.bundle.json` or any file containing raw secrets.
- `secrets.bundle.json` is gitignored automatically by the framework gitignore.
- Apply mode never prompts the user — it errors loudly if anything is wrong.
- In non-interactive mode, route directly to apply mode; never open browsers.
- One prompt per manual step in generate mode — minimal instructions, then wait.
