#!/usr/bin/env bash
###############################################################################
# EnduranceAI — full deploy on Ubuntu 22.04 (no Docker)
# Target: endurance.yuzapp.space (82.117.245.92)
# VPS:   2 GB RAM, 4 vCPU, 15 GB disk
#
# Usage on the server (as root):
#   bash deploy.sh
#
# After completion, you must:
#   1) edit /home/endurance/enduranceai/backend/.env — put real
#      STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET
#   2) run: sudo systemctl restart enduranceai-gunicorn enduranceai-celery
###############################################################################
set -euo pipefail

readonly DOMAIN="endurance.yuzapp.space"
readonly REPO_URL="https://github.com/imallakov/enduranceai.git"
readonly APP_USER="endurance"
readonly APP_DIR="/home/${APP_USER}/enduranceai"
readonly VENV="${APP_DIR}/backend/venv"
readonly LOG="/var/log/enduranceai-deploy.log"

DB_NAME="enduranceai"
DB_USER="enduranceai"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
DJANGO_SECRET="$(openssl rand -base64 50 | tr -d '\n')"
JWT_SECRET="$(openssl rand -base64 50 | tr -d '\n')"

mkdir -p "$(dirname "$LOG")"
exec > >(tee -a "$LOG") 2>&1
echo "===== EnduranceAI deploy started: $(date) ====="

# ─────────────────────────────────────────────────────────────────────
# 1. System prep
# ─────────────────────────────────────────────────────────────────────
echo "── Step 1: System update + swap ──"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y -o Dpkg::Options::="--force-confnew"
apt-get install -y curl wget git build-essential pkg-config \
    software-properties-common ca-certificates gnupg openssl ufw

# 2 GB swap (RAM only 2 GB — needed for safety)
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# Timezone
timedatectl set-timezone Europe/Moscow || true

# Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ─────────────────────────────────────────────────────────────────────
# 2. Non-root user
# ─────────────────────────────────────────────────────────────────────
echo "── Step 2: App user ──"
if ! id "$APP_USER" &>/dev/null; then
    adduser --disabled-password --gecos "" "$APP_USER"
    usermod -aG sudo "$APP_USER"
fi

# ─────────────────────────────────────────────────────────────────────
# 3. Python 3.11 (deadsnakes)
# ─────────────────────────────────────────────────────────────────────
echo "── Step 3: Python 3.11 ──"
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update -y
apt-get install -y python3.11 python3.11-venv python3.11-dev python3.11-distutils

# ─────────────────────────────────────────────────────────────────────
# 4. PostgreSQL 14
# ─────────────────────────────────────────────────────────────────────
echo "── Step 4: PostgreSQL ──"
apt-get install -y postgresql postgresql-contrib libpq-dev
systemctl enable --now postgresql

# Drop+create idempotently
sudo -u postgres psql <<EOF
DROP DATABASE IF EXISTS ${DB_NAME};
DROP USER IF EXISTS ${DB_USER};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';
ALTER ROLE ${DB_USER} SET default_transaction_isolation TO 'read committed';
ALTER ROLE ${DB_USER} SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
EOF

# Postgres tuning for 2 GB RAM
PG_CONF=/etc/postgresql/14/main/postgresql.conf
sed -i "s/^#\?shared_buffers.*/shared_buffers = 256MB/" $PG_CONF
sed -i "s/^#\?effective_cache_size.*/effective_cache_size = 768MB/" $PG_CONF
sed -i "s/^#\?work_mem.*/work_mem = 8MB/" $PG_CONF
sed -i "s/^#\?maintenance_work_mem.*/maintenance_work_mem = 64MB/" $PG_CONF
systemctl restart postgresql

# ─────────────────────────────────────────────────────────────────────
# 5. Redis 7
# ─────────────────────────────────────────────────────────────────────
echo "── Step 5: Redis ──"
apt-get install -y redis-server
sed -i "s/^# *maxmemory <bytes>/maxmemory 256mb/" /etc/redis/redis.conf
sed -i "s/^# *maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf
systemctl enable --now redis-server

# ─────────────────────────────────────────────────────────────────────
# 6. Nginx + Certbot
# ─────────────────────────────────────────────────────────────────────
echo "── Step 6: Nginx + Certbot ──"
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable --now nginx
rm -f /etc/nginx/sites-enabled/default

