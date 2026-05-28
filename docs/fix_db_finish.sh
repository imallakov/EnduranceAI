#!/usr/bin/env bash
###############################################################################
# Fix Postgres credentials + завершить деплой
# Что готово: swap, frontend dist собран, postgres+redis+nginx запущены
# Что осталось:
#   ✗ migrations (падают на auth postgres)
#   ✗ systemd services
#   ✗ nginx правильный конфиг
#   ✗ SSL
###############################################################################
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"
readonly APP_USER="www-data"
readonly VENV="${APP_DIR}/backend/venv"
readonly DB_NAME="enduranceai"
readonly DB_USER="enduranceai"
readonly DB_PASS="$(openssl rand -base64 24 | tr -d '/+=\n' | head -c 24)"

exec > >(tee -a /var/log/enduranceai-finish.log) 2>&1
echo "═══════════════════════════════════════════════════════"
echo "Fix DB + finish: $(date)"
echo "═══════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────
# 1. Покажем текущий .env (что Gemini создал)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 1. Текущий .env ──"
cat ${APP_DIR}/backend/.env | grep -v PASSWORD | grep -v SECRET | grep -v KEY
echo "[DB_PASSWORD/SECRET_KEY/JWT_KEY скрыты]"

# Backup .env
cp ${APP_DIR}/backend/.env ${APP_DIR}/backend/.env.backup-$(date +%s)

# ─────────────────────────────────────────────────────────────────────
# 2. Postgres — создать правильного пользователя + назначить owner БД
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 2. Postgres: создание пользователя ${DB_USER} ──"
sudo -u postgres psql <<EOF
DROP USER IF EXISTS ${DB_USER};
CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
ALTER ROLE ${DB_USER} SET client_encoding TO 'utf8';
ALTER ROLE ${DB_USER} SET default_transaction_isolation TO 'read committed';
ALTER ROLE ${DB_USER} SET timezone TO 'UTC';
ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
\c ${DB_NAME}
GRANT ALL ON SCHEMA public TO ${DB_USER};
GRANT ALL ON ALL TABLES IN SCHEMA public TO ${DB_USER};
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ${DB_USER};
ALTER SCHEMA public OWNER TO ${DB_USER};
EOF
echo "✓ Postgres user ${DB_USER} создан, БД ${DB_NAME} принадлежит ${DB_USER}"

# ─────────────────────────────────────────────────────────────────────
# 3. Обновить .env — поменять DB_USER и DB_PASSWORD
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 3. Обновление .env ──"
ENV_FILE="${APP_DIR}/backend/.env"

# Удалим старые DB_* строки и добавим новые
sed -i '/^DB_USER=/d' "$ENV_FILE"
sed -i '/^DB_PASSWORD=/d' "$ENV_FILE"
sed -i '/^DB_NAME=/d' "$ENV_FILE"
sed -i '/^DB_HOST=/d' "$ENV_FILE"
sed -i '/^DB_PORT=/d' "$ENV_FILE"
sed -i '/^DATABASE_URL=/d' "$ENV_FILE"
sed -i '/^DJANGO_ALLOWED_HOSTS=/d' "$ENV_FILE"
sed -i '/^CSRF_TRUSTED_ORIGINS=/d' "$ENV_FILE"

# Добавляем правильные значения
cat >> "$ENV_FILE" <<EOF

# Database (исправлено $(date))
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_HOST=127.0.0.1
DB_PORT=5432
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}

# Hosts/CSRF (для production)
DJANGO_ALLOWED_HOSTS=${DOMAIN},localhost,127.0.0.1,82.117.245.92
CSRF_TRUSTED_ORIGINS=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}
EOF

chown ${APP_USER}:${APP_USER} "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "✓ .env обновлён"

# Проверим — попробуем подключиться напрямую через psql
echo ""
echo "── 3b. Тест подключения к Postgres ──"
PGPASSWORD="${DB_PASS}" psql -h 127.0.0.1 -U ${DB_USER} -d ${DB_NAME} -c "SELECT current_user, current_database();" && echo "✓ Postgres auth OK" || { echo "✗ Postgres auth FAIL"; exit 1; }

