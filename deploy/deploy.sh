#!/bin/bash
# Run on the VPS after code sync or git pull (also used by GitHub Actions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> PEQI deploy @ $ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy deploy/env.production.example to .env and configure once."
  exit 1
fi

# Load .env for npm scripts (db:push, etc.)
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "==> Environment"
echo "    NODE_ENV=${NODE_ENV:-}"
echo "    PORT=${PORT:-}"
echo "    DATABASE_URL=${DATABASE_URL:-}"
if [[ -n "${EMAIL_USER:-}" ]]; then
  echo "    EMAIL_USER=${EMAIL_USER} (configured)"
else
  echo "    EMAIL_USER=MISSING — confirmation emails will not send"
fi

npm ci
npm run build

echo "==> Database (production SQLite is NOT overwritten by deploy — only schema/migrations)..."
if [[ -f "${DATABASE_URL#file:}" ]] || [[ -f "./database.sqlite" ]]; then
  echo "    Existing DB found — applying additive schema + safe migrations"
else
  echo "    WARN: No database.sqlite yet — db:push will create an empty DB"
fi
npm run db:push
npm run migrate:production

if pm2 describe peqi &>/dev/null; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi

pm2 save

echo "==> Health check"
sleep 2
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${PORT:-5100}/" || {
  echo "WARN: app not responding on port ${PORT:-5100}"
  pm2 logs peqi --lines 25 --nostream || true
  exit 1
}

echo "==> Done. $(pm2 info peqi 2>/dev/null | grep -E 'status|uptime' || true)"
