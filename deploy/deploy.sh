#!/bin/bash
# Run on the VPS after code sync or git pull (also used by GitHub Actions).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PM2_NAME="${PM2_APP_NAME:-barberbook}"

echo "==> BarberBook deploy @ $ROOT"

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env — copy deploy/env.production.example to .env and configure once."
  exit 1
fi

# Load .env for npm scripts (migrations, etc.)
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

# .env often has NODE_ENV=production — still need devDependencies (vite, esbuild, cross-env, drizzle-kit)
npm ci --include=dev
npm run build

BUILT_JS="$(ls -1 dist/public/assets/index-*.js 2>/dev/null | head -1 || true)"
echo "==> Built frontend: ${BUILT_JS:-MISSING — build failed?}"

# Reload app immediately so new static assets are served even if migrations fail later
if pm2 describe "$PM2_NAME" &>/dev/null; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

echo "==> Database (production SQLite is NOT overwritten — additive only)..."
if [[ -f "${DATABASE_URL#file:}" ]] || [[ -f "./database.sqlite" ]]; then
  echo "    Existing DB found — applying schema + safe migrations"
else
  echo "    WARN: No database.sqlite yet — migrations will create tables as needed"
fi
npm run fix-schema || echo "WARN: fix-schema failed (continuing)"
npm run migrate-reminders || echo "WARN: migrate-reminders failed (continuing)"
npm run migrate:services-i18n || echo "WARN: migrate:services-i18n failed (continuing)"
npm run migrate:branding || echo "WARN: migrate:branding failed (continuing)"
npm run migrate:branding-colors || echo "WARN: migrate:branding-colors failed (continuing)"
npm run migrate:branding-i18n || echo "WARN: migrate:branding-i18n failed (continuing)"

echo "==> Health check"
sleep 2
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${PORT:-5100}/" || {
  echo "WARN: app not responding on port ${PORT:-5100}"
  pm2 logs "$PM2_NAME" --lines 25 --nostream || true
  exit 1
}

echo "==> Done. $(pm2 info "$PM2_NAME" 2>/dev/null | grep -E 'status|uptime' || true)"
