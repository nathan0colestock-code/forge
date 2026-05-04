#!/usr/bin/env bash
# forge-secrets.sh — apply a Forge secrets bundle to .env.local, Fly, and GitHub.
#
# Usage (any one of):
#   ./scripts/forge-secrets.sh --bundle ./secrets.bundle.json
#   FORGE_SECRETS_BUNDLE=./secrets.bundle.json ./scripts/forge-secrets.sh
#   FORGE_SECRETS_BUNDLE=$(base64 < secrets.bundle.json) ./scripts/forge-secrets.sh
#
# Idempotent: existing valid secrets are detected and skipped.
# Designed for non-interactive environments (CI=true, GitHub Codespaces, fresh clones).

set -euo pipefail

# ── helpers ──────────────────────────────────────────────────────────────────

err()  { echo "✗ $*" >&2; }
info() { echo "  $*"; }
ok()   { echo "✓ $*"; }
step() { echo; echo "› $*"; }
die()  { err "$*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Required command '$1' not found. Run scripts/bootstrap.sh first."
}

# ── locate bundle ─────────────────────────────────────────────────────────────

BUNDLE_FILE=""
BUNDLE_JSON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bundle) BUNDLE_FILE="$2"; shift 2 ;;
    --bundle=*) BUNDLE_FILE="${1#--bundle=}"; shift ;;
    *) die "Unknown argument: $1" ;;
  esac
done

if [[ -n "$BUNDLE_FILE" ]]; then
  [[ -f "$BUNDLE_FILE" ]] || die "Bundle file not found: $BUNDLE_FILE"
  BUNDLE_JSON="$(cat "$BUNDLE_FILE")"
elif [[ -n "${FORGE_SECRETS_BUNDLE:-}" ]]; then
  # Accept either a file path or base64-encoded JSON
  if [[ -f "$FORGE_SECRETS_BUNDLE" ]]; then
    BUNDLE_JSON="$(cat "$FORGE_SECRETS_BUNDLE")"
  else
    BUNDLE_JSON="$(echo "$FORGE_SECRETS_BUNDLE" | base64 --decode 2>/dev/null)" \
      || die "FORGE_SECRETS_BUNDLE is neither a valid file path nor valid base64 JSON."
  fi
else
  die "No bundle provided.
  Pass --bundle ./secrets.bundle.json
  or set FORGE_SECRETS_BUNDLE to a file path or base64-encoded JSON."
fi

require_cmd jq

# Validate JSON is parseable
echo "$BUNDLE_JSON" | jq . >/dev/null 2>&1 \
  || die "Bundle is not valid JSON."

# ── extract helpers ───────────────────────────────────────────────────────────

# jq_get: extract .section.KEY from bundle JSON (returns empty string if absent)
jq_get() {
  echo "$BUNDLE_JSON" | jq -r "${1} // empty"
}

# bundle_section_pairs: emit KEY=VALUE lines for all keys in a bundle section
bundle_section_pairs() {
  local section="$1"
  echo "$BUNDLE_JSON" | jq -r ".${section} // {} | to_entries[] | \"\(.key)=\(.value)\""
}

# bundle_has: check if a section exists
bundle_has() {
  local result
  result="$(echo "$BUNDLE_JSON" | jq -r ".${1} // empty")"
  [[ -n "$result" ]]
}

# ── validate required sections ────────────────────────────────────────────────

step "Validating bundle"

MISSING=""
for section in turso clerk betterstack fly; do
  bundle_has "$section" || MISSING="$MISSING $section"
done
[[ -z "$MISSING" ]] || die "Bundle is missing required sections:$MISSING"

VERSION="$(jq_get '.version')"
[[ "$VERSION" == "1" ]] || die "Unknown bundle version: $VERSION (expected '1')"

ok "Bundle looks valid (version $VERSION)"

# ── resolve app name ──────────────────────────────────────────────────────────

FLY_APP_NAME="$(jq_get '.fly.FLY_APP_NAME')"
[[ -n "$FLY_APP_NAME" ]] || die "fly.FLY_APP_NAME is required in the bundle."
FLY_API_TOKEN="$(jq_get '.fly.FLY_API_TOKEN')"
[[ -n "$FLY_API_TOKEN" ]] || die "fly.FLY_API_TOKEN is required in the bundle."

# ── write .env.local ──────────────────────────────────────────────────────────

step "Writing .env.local"

ENV_FILE=".env.local"
# Preserve any existing entries not covered by the bundle
declare -A EXISTING=()
if [[ -f "$ENV_FILE" ]]; then
  while IFS='=' read -r key _rest; do
    [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] && EXISTING["$key"]=1
  done < "$ENV_FILE"
fi

# Collect all pairs from the bundle (excluding FLY_API_TOKEN — CI-only secret)
declare -A BUNDLE_PAIRS=()
for section in turso clerk cloudflare resend betterstack app; do
  bundle_has "$section" || continue
  while IFS='=' read -r key value; do
    BUNDLE_PAIRS["$key"]="$value"
  done < <(bundle_section_pairs "$section")
