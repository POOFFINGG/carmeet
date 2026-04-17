#!/bin/bash
set -e

APP_DIR="/var/www/carmeet"

echo "==> CarMeet update..."
cd "$APP_DIR"

# ── 1. PULL LATEST CODE ───────────────────────────────────────────────────────
echo "==> Pulling latest code..."
git pull --rebase

# ── 2. INSTALL DEPS ───────────────────────────────────────────────────────────
echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

# ── 3. BUILD ──────────────────────────────────────────────────────────────────
echo "==> Building API server..."
cd "$APP_DIR/artifacts/api-server"
pnpm build

echo "==> Building frontend..."
cd "$APP_DIR/artifacts/meet-app"
BASE_PATH="/" pnpm build

# ── 4. DB MIGRATIONS ──────────────────────────────────────────────────────────
echo "==> Running DB migrations..."
cd "$APP_DIR/lib/db"
source "$APP_DIR/artifacts/api-server/.env"
DATABASE_URL="$DATABASE_URL" npx drizzle-kit push --config=drizzle.config.ts

# ── 5. RESTART API ────────────────────────────────────────────────────────────
echo "==> Restarting API service..."
systemctl restart carmeet-api
sleep 2
systemctl status carmeet-api --no-pager | tail -5

# ── 6. RELOAD NGINX (если конфиг менялся) ────────────────────────────────────
nginx -t && systemctl reload nginx

echo ""
echo "✓ Update complete!"
echo "  Logs: journalctl -u carmeet-api -f"
