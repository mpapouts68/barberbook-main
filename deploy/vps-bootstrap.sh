#!/bin/bash
# PEQI / BarberBook — first-time VPS setup (Ubuntu/Debian)
# Run on server as root: bash vps-bootstrap.sh your-domain.com

set -euo pipefail

DOMAIN="${1:-peqi.hair}"
APP_DIR="/var/www/peqi"
APP_PORT="5100"
NODE_MAJOR="20"

echo "==> PEQI VPS bootstrap — domain: $DOMAIN"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git nano ufw nginx certbot python3-certbot-nginx build-essential

# Node.js LTS
if ! command -v node &>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v) npm: $(npm -v)"

npm install -g pm2

ufw allow OpenSSH || ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

mkdir -p "$APP_DIR"
chown -R "${SUDO_USER:-root}:${SUDO_USER:-root}" "$APP_DIR"

# Nginx reverse proxy → app on localhost:5100
cat > "/etc/nginx/sites-available/peqi" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/peqi /etc/nginx/sites-enabled/peqi
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "✅ Bootstrap done."
echo "   App directory: $APP_DIR"
echo "   Next:"
echo "   1) Upload app + .env to $APP_DIR"
echo "   2) cd $APP_DIR && npm ci && npm run build"
echo "   3) pm2 start dist/index.js --name peqi"
echo "   4) pm2 save && pm2 startup"
echo "   5) certbot --nginx -d $DOMAIN -d www.$DOMAIN"
