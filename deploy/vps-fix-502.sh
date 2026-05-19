#!/bin/bash
# One-shot fix for 502 Bad Gateway on PEQI VPS.
# Run as root: bash /var/www/peqi/deploy/vps-fix-502.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP_PORT="${PORT:-5100}"

echo "=========================================="
echo " PEQI 502 fix — $ROOT"
echo "=========================================="

if [[ ! -f .env ]]; then
  echo "ERROR: Missing .env"
  echo "  cp deploy/env.production.example .env && nano .env"
  exit 1
fi

# Load .env for this script
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
      echo "    Fix: upload local database.sqlite OR set DATABASE_URL=file:./database.sqlite"
      echo "         and run: npm run db:push"
      exit 1
    fi
  fi
else
  echo "    WARN: DB file not found yet: $DB_FILE (will be created by db:push)"
fi

# Prefer database.sqlite (local dev file with full schema)
if [[ "${DATABASE_URL:-}" == *barbershop.db* ]] && [[ -f database.sqlite ]]; then
  echo "    Fixing .env: barbershop.db -> database.sqlite"
  sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:./database.sqlite|' .env
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo ""
echo "==> Install, build, database schema"
npm ci
npm run build
npm run db:push

if [[ -f eortologio_namedays.csv ]]; then
  echo "==> Import eortologio namedays (if DB empty or --force on server)"
  npm run import-namedays:force 2>/dev/null || true
fi

echo ""
echo "==> Nginx proxy port (must be ${APP_PORT})"
NGINX_SITE="/etc/nginx/sites-available/peqi"
if [[ -f "$NGINX_SITE" ]]; then
  if grep -qE 'proxy_pass.*:5000' "$NGINX_SITE"; then
    echo "    Fixing nginx 5000 -> ${APP_PORT}"
    sed -i "s/127.0.0.1:5000/127.0.0.1:${APP_PORT}/g; s/localhost:5000/127.0.0.1:${APP_PORT}/g" "$NGINX_SITE"
    nginx -t && systemctl reload nginx
  fi
  echo "    proxy_pass lines:"
  grep proxy_pass "$NGINX_SITE" || true
else
  echo "    WARN: $NGINX_SITE not found — run: bash deploy/vps-bootstrap.sh peqi.hair"
fi

echo ""
echo "==> PM2"
pm2 delete barberbook 2>/dev/null || true
if pm2 describe peqi &>/dev/null; then
  pm2 delete peqi
fi
pm2 start deploy/ecosystem.config.cjs
pm2 save

sleep 2

echo ""
echo "==> Health check http://127.0.0.1:${APP_PORT}/"
if curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://127.0.0.1:${APP_PORT}/"; then
  echo "    OK — app is responding locally."
else
  echo "    FAIL — app not responding. Last PM2 logs:"
  pm2 logs peqi --lines 40 --nostream || true
  exit 1
fi

echo ""
echo "==> PM2 status"
pm2 status peqi

echo ""
echo "Done. Test https://peqi.hair in the browser."
echo "If still 502: tail -30 /var/log/nginx/error.log"
