#!/bin/bash
# Run on the VPS after `git pull` (also used by GitHub Actions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> PEQI deploy @ $ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy deploy/env.production.example to .env and configure once."
  exit 1
fi

npm ci
npm run build

if pm2 describe peqi &>/dev/null; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save
echo "==> Done. $(pm2 info peqi | grep -E 'status|uptime' || true)"
