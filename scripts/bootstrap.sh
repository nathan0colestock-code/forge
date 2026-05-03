#!/usr/bin/env bash
# bootstrap.sh — install local CLIs needed by Forge.
# Idempotent: skips anything already installed. Falls back to user-local
# installs when sudo isn't available.

set -euo pipefail

OS="$(uname -s)"
have() { command -v "$1" >/dev/null 2>&1; }
have_sudo() { command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; }

USER_BIN="$HOME/.local/bin"
mkdir -p "$USER_BIN"
case ":$PATH:" in *":$USER_BIN:"*) ;; *) export PATH="$USER_BIN:$PATH" ;; esac

install_pkg() {
  local pkg="$1"
  if [[ "$OS" == "Darwin" ]] && have brew; then
    brew install "$pkg"
  elif [[ "$OS" == "Linux" ]] && have apt-get && have_sudo; then
    sudo apt-get update -qq && sudo apt-get install -y "$pkg"
  else
    echo "✗ Cannot auto-install '$pkg' (no brew / no sudo apt). Install manually."
    return 1
  fi
}

echo "› Forge bootstrap (OS: $OS)"
if [[ "$OS" == "Linux" ]] && ! have_sudo; then
  echo "  (no sudo — falling back to user-local installs in $USER_BIN)"
fi

# Node 20+
if ! have node; then
  echo "› Installing Node.js (20+)"
  if [[ "$OS" == "Darwin" ]] && have brew; then brew install node@20
  elif [[ "$OS" == "Linux" ]] && have apt-get && have_sudo; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "✗ Install Node.js 20+ manually (e.g. via nvm: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash && nvm install 20')"
    exit 1
  fi
fi
echo "  node $(node -v)"

# GitHub CLI
if ! have gh; then
  echo "› Installing GitHub CLI"
  install_pkg gh || echo "  Manual install: https://cli.github.com/"
fi
have gh && echo "  gh $(gh --version | head -1)"

# Fly CLI (curl installer always uses ~/.fly — works without sudo)
if ! have fly && ! have flyctl; then
  echo "› Installing Fly CLI"
  curl -L https://fly.io/install.sh | sh
  export FLYCTL_INSTALL="$HOME/.fly"
  export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi
have fly  && echo "  fly $(fly version)"  || true
have flyctl && echo "  flyctl $(flyctl version)" || true

# Turso CLI (curl installer to ~/.turso — works without sudo)
if ! have turso; then
  echo "› Installing Turso CLI"
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
fi
have turso && echo "  turso $(turso --version 2>/dev/null || echo unknown)"

# Wrangler (Cloudflare) — npm global, fall back to npx if no global perms
if ! have wrangler; then
  echo "› Installing Wrangler"
  if npm install -g wrangler 2>/dev/null; then
    :
  else
    echo "  (no global npm perms — wrangler will be invoked via npx)"
    cat > "$USER_BIN/wrangler" <<'EOF'
#!/usr/bin/env bash
exec npx --yes wrangler@latest "$@"
EOF
    chmod +x "$USER_BIN/wrangler"
  fi
fi
have wrangler && echo "  wrangler $(wrangler --version 2>/dev/null | head -1)"

cat <<'EOF'

✓ Forge bootstrap complete.

If any tool is missing above, install it manually then re-run.

Next:
  ./scripts/forge-init.sh my-app

EOF
