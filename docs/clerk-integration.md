# Clerk Integration: Lessons Learned

Hard-won lessons from deploying Clerk auth on Fly.io with both Next.js (forge stack) and vanilla JS.

---

## 1. `NEXT_PUBLIC_*` env vars must be Fly secrets too

**The bug:** `integration-setup` Step 7 originally skipped `NEXT_PUBLIC_*` vars when running `fly secrets set`, assuming they're baked into the client bundle at build time.

**Why that's wrong for Next.js App Router:** `layout.tsx` is a Server Component. When it reads `process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, that happens at **runtime** (per-request), not at build time. The value is passed to `<ClerkProvider>` as a prop, which then flows to Client Components via React context — client bundles never need the static inline replacement.

**The fix:** Set all env vars — including `NEXT_PUBLIC_*` — as Fly secrets. The Dockerfile does not need ARG/ENV plumbing for them.

```bash
fly secrets set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... CLERK_SECRET_KEY=sk_live_...
```

**Exception:** If a `NEXT_PUBLIC_*` var is used directly inside a file marked `'use client'` (not passed via props/context), it **is** baked at build time and must be a Docker build arg. Avoid this pattern — pass values from server → client via props instead.

---

## 2. Clerk dashboard: add deployed URL after first deploy

After deploying to Fly.io, sign-in redirects will silently fail unless the deployed URL is registered in the Clerk dashboard.

**Where:** Clerk Dashboard → your app → Configure → **Paths** → Fallback development host

**What to enter:** `https://<your-app>.fly.dev`

This applies to both test keys (`pk_test_`) and live keys. The `integration-setup` skill now reminds the user of this step in `INTEGRATION_STATUS.md`.

---

## 3. Fly volumes break rolling deploys

If your app uses a Fly persistent volume (`[[mounts]]` in `fly.toml`), the default rolling deploy strategy fails — it tries to start a new machine before stopping the old one, but a volume can only be attached to one machine at a time.

**Symptom:** `✖ machine in group 'app' needs an unattached volume named '...'`

**Fix:** Deploy with `--strategy immediate`:
```bash
fly deploy --strategy immediate
```

This stops the old machine first (brief downtime), then starts the new one so the volume is free to attach.

**Forge stack note:** The canonical forge stack uses Turso (DB) and R2 (storage) — no Fly volumes needed. This only applies if you add a volume manually.

---

## 4. Clerk JS v6 browser SDK (non-Next.js contexts only)

If ever building a vanilla JS app that loads Clerk via CDN:

**What changed in v6:**

| | v4/v5 | v6 |
|---|---|---|
| `window.Clerk` | Constructor class | Pre-built instance |
| Initialization | `new window.Clerk(key)` | `window.Clerk` (already constructed) |
| Key source | Passed to constructor | `data-clerk-publishable-key` attribute on `<script>` tag |
| Auto-init | No | Yes — throws if key attribute missing |

**Correct v6 script tag:**
```html
<script data-clerk-publishable-key="pk_test_..." src="/clerk.js"></script>
```

**Correct v6 init:**
```javascript
// window.Clerk is already the instance — don't call `new`
const clerk = window.Clerk;
await clerk.load();
if (!clerk.user) {
  window.location.assign(clerk.buildSignInUrl({ redirectUrl: window.location.href }));
  return;
}
```

**CDN reliability:** jsDelivr's `@latest` tag has caching issues. Self-host the bundle by adding `@clerk/clerk-js` to dependencies and serving from `node_modules` rather than an external CDN.

---

## 5. Fly deploy checklist for Clerk apps

After initial setup and on each production key rotation:

- [ ] `fly secrets set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=...`
- [ ] Clerk Dashboard → Configure → Paths → Fallback development host = `https://<slug>.fly.dev`
- [ ] If using Fly volumes: `fly deploy --strategy immediate` (not the default rolling strategy)
- [ ] Smoke test: visit the deployed URL and confirm redirect to Clerk sign-in page