# ─────────────────────────────────────────────────────────────────────
# 7. Node.js 20
# ─────────────────────────────────────────────────────────────────────
echo "── Step 7: Node.js 20 ──"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# ─────────────────────────────────────────────────────────────────────
# 8. Clone repo
# ─────────────────────────────────────────────────────────────────────
echo "── Step 8: Clone repo ──"
if [ ! -d "$APP_DIR" ]; then
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
else
    sudo -u "$APP_USER" -- git -C "$APP_DIR" pull
fi
mkdir -p "$APP_DIR/logs"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ─────────────────────────────────────────────────────────────────────
# 9. Backend setup
# ─────────────────────────────────────────────────────────────────────
echo "── Step 9: Backend venv + deps ──"
sudo -u "$APP_USER" bash <<EOF
set -e
cd "$APP_DIR/backend"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
pip install gunicorn psycopg2-binary || true
EOF

# .env
echo "── Step 9b: .env ──"
cat > "$APP_DIR/backend/.env" <<EOF
DJANGO_SECRET_KEY=${DJANGO_SECRET}
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=${DOMAIN},localhost,127.0.0.1,82.117.245.92
CSRF_TRUSTED_ORIGINS=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}

DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_HOST=127.0.0.1
DB_PORT=5432

REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/1
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/2

STRAVA_CLIENT_ID=PUT_REAL_ID_HERE
STRAVA_CLIENT_SECRET=PUT_REAL_SECRET_HERE
STRAVA_REDIRECT_URI=https://${DOMAIN}/api/integrations/strava/callback/

SIMPLE_JWT_SIGNING_KEY=${JWT_SECRET}
OPENWEATHERMAP_API_KEY=
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/backend/.env"
chmod 600 "$APP_DIR/backend/.env"

# Migrations + static
echo "── Step 9c: Migrations + static ──"
sudo -u "$APP_USER" bash <<EOF
set -e
cd "$APP_DIR/backend"
source venv/bin/activate
set -a; source .env; set +a
python manage.py migrate --noinput
python manage.py collectstatic --noinput
EOF

# Load marathon fixtures if exist
if sudo -u "$APP_USER" ls "$APP_DIR/backend/fixtures/marathons.json" 2>/dev/null; then
    sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py loaddata fixtures/marathons.json" || true
fi

# Or run management command if exists
if sudo -u "$APP_USER" ls "$APP_DIR/backend/apps/races/management/commands/import_marathons.py" 2>/dev/null; then
    sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py import_marathons" || true
fi

# Seed legal policies
if sudo -u "$APP_USER" ls "$APP_DIR/backend/apps/legal/management/commands/seed_policies.py" 2>/dev/null; then
    sudo -u "$APP_USER" bash -c "cd $APP_DIR/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py seed_policies" || true
fi

# ─────────────────────────────────────────────────────────────────────
# 10. Frontend build
# ─────────────────────────────────────────────────────────────────────
echo "── Step 10: Frontend build ──"
sudo -u "$APP_USER" bash <<EOF
set -e
cd "$APP_DIR/frontend"
echo "VITE_API_URL=https://${DOMAIN}/api" > .env.production
echo "VITE_APP_ENV=production" >> .env.production
npm ci || npm install
NODE_OPTIONS="--max-old-space-size=1024" npm run build
EOF

# ─────────────────────────────────────────────────────────────────────
# 11. systemd services
# ─────────────────────────────────────────────────────────────────────
echo "── Step 11: systemd services ──"

# Detect WSGI module path (config.wsgi vs backend.wsgi)
WSGI_MODULE="config.wsgi"
if [ -f "$APP_DIR/backend/backend/wsgi.py" ]; then
    WSGI_MODULE="backend.wsgi"
fi
if [ -f "$APP_DIR/backend/enduranceai/wsgi.py" ]; then
    WSGI_MODULE="enduranceai.wsgi"
fi
# Find any wsgi.py
ACTUAL_WSGI=$(find $APP_DIR/backend -maxdepth 3 -name 'wsgi.py' -not -path '*/venv/*' | head -1)
if [ -n "$ACTUAL_WSGI" ]; then
    WSGI_DIR=$(dirname "$ACTUAL_WSGI")
    WSGI_PKG=$(basename "$WSGI_DIR")
    WSGI_MODULE="${WSGI_PKG}.wsgi"
fi
echo "Detected WSGI module: $WSGI_MODULE"

