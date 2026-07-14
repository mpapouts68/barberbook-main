#!/bin/bash
# Run ONCE on the VPS after you uploaded database.sqlite (or cloned the repo).
# Usage: bash /var/www/barberbook/deploy/server-setup-once.sh
set -euo pipefail

cd /var/www/barberbook
PM2_NAME="${PM2_APP_NAME:-barberbook}"

echo "==> .env"
if [[ ! -f .env ]]; then
  cp deploy/env.production.example .env
  echo "Created .env — edit SESSION_SECRET, BASE_URL, and EMAIL_* then re-run."
  exit 1
fi
sed -i 's|^DATABASE_URL=.*|DATABASE_URL=file:./database.sqlite|' .env
grep -E '^PORT=|^DATABASE_URL=|^BASE_URL=' .env || true

if [[ ! -f database.sqlite ]]; then
  echo "ERROR: /var/www/barberbook/database.sqlite missing."
  echo "Upload from your PC:"
  echo '  scp "./database.sqlite" root@YOUR_VPS_IP:/var/www/barberbook/database.sqlite'
  exit 1
fi

echo "==> namedays count"
node -e "const D=require('better-sqlite3');const n=D('database.sqlite',{readonly:1}).prepare('select count(*) c from namedays').get().c;console.log('namedays:',n);if(n<2000)process.exit(1)"

echo "==> build & pm2"
npm ci --include=dev
npm run build
pm2 delete peqi 2>/dev/null || true
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
pm2 save

sleep 2
curl -sf -o /dev/null -w "Local app: HTTP %{http_code}\n" http://127.0.0.1:5100/ || {
  pm2 logs "$PM2_NAME" --lines 30 --nostream
  exit 1
}
echo "Done. Open your BASE_URL from .env"
