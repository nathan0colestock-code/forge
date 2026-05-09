#!/usr/bin/env bash
# safe-to-publish.sh — fail if the staged diff (or, with --all, all tracked
# files) contains anything that should not appear in a public repo.
#
# Usage:
#   ./scripts/safe-to-publish.sh           # scan staged changes (pre-commit)
#   ./scripts/safe-to-publish.sh --all     # scan every tracked file
#
# Exit 0 = clean. Exit 1 = something looks like a secret/PII.

set -euo pipefail

mode="${1:-staged}"
fail=0
note() { echo "✗ $1" >&2; fail=1; }

# Files to scan
if [[ "$mode" == "--all" ]]; then
  files="$(git ls-files)"
else
  files="$(git diff --cached --name-only --diff-filter=ACMR)"
fi
[[ -z "$files" ]] && { echo "✓ nothing to scan"; exit 0; }

# 1. Forbidden filenames
while IFS= read -r f; do
  case "$f" in
    .env|*/.env|.env.local|*/.env.local|.env.*.local|*/.env.*.local) note "secret-bearing env file staged: $f" ;;
    *.pem|*.key|*.p12|*.pfx|*.jks|*.keystore) note "private key/cert staged: $f" ;;
    *settings.local.json|*credentials.json|*secrets.json|*service-account*.json) note "local/credentials file staged: $f" ;;
  esac
done <<< "$files"

# 2. High-signal token patterns inside staged content
patterns='(sk_live_|sk_test_)[A-Za-z0-9]{16,}|pk_live_[A-Za-z0-9]{16,}|re_[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{36}|gho_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{30,}\.eyJ[A-Za-z0-9_-]{20,}|-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|PRIVATE) PRIVATE KEY-----|libsql://[a-z0-9-]+\.turso\.io[^"\s]*[A-Za-z0-9]{20}'

while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  # skip binary files
  case "$f" in *.png|*.jpg|*.jpeg|*.gif|*.ico|*.woff|*.woff2|*.ttf|*.otf|*.pdf|*.zip) continue ;; esac
  if grep -aEn "$patterns" "$f" >/dev/null 2>&1; then
    matches="$(grep -aEn "$patterns" "$f" | head -3)"
    note "possible secret in $f:"
    echo "$matches" | sed 's/^/    /' >&2
  fi
done <<< "$files"

# 3. Real-looking test_ values in .env.example (must be empty/placeholder)
for envex in $(echo "$files" | grep -E '\.env\.example$' || true); do
  if grep -aEn '^(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY|RESEND_API_KEY|TURSO_AUTH_TOKEN|BETTERSTACK_(SOURCE_TOKEN|API_TOKEN)|CLOUDFLARE_R2_(ACCESS_KEY_ID|SECRET_ACCESS_KEY))=[A-Za-z0-9._-]{20,}' "$envex" >/dev/null 2>&1; then
    note "$envex contains a non-placeholder value (env.example must be blank/placeholder only)"
  fi
done

if (( fail == 0 )); then
  echo "✓ safe-to-publish: no secrets detected ($(echo "$files" | wc -l | tr -d ' ') files scanned)"
  exit 0
fi
echo "" >&2
echo "Refusing — fix the above, or move the value into .env.local (gitignored)." >&2
exit 1