# Detect Celery app
CELERY_APP="config"
if [ -f "$APP_DIR/backend/backend/celery.py" ]; then CELERY_APP="backend"; fi
if [ -f "$APP_DIR/backend/enduranceai/celery.py" ]; then CELERY_APP="enduranceai"; fi
ACTUAL_CELERY=$(find $APP_DIR/backend -maxdepth 3 -name 'celery.py' -not -path '*/venv/*' | head -1)
if [ -n "$ACTUAL_CELERY" ]; then
    CELERY_APP=$(basename $(dirname "$ACTUAL_CELERY"))
fi
echo "Detected Celery app: $CELERY_APP"

cat > /etc/systemd/system/enduranceai-gunicorn.service <<EOF
[Unit]
Description=EnduranceAI Gunicorn
After=network.target postgresql.service redis-server.service

[Service]
Type=notify
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${VENV}/bin"
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${VENV}/bin/gunicorn \\
    --workers 2 \\
    --worker-class sync \\
    --timeout 60 \\
    --bind 127.0.0.1:8000 \\
    --access-logfile ${APP_DIR}/logs/gunicorn-access.log \\
    --error-logfile ${APP_DIR}/logs/gunicorn-error.log \\
    ${WSGI_MODULE}:application
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/enduranceai-celery.service <<EOF
[Unit]
Description=EnduranceAI Celery Worker
After=network.target redis-server.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${VENV}/bin"
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${VENV}/bin/celery -A ${CELERY_APP} worker --loglevel=info --concurrency=2 --logfile=${APP_DIR}/logs/celery-worker.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/enduranceai-celerybeat.service <<EOF
[Unit]
Description=EnduranceAI Celery Beat
After=network.target redis-server.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${VENV}/bin"
EnvironmentFile=${APP_DIR}/backend/.env
ExecStart=${VENV}/bin/celery -A ${CELERY_APP} beat --loglevel=info --logfile=${APP_DIR}/logs/celery-beat.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat
systemctl restart enduranceai-gunicorn || systemctl status enduranceai-gunicorn --no-pager
systemctl restart enduranceai-celery || systemctl status enduranceai-celery --no-pager
systemctl restart enduranceai-celerybeat || systemctl status enduranceai-celerybeat --no-pager

# ─────────────────────────────────────────────────────────────────────
# 12. Nginx config
# ─────────────────────────────────────────────────────────────────────
echo "── Step 12: Nginx config ──"
cat > /etc/nginx/sites-available/enduranceai <<EOF
upstream enduranceai_backend {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 200M;
    client_body_timeout 120s;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    root ${APP_DIR}/frontend/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /static/ {
        alias ${APP_DIR}/backend/staticfiles/;
        expires 30d;
        access_log off;
    }

    location /media/ {
        alias ${APP_DIR}/backend/media/;
        expires 7d;
    }

    location /admin/ {
        proxy_pass http://enduranceai_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://enduranceai_backend;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/enduranceai /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ─────────────────────────────────────────────────────────────────────
# 13. SSL via Certbot
# ─────────────────────────────────────────────────────────────────────
echo "── Step 13: SSL Certbot ──"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@yuzapp.space" --redirect || \
  echo "!! Certbot failed — try manually:  certbot --nginx -d $DOMAIN"

# ─────────────────────────────────────────────────────────────────────
# 14. Done — print summary
# ─────────────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ DEPLOY COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Site:        https://${DOMAIN}"
echo "🔑 DB password: ${DB_PASS}"
echo "📝 Log:         $LOG"
echo "📁 App dir:     $APP_DIR"
echo ""
echo "⚠️  NEXT STEPS:"
echo "  1. Edit ${APP_DIR}/backend/.env:"
echo "       - STRAVA_CLIENT_ID  = <from strava.com/settings/api>"
echo "       - STRAVA_CLIENT_SECRET = <same>"
echo "       - OPENWEATHERMAP_API_KEY = <openweathermap.org>"
echo "  2. Restart services:"
echo "       systemctl restart enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat"
echo "  3. Add to Strava panel (strava.com/settings/api):"
echo "       Authorization Callback Domain: ${DOMAIN}"
echo "  4. Create superuser:"
echo "       sudo -u ${APP_USER} bash -c 'cd ${APP_DIR}/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py createsuperuser'"
echo ""
echo "🔍 Check service status:"
echo "       systemctl status enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat nginx"
echo ""
echo "📊 Live logs:"
echo "       journalctl -u enduranceai-gunicorn -f"
echo "       tail -f ${APP_DIR}/logs/gunicorn-error.log"
echo "═══════════════════════════════════════════════════════════════════"
