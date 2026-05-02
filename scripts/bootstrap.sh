#!/usr/bin/env bash
# bootstrap.sh — install local CLIs needed by Forge.
# Idempotent: skips anything already installed.

set -euo pipefail

OS="$(uname -s)"
have() { command -v "$1" >/dev/null 2>&1; }

install_brew_or_fail() {
  if [[ "$OS" == "Darwin" ]] && have brew; then
    brew install "$1"
  elif [[ "$OS" == "Linux" ]] && have apt-get; then
    sudo apt-get update -qq && sudo apt-get install -y "$1"
  else
    echo "✗ Please install '$1' manually for your OS"
    return 1
  fi
}

echo "› Forge bootstrap (OS: $OS)"

# Node 20+
if ! have node; then
  echo "› Installing Node.js (20+)"
  if [[ "$OS" == "Darwin" ]] && have brew; then brew install node@20
  elif [[ "$OS" == "Linux" ]] && have apt-get; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else echo "✗ Install Node.js 20+ manually"; exit 1
  fi
fi
echo "  node $(node -v)"

# GitHub CLI
if ! have gh; then
  echo "› Installing GitHub CLI"
  install_brew_or_fail gh
fi
echo "  gh $(gh --version | head -1)"

# Fly CLI
if ! have fly && ! have flyctl; then
  echo "› Installing Fly CLI"
  curl -L https://fly.io/install.sh | sh
  export FLYCTL_INSTALL="$HOME/.fly"
  export PATH="$FLYCTL_INSTALL/bin:$PATH"
fi
echo "  fly $(fly version 2>/dev/null || flyctl version)"

# Turso CLI
if ! have turso; then
  echo "› Installing Turso CLI"
  curl -sSfL https://get.tur.so/install.sh | bash
  export PATH="$HOME/.turso:$PATH"
fi
echo "  turso $(turso --version 2>/dev/null || echo unknown)"

# Wrangler (Cloudflare)
if ! have wrangler; then
  echo "› Installing Wrangler"
  npm install -g wrangler
fi
echo "  wrangler $(wrangler --version 2>/dev/null | head -1)"

cat <<'EOF'

✓ Forge bootstrap complete.

Next:
  ./scripts/forge-init.sh my-app

EOF