done

# FLY_APP_NAME goes into .env.local; FLY_API_TOKEN does not (it's CI-only)
BUNDLE_PAIRS["FLY_APP_NAME"]="$FLY_APP_NAME"

# Infer app URL + name if not explicitly set
if [[ -z "${BUNDLE_PAIRS[NEXT_PUBLIC_APP_URL]:-}" ]]; then
  BUNDLE_PAIRS["NEXT_PUBLIC_APP_URL"]="https://${FLY_APP_NAME}.fly.dev"
fi
if [[ -z "${BUNDLE_PAIRS[NEXT_PUBLIC_APP_NAME]:-}" ]] && [[ -f "APP_SPEC.md" ]]; then
  spec_name="$(grep -m1 '^# ' APP_SPEC.md 2>/dev/null | sed 's/^# //' || true)"
  [[ -n "$spec_name" ]] && BUNDLE_PAIRS["NEXT_PUBLIC_APP_NAME"]="$spec_name"
fi

# Add Clerk redirect URLs (derived, not stored in bundle)
BUNDLE_PAIRS["NEXT_PUBLIC_CLERK_SIGN_IN_URL"]="/sign-in"
BUNDLE_PAIRS["NEXT_PUBLIC_CLERK_SIGN_UP_URL"]="/sign-up"
BUNDLE_PAIRS["NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL"]="/dashboard"
BUNDLE_PAIRS["NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL"]="/dashboard"

# Better Stack ingest URL (constant)
BUNDLE_PAIRS["BETTERSTACK_INGEST_URL"]="https://in.logs.betterstack.com"

# Write .env.local: start from existing file (preserving extra lines), overwrite known keys
TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT

# Copy existing lines, replacing values we're setting
if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    key="${line%%=*}"
    if [[ -n "${BUNDLE_PAIRS[$key]:-}" ]]; then
      echo "${key}=${BUNDLE_PAIRS[$key]}" >> "$TMP_ENV"
      unset 'BUNDLE_PAIRS[$key]'
    else
      echo "$line" >> "$TMP_ENV"
    fi
  done < "$ENV_FILE"
fi

# Append any new keys not already in the file
for key in "${!BUNDLE_PAIRS[@]}"; do
  echo "${key}=${BUNDLE_PAIRS[$key]}" >> "$TMP_ENV"
done

mv "$TMP_ENV" "$ENV_FILE"
ok ".env.local written ($(wc -l < "$ENV_FILE") lines)"

# ── set Fly secrets ───────────────────────────────────────────────────────────

step "Setting Fly secrets for app: $FLY_APP_NAME"

require_cmd fly 2>/dev/null || require_cmd flyctl

FLY="$(command -v fly 2>/dev/null || command -v flyctl)"

# Auth with the token from the bundle (non-interactive)
export FLY_API_TOKEN="$FLY_API_TOKEN"

# Collect non-PUBLIC secrets for Fly (exclude FLY_APP_NAME and FLY_API_TOKEN)
FLY_SECRET_ARGS=()
while IFS= read -r line; do
  key="${line%%=*}"
  value="${line#*=}"
  [[ "$key" =~ ^NEXT_PUBLIC_ ]] && continue
  [[ "$key" == "FLY_APP_NAME" ]] && continue
  [[ "$key" == "FLY_API_TOKEN" ]] && continue
  [[ -z "$value" ]] && continue
  FLY_SECRET_ARGS+=("${key}=${value}")
done < "$ENV_FILE"

