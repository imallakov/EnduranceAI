#!/usr/bin/env bash
###############################################################################
# Завершение деплоя поверх того что Gemini уже сделал
# Путь: /var/www/enduranceai/, user: www-data, WSGI: config
###############################################################################
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"
readonly APP_USER="www-data"
readonly VENV="${APP_DIR}/backend/venv"
readonly LOG="/var/log/enduranceai-continue.log"

mkdir -p "$(dirname "$LOG")"
exec > >(tee -a "$LOG") 2>&1
echo "═══════════════════════════════════════════════════════"
echo "Continue deploy started: $(date)"
echo "═══════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────
# 1. Swap (КРИТИЧНО — без него npm build уронит сервер)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 1. Swap 2 GB ──"
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "✓ Swap создан"
else
    swapon /swapfile 2>/dev/null || true
    echo "✓ Swap уже есть"
fi
free -h | head -3

# ─────────────────────────────────────────────────────────────────────
# 2. Остановим manual Celery (мы его пересоздадим через systemd)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 2. Остановка manual Celery ──"
pkill -f "celery -A config" || true
sleep 2
echo "✓ Manual Celery остановлен"

# ─────────────────────────────────────────────────────────────────────
# 3. Firewall
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 3. Firewall (UFW) ──"
apt-get install -y ufw >/dev/null 2>&1 || true
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true
echo "✓ Firewall настроен"

# ─────────────────────────────────────────────────────────────────────
# 4. Frontend .env.production + build
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 4. Frontend .env.production ──"
cat > ${APP_DIR}/frontend/.env.production <<EOF
VITE_API_URL=https://${DOMAIN}/api
VITE_APP_ENV=production
EOF
chown ${APP_USER}:${APP_USER} ${APP_DIR}/frontend/.env.production
echo "✓ .env.production создан"

echo ""
echo "── 5. Build frontend (~3-5 мин, использует swap) ──"
cd ${APP_DIR}/frontend
sudo -u ${APP_USER} NODE_OPTIONS="--max-old-space-size=1024" npm run build
if [ -d ${APP_DIR}/frontend/dist ]; then
    echo "✓ dist/ собран ($(du -sh ${APP_DIR}/frontend/dist | cut -f1))"
else
    echo "✗ dist/ НЕ собран — деплой остановлен"
    exit 1
fi

# ─────────────────────────────────────────────────────────────────────
# 6. Гарантированно выполним миграции + collectstatic
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 6. Django migrations + collectstatic ──"
cd ${APP_DIR}/backend
sudo -u ${APP_USER} bash <<EOF
set -e
source venv/bin/activate
set -a; source .env; set +a
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
EOF
echo "✓ Migrations + collectstatic OK"

# Опционально: загрузка марафонов и политик
echo ""
echo "── 6b. Опциональные fixtures/commands ──"
sudo -u ${APP_USER} bash <<'EOF' || true
cd /var/www/enduranceai/backend
source venv/bin/activate
set -a; source .env; set +a

# Marathons fixture
if [ -f fixtures/marathons.json ]; then
    python manage.py loaddata fixtures/marathons.json && echo "✓ marathons loaded" || echo "marathons skip"
fi

# Import marathons command
if [ -f apps/races/management/commands/import_marathons.py ]; then
    python manage.py import_marathons 2>&1 | tail -3 || echo "import_marathons skip"
fi

# Seed legal policies
if [ -f apps/legal/management/commands/seed_policies.py ]; then
    python manage.py seed_policies 2>&1 | tail -3 || echo "seed_policies skip"
fi
EOF

# ─────────────────────────────────────────────────────────────────────
# 7. systemd: gunicorn
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 7. systemd services ──"
mkdir -p ${APP_DIR}/logs
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}/logs

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
    config.wsgi:application
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
ExecStart=${VENV}/bin/celery -A config worker --loglevel=info --concurrency=2 --logfile=${APP_DIR}/logs/celery-worker.log
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
ExecStart=${VENV}/bin/celery -A config beat --loglevel=info --logfile=${APP_DIR}/logs/celery-beat.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Убедимся что gunicorn установлен в venv
sudo -u ${APP_USER} ${VENV}/bin/pip install gunicorn psycopg2-binary 2>&1 | tail -3

systemctl daemon-reload
systemctl enable enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat
systemctl restart enduranceai-gunicorn
systemctl restart enduranceai-celery
systemctl restart enduranceai-celerybeat
sleep 3
echo ""
echo "Состояние сервисов:"
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
    echo "  $s: $(systemctl is-active $s)"
done

# ─────────────────────────────────────────────────────────────────────
# 8. Nginx — переписываем правильный конфиг (без proxy_addrs)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 8. Nginx config (исправление ошибки 'proxy_addrs') ──"
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/enduranceai

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

ln -sf /etc/nginx/sites-available/enduranceai /etc/nginx/sites-enabled/enduranceai
nginx -t
systemctl enable nginx
systemctl restart nginx
sleep 2
echo "✓ Nginx состояние: $(systemctl is-active nginx)"

# ─────────────────────────────────────────────────────────────────────
# 9. SSL certbot
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 9. SSL (Let's Encrypt) ──"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@yuzapp.space --redirect || \
    echo "!! Certbot не отработал автоматически — попробуй вручную: certbot --nginx -d ${DOMAIN}"

# ─────────────────────────────────────────────────────────────────────
# 10. Финальная проверка
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "ФИНАЛЬНАЯ ПРОВЕРКА"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Сервисы:"
systemctl is-active enduranceai-gunicorn nginx postgresql redis-server enduranceai-celery enduranceai-celerybeat
echo ""
echo "Что слушает на портах 80/443/8000:"
ss -tlnp | grep -E ":(80|443|8000)\s"
echo ""
echo "HTTP-ответы:"
echo -n "  HTTP:  "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 http://${DOMAIN}/ || echo "fail"
echo -n "  HTTPS: "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 https://${DOMAIN}/ || echo "fail"
echo ""
echo "Содержимое .env (без секретов):"
grep -E '^[A-Z_]+=' ${APP_DIR}/backend/.env | sed 's/=.*/=<HIDDEN>/'
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "🌐 Сайт: https://${DOMAIN}"
echo ""
echo "⚠️ Что проверить:"
echo "  1. Содержимое /var/www/enduranceai/backend/.env — есть ли там"
echo "     STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REDIRECT_URI?"
echo "     Если нет/пусто — добавь и перезапусти:"
echo "       systemctl restart enduranceai-gunicorn"
echo ""
echo "  2. Создай superuser для админки:"
echo "       sudo -u ${APP_USER} bash -c 'cd ${APP_DIR}/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py createsuperuser'"
echo ""
echo "  3. Strava panel (strava.com/settings/api):"
echo "       Authorization Callback Domain: ${DOMAIN}"
echo ""
echo "Логи если что-то падает:"
echo "  journalctl -u enduranceai-gunicorn -n 50"
echo "  tail -f ${APP_DIR}/logs/gunicorn-error.log"
echo ""
