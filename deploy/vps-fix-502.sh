#!/bin/bash
# One-shot fix for 502 Bad Gateway on BarberBook VPS.
# Run as root: bash /var/www/barberbook/deploy/vps-fix-502.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PM2_NAME="${PM2_APP_NAME:-barberbook}"
APP_PORT="${PORT:-5100}"

echo "=========================================="
echo " BarberBook 502 fix — $ROOT"
echo "=========================================="

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env"
  echo "  cp deploy/env.production.example .env && nano .env"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a
APP_PORT="${PORT:-5100}"

echo ""
echo "==> .env"
echo "    PORT=${PORT:-?}"
echo "    DATABASE_URL=${DATABASE_URL:-?}"
echo "    NODE_ENV=${NODE_ENV:-?}"

DB_FILE="${DATABASE_URL#file:}"
DB_FILE="${DB_FILE#./}"
if [[ -f "$DB_FILE" ]]; then
  echo "    DB file exists: $DB_FILE ($(du -h "$DB_FILE" | cut -f1))"
  if command -v sqlite3 &>/dev/null; then
    TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table';" 2>/dev/null | tr '\n' ' ')
    echo "    Tables: ${TABLES:-NONE}"
    if [[ "$TABLES" != *namedays* ]]; then
      echo ""
      echo "    ERROR: 'namedays' table missing in $DB_FILE"
      echo "    Fix: upload local database.sqlite OR run: npm run fix-schema"
      exit 1
    fi
  fi
else
  echo "    WARN: DB file not found yet: $DB_FILE"
fi

if [[ "${DATABASE_URL:-}" == *barbershop.db* ]] && [[ -f database.sqlite ]]; then
  echo "    Fixing .env: barbershop.db -> database.sqlite"
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:./database.sqlite|' .env
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo ""
echo "==> Install, build, migrations"
npm ci --include=dev
npm run build
npm run fix-schema || true
npm run migrate:production || true

if [[ -f eortologio_namedays.csv ]]; then
  echo "==> Import eortologio namedays"
  npm run import-namedays:force 2>/dev/null || true
fi

echo ""
echo "==> Nginx proxy port (must be ${APP_PORT})"
NGINX_SITE="/etc/nginx/sites-available/barberbook"
if [[ -f "$NGINX_SITE" ]]; then
  if grep -qE 'proxy_pass.*:5000' "$NGINX_SITE"; then
    echo "    Fixing nginx 5000 -> ${APP_PORT}"
    sed -i "s/127.0.0.1:5000/127.0.0.1:${APP_PORT}/g; s/localhost:5000/127.0.0.1:${APP_PORT}/g" "$NGINX_SITE"
    nginx -t && systemctl reload nginx
  fi
  grep proxy_pass "$NGINX_SITE" || true
else
  echo "    WARN: $NGINX_SITE not found — run: bash deploy/vps-bootstrap.sh your-domain.com"
fi

echo ""
echo "==> PM2"
pm2 delete peqi 2>/dev/null || true
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

sleep 2

echo ""
echo "==> Health check http://127.0.0.1:${APP_PORT}/"
if curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${APP_PORT}/"; then
  echo "    OK — app is responding locally."
else
  echo "    FAIL — app not responding. Last PM2 logs:"
  pm2 logs "$PM2_NAME" --lines 40 --nostream || true
  exit 1
fi

pm2 status "$PM2_NAME"
echo ""
echo "Done. Test your BASE_URL in the browser."
echo "If still 502: tail -30 /var/log/nginx/error.log"
