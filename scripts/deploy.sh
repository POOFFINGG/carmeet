#!/bin/bash
set -e

# ── CONFIG ────────────────────────────────────────────────────────────────────
DOMAIN="auto-meet.ru"
APP_DIR="/var/www/carmeet"
REPO_URL="https://github.com/POOFFINGG/carmeet"

DB_NAME="carmeet"
DB_USER="carmeet"
DB_PASS="carmeet"

echo "==> CarMeet deploy: $DOMAIN"

# ── 1. SYSTEM PACKAGES ────────────────────────────────────────────────────────
echo "==> Installing system packages..."
apt-get update -q
apt-get install -y -q git curl nginx certbot python3-certbot-nginx postgresql postgresql-contrib

# ── 2. NODE.JS via nvm ────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "==> Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)"

# ── 3. PNPM ───────────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "==> Installing pnpm..."
  npm install -g pnpm
fi
echo "pnpm: $(pnpm -v)"

# ── 4. DATABASE ───────────────────────────────────────────────────────────────
echo "==> Setting up PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# ── 5. APP DIRECTORY ──────────────────────────────────────────────────────────
echo "==> Setting up app directory..."
mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

# ── 6. ENV FILE ───────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/artifacts/api-server/.env" ]; then
  echo "==> Creating .env file..."
  cat > "$APP_DIR/artifacts/api-server/.env" <<ENV
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
PORT=3000
FAL_KEY=YOUR_FAL_KEY_HERE
BOT_TOKEN=YOUR_BOT_TOKEN_HERE
MINI_APP_URL=https://$DOMAIN
ENV
  echo "  !! Edit $APP_DIR/artifacts/api-server/.env and set FAL_KEY, then re-run update.sh"
fi

# ── 7. INSTALL DEPS & BUILD ───────────────────────────────────────────────────
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

echo "==> Building API server..."
cd "$APP_DIR/artifacts/api-server"
pnpm build

echo "==> Building frontend..."
cd "$APP_DIR/artifacts/meet-app"
BASE_PATH="/" pnpm build

# ── 8. DB MIGRATIONS ──────────────────────────────────────────────────────────
echo "==> Running DB migrations..."
cd "$APP_DIR/lib/db"
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME" \
  npx drizzle-kit push --config=drizzle.config.ts

# ── 9. UPLOADS DIR ────────────────────────────────────────────────────────────
mkdir -p "$APP_DIR/artifacts/api-server/uploads/garage"
mkdir -p "$APP_DIR/artifacts/api-server/uploads/cache"

# ── 10. SYSTEMD SERVICE ───────────────────────────────────────────────────────
echo "==> Setting up systemd service..."
cat > /etc/systemd/system/carmeet-api.service <<SERVICE
[Unit]
Description=CarMeet API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/artifacts/api-server
EnvironmentFile=$APP_DIR/artifacts/api-server/.env
ExecStart=/usr/bin/node dist/index.cjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

chown -R www-data:www-data "$APP_DIR/artifacts/api-server/uploads"

systemctl daemon-reload
systemctl enable carmeet-api
systemctl restart carmeet-api

# ── 11. NGINX ─────────────────────────────────────────────────────────────────
echo "==> Configuring Nginx..."
cat > /etc/nginx/sites-available/carmeet <<NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    root $APP_DIR/artifacts/meet-app/dist/public;
    index index.html;

    client_max_body_size 20M;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/carmeet /etc/nginx/sites-enabled/carmeet
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── 12. SSL ───────────────────────────────────────────────────────────────────
echo "==> Setting up SSL..."
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos \
  --email admin@$DOMAIN --redirect || echo "  SSL setup failed — run certbot manually"

echo ""
echo "✓ Deploy complete!"
echo "  Site:    https://$DOMAIN"
echo "  API:     http://127.0.0.1:3000"
echo "  Logs:    journalctl -u carmeet-api -f"
echo ""
echo "  Next steps:"
echo "  1. Edit .env: nano $APP_DIR/artifacts/api-server/.env"
echo "     Set FAL_KEY and BOT_TOKEN"
echo "  2. Restart: systemctl restart carmeet-api"
echo "  3. Set webhook: curl -s \"https://api.telegram.org/bot\$BOT_TOKEN/setWebhook?url=https://$DOMAIN/bot\""