if [[ ${#FLY_SECRET_ARGS[@]} -gt 0 ]]; then
  "$FLY" secrets set "${FLY_SECRET_ARGS[@]}" --app "$FLY_APP_NAME" --stage 2>&1 \
    && ok "Fly secrets staged (${#FLY_SECRET_ARGS[@]} keys)" \
    || err "Fly secrets set failed — check FLY_API_TOKEN and that app '$FLY_APP_NAME' exists."
else
  info "No Fly secrets to set."
fi

# ── set GitHub secrets ────────────────────────────────────────────────────────

step "Setting GitHub secrets"

if ! command -v gh >/dev/null 2>&1; then
  err "gh CLI not found — skipping GitHub secrets. Run scripts/bootstrap.sh to install."
else
  # Confirm we're in a git repo with a remote
  GH_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)"
  if [[ -z "$GH_REPO" ]]; then
    err "No GitHub remote detected — skipping GitHub secrets."
    info "Push to GitHub first, then re-run this script."
  else
    info "Repo: $GH_REPO"

    # All non-PUBLIC env vars + FLY_API_TOKEN
    SECRETS_SET=0
    while IFS= read -r line; do
      key="${line%%=*}"
      value="${line#*=}"
      [[ "$key" =~ ^NEXT_PUBLIC_ ]] && continue
      [[ "$key" == "FLY_APP_NAME" ]] && continue
      [[ -z "$value" ]] && continue
      gh secret set "$key" --body "$value" --repo "$GH_REPO" 2>/dev/null && SECRETS_SET=$((SECRETS_SET + 1))
    done < "$ENV_FILE"

    # FLY_API_TOKEN is CI-only — not in .env.local but must be a GitHub secret
    gh secret set FLY_API_TOKEN --body "$FLY_API_TOKEN" --repo "$GH_REPO" 2>/dev/null \
      && SECRETS_SET=$((SECRETS_SET + 1))

    ok "GitHub secrets set ($SECRETS_SET keys) on $GH_REPO"
  fi
fi

# ── verify ────────────────────────────────────────────────────────────────────

step "Verifying integrations"

FAIL=0

# Source .env.local so we can use the values
set -a; source "$ENV_FILE" 2>/dev/null; set +a

# Turso
if turso db show "$FLY_APP_NAME" >/dev/null 2>&1; then
  ok "Turso: DB '$FLY_APP_NAME' accessible"
else
  # Try a direct libsql ping instead
  TURSO_CHECK="$(curl -sf -H "Authorization: Bearer $TURSO_AUTH_TOKEN" \
    "${TURSO_DATABASE_URL/libsql:/https:}/v2/pipeline" \
    -H "Content-Type: application/json" \
    -d '{"requests":[{"type":"execute","stmt":{"sql":"SELECT 1"}},{"type":"close"}]}' 2>/dev/null || echo "fail")"
  if echo "$TURSO_CHECK" | grep -q '"type":"ok"'; then
    ok "Turso: connection verified via HTTP"
  else
    err "Turso: connection failed — check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN"
    FAIL=$((FAIL + 1))
  fi
fi

# Clerk
CLERK_CHECK="$(curl -sf -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.com/v1/users?limit=1" 2>/dev/null | jq -r '.[] | "ok"' 2>/dev/null || echo "")"
# Clerk returns [] for empty user lists — check for HTTP 200 instead
CLERK_HTTP="$(curl -so /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.com/v1/users?limit=1" 2>/dev/null || echo "000")"
if [[ "$CLERK_HTTP" == "200" ]]; then
  ok "Clerk: API key valid"
else
  err "Clerk: API returned HTTP $CLERK_HTTP — check CLERK_SECRET_KEY"
  FAIL=$((FAIL + 1))
fi

# Better Stack
BS_CHECK="$(curl -sf -X POST "$BETTERSTACK_INGEST_URL" \
  -H "Authorization: Bearer $BETTERSTACK_SOURCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"forge-secrets smoke\",\"level\":\"info\"}" \
  -w "%{http_code}" -o /dev/null 2>/dev/null || echo "000")"
if [[ "$BS_CHECK" == "202" ]]; then
  ok "Better Stack: log write accepted"
else
  err "Better Stack: ingest returned HTTP $BS_CHECK — check BETTERSTACK_SOURCE_TOKEN"
  FAIL=$((FAIL + 1))
fi

# Fly app exists
FLY_CHECK="$($FLY status --app "$FLY_APP_NAME" 2>&1 || true)"
if echo "$FLY_CHECK" | grep -qE "^(App|Name|Hostname)"; then
  ok "Fly: app '$FLY_APP_NAME' found"
else
  err "Fly: app '$FLY_APP_NAME' not found — create it with: fly apps create $FLY_APP_NAME"
  FAIL=$((FAIL + 1))
fi

# Optional: R2
if [[ -n "${CLOUDFLARE_R2_BUCKET_NAME:-}" ]]; then
  R2_CHECK="$(wrangler r2 bucket list 2>/dev/null | grep "$CLOUDFLARE_R2_BUCKET_NAME" || echo "")"
  if [[ -n "$R2_CHECK" ]]; then
    ok "Cloudflare R2: bucket '$CLOUDFLARE_R2_BUCKET_NAME' found"
  else
    err "Cloudflare R2: bucket '$CLOUDFLARE_R2_BUCKET_NAME' not found — check credentials"
    FAIL=$((FAIL + 1))
  fi
fi

# Optional: Resend
if [[ -n "${RESEND_API_KEY:-}" ]]; then
  RESEND_CHECK="$(curl -so /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $RESEND_API_KEY" \
    "https://api.resend.com/domains" 2>/dev/null || echo "000")"
  if [[ "$RESEND_CHECK" == "200" ]]; then
    ok "Resend: API key valid"
  else
    err "Resend: API returned HTTP $RESEND_CHECK — check RESEND_API_KEY"
    FAIL=$((FAIL + 1))
  fi
fi

# ── summary ───────────────────────────────────────────────────────────────────

echo
if [[ $FAIL -eq 0 ]]; then
  echo "✓ All secrets applied and verified."
  echo "  Next: open Claude Code and run /forge-build"
else
  echo "⚠ $FAIL verification(s) failed — fix above errors and re-run this script."
  exit 1
fi
