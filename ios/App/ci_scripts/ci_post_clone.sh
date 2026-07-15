#!/bin/sh

set -eu

echo "Preparing Plink web assets for the Xcode Cloud archive..."

REPOSITORY_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$REPOSITORY_ROOT"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"

if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "Installing Node.js 22..."
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

echo "Using Node.js $(node --version) and npm $(npm --version)"

npm ci --no-audit --no-fund
npm run build
npx cap sync ios

echo "Capacitor iOS project is ready for Xcode Cloud."