# ─────────────────────────────────────────────────────────────────────
# 4. Migrations + collectstatic
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 4. Django migrations + collectstatic ──"
cd ${APP_DIR}/backend
sudo -u ${APP_USER} bash <<EOF
set -e
source venv/bin/activate
set -a; source .env; set +a
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
EOF

# Опциональные fixtures/commands
echo ""
echo "── 4b. Загрузка справочных данных (опционально) ──"
sudo -u ${APP_USER} bash <<'EOF' || true
cd /var/www/enduranceai/backend
source venv/bin/activate
set -a; source .env; set +a
[ -f fixtures/marathons.json ] && python manage.py loaddata fixtures/marathons.json && echo "✓ marathons loaded"
[ -f apps/races/management/commands/import_marathons.py ] && python manage.py import_marathons 2>&1 | tail -3
[ -f apps/legal/management/commands/seed_policies.py ] && python manage.py seed_policies 2>&1 | tail -3
EOF

# Установим gunicorn если ещё не установлен
sudo -u ${APP_USER} ${VENV}/bin/pip install gunicorn psycopg2-binary 2>&1 | tail -2

# ─────────────────────────────────────────────────────────────────────
# 5. systemd services
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 5. systemd services ──"
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

systemctl daemon-reload
systemctl enable enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat
systemctl restart enduranceai-gunicorn
systemctl restart enduranceai-celery
systemctl restart enduranceai-celerybeat
sleep 4
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
    echo "  $s: $(systemctl is-active $s)"
done

# Если gunicorn не запустился — покажем ошибку
if [ "$(systemctl is-active enduranceai-gunicorn)" != "active" ]; then
    echo ""
    echo "!! Gunicorn не запустился. Последние логи:"
    journalctl -u enduranceai-gunicorn -n 20 --no-pager
fi

# ─────────────────────────────────────────────────────────────────────
# 6. Nginx config
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 6. Nginx config ──"
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
echo "✓ Nginx: $(systemctl is-active nginx)"

# ─────────────────────────────────────────────────────────────────────
# 7. SSL
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 7. SSL Let's Encrypt ──"
certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@yuzapp.space --redirect || \
    echo "!! SSL вручную: certbot --nginx -d ${DOMAIN}"

# ─────────────────────────────────────────────────────────────────────
# 8. Финал
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
echo "ФИНАЛ"
echo "═══════════════════════════════════════════════════════"
echo "Сервисы:"
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat nginx postgresql redis-server; do
    echo "  $s: $(systemctl is-active $s)"
done
echo ""
echo "Порты:"
ss -tlnp 2>/dev/null | grep -E ":(80|443|8000)\s"
echo ""
echo "HTTP-ответы:"
echo -n "  HTTP:  "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 http://${DOMAIN}/
echo -n "  HTTPS: "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 https://${DOMAIN}/
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО"
echo ""
echo "🌐 https://${DOMAIN}"
echo "🔑 DB password (запиши): ${DB_PASS}"
echo ""
echo "⚠️ Следующие шаги:"
echo "  1. Проверь Strava ключи в .env:"
echo "       grep STRAVA ${APP_DIR}/backend/.env"
echo "     Если пусто — добавь:"
echo "       nano ${APP_DIR}/backend/.env"
echo "       (STRAVA_CLIENT_ID=, STRAVA_CLIENT_SECRET=, STRAVA_REDIRECT_URI=https://${DOMAIN}/api/integrations/strava/callback/)"
echo "       systemctl restart enduranceai-gunicorn"
echo ""
echo "  2. Создай superuser:"
echo "       sudo -u ${APP_USER} bash -c 'cd ${APP_DIR}/backend && source venv/bin/activate && set -a && source .env && set +a && python manage.py createsuperuser'"
echo ""
echo "═══════════════════════════════════════════════════════"
