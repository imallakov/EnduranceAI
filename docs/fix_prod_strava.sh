#!/usr/bin/env bash
###############################################################################
# Fix: переключить на production settings + правильный STRAVA_REDIRECT_URI
# Проблемы:
#  1. DJANGO_SETTINGS_MODULE = config.settings.development → должно быть production
#  2. STRAVA_REDIRECT_URI хардкоден в development.py на localhost
#  3. Два .env файла в разных местах — синхронизуем
###############################################################################
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"
readonly APP_USER="www-data"
readonly VENV="${APP_DIR}/backend/venv"

exec > >(tee -a /var/log/enduranceai-finish.log) 2>&1
echo "═══════════════════════════════════════════════════════"
echo "Fix prod settings + Strava: $(date)"
echo "═══════════════════════════════════════════════════════"

# ─────────────────────────────────────────────────────────────────────
# 1. Диагностика — какой .env реально читается?
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 1. Что у нас по .env файлам ──"
echo "Корневой /var/www/enduranceai/.env :"
[ -f ${APP_DIR}/.env ] && head -5 ${APP_DIR}/.env || echo "(нет)"
echo ""
echo "Backend /var/www/enduranceai/backend/.env :"
[ -f ${APP_DIR}/backend/.env ] && grep -E '^(DJANGO_SETTINGS|STRAVA_REDIRECT|DB_USER|DEBUG)' ${APP_DIR}/backend/.env || echo "(нет)"
echo ""

echo "── 2. Settings структура ──"
ls ${APP_DIR}/backend/config/settings/ 2>/dev/null || ls ${APP_DIR}/backend/config/
echo ""

# Найдём упоминание STRAVA_REDIRECT_URI в коде
echo "── 3. Где STRAVA_REDIRECT_URI задаётся в коде ──"
grep -rn "STRAVA_REDIRECT_URI\|STRAVA.*localhost\|STRAVA.*8000" \
    ${APP_DIR}/backend/config/ \
    ${APP_DIR}/backend/apps/integrations/ 2>/dev/null | head -20
echo ""

# ─────────────────────────────────────────────────────────────────────
# 4. Создаём ЕДИНЫЙ корректный backend/.env с production настройками
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 4. Обновляем backend/.env: production + правильный Strava ──"

ENV_FILE="${APP_DIR}/backend/.env"
[ -f "$ENV_FILE" ] && cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%s)"

# Возьмём DB_PASSWORD из текущего .env (если есть) или используем известный
CURRENT_DB_PASS=$(grep '^DB_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || echo "E5MbgDjrt7NEMIppHw54yLs1")
CURRENT_SECRET=$(grep '^DJANGO_SECRET_KEY=\|^SECRET_KEY=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2 || openssl rand -base64 50 | tr -d '\n')
[ -z "$CURRENT_SECRET" ] && CURRENT_SECRET=$(openssl rand -base64 50 | tr -d '\n')
JWT_SEC=$(grep '^SIMPLE_JWT_SIGNING_KEY=' "$ENV_FILE" 2>/dev/null | cut -d= -f2 || openssl rand -base64 50 | tr -d '\n')
[ -z "$JWT_SEC" ] && JWT_SEC=$(openssl rand -base64 50 | tr -d '\n')

cat > "$ENV_FILE" <<EOF
# Django core — PRODUCTION
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=${CURRENT_SECRET}
SECRET_KEY=${CURRENT_SECRET}
DJANGO_DEBUG=False
DEBUG=False

# Hosts / CSRF / CORS
DJANGO_ALLOWED_HOSTS=${DOMAIN},localhost,127.0.0.1,82.117.245.92
ALLOWED_HOSTS=${DOMAIN},localhost,127.0.0.1,82.117.245.92
CSRF_TRUSTED_ORIGINS=https://${DOMAIN}
CORS_ALLOWED_ORIGINS=https://${DOMAIN}

# Database
DB_NAME=enduranceai
DB_USER=enduranceai
DB_PASSWORD=${CURRENT_DB_PASS}
DB_HOST=127.0.0.1
DB_PORT=5432
DATABASE_URL=postgres://enduranceai:${CURRENT_DB_PASS}@127.0.0.1:5432/enduranceai

# Redis / Celery
REDIS_URL=redis://127.0.0.1:6379/0
CELERY_BROKER_URL=redis://127.0.0.1:6379/1
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/2

# Strava (Production)
STRAVA_CLIENT_ID=YOUR_STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET=YOUR_STRAVA_CLIENT_SECRET
STRAVA_REDIRECT_URI=https://${DOMAIN}/api/integrations/strava/callback/

# Weather
OPENWEATHERMAP_API_KEY=YOUR_OPENWEATHERMAP_API_KEY

# JWT
SIMPLE_JWT_SIGNING_KEY=${JWT_SEC}
EOF

chown ${APP_USER}:${APP_USER} "$ENV_FILE"
chmod 600 "$ENV_FILE"

# Дублируем .env в корне проекта (на случай если что-то его читает)
cp "$ENV_FILE" ${APP_DIR}/.env
chown ${APP_USER}:${APP_USER} ${APP_DIR}/.env
chmod 600 ${APP_DIR}/.env

echo "✓ backend/.env обновлён (production settings, Strava HTTPS)"

# ─────────────────────────────────────────────────────────────────────
# 5. Проверим production.py — есть ли там STRAVA_REDIRECT_URI hardcode
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 5. Содержимое production.py / development.py (Strava + DEBUG) ──"
if [ -f ${APP_DIR}/backend/config/settings/production.py ]; then
    echo "=== production.py (фрагменты) ==="
    grep -nE "STRAVA|DEBUG|ALLOWED_HOSTS" ${APP_DIR}/backend/config/settings/production.py | head -20
fi
echo ""
if [ -f ${APP_DIR}/backend/config/settings/development.py ]; then
    echo "=== development.py (фрагменты) ==="
    grep -nE "STRAVA|DEBUG|ALLOWED_HOSTS" ${APP_DIR}/backend/config/settings/development.py | head -20
fi
echo ""

# ─────────────────────────────────────────────────────────────────────
# 6. Patch development.py — на всякий случай (для будущего)
#    И на production.py если там STRAVA_REDIRECT_URI hardcoded
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 6. Patch hardcoded localhost в settings ──"
for f in ${APP_DIR}/backend/config/settings/development.py ${APP_DIR}/backend/config/settings/production.py; do
    if [ -f "$f" ]; then
        # Если есть hardcoded http://localhost:8000 в STRAVA_REDIRECT_URI — поменяем
        if grep -q "STRAVA_REDIRECT_URI.*localhost" "$f"; then
            echo "Found hardcoded localhost в $f, patching..."
            sed -i "s|STRAVA_REDIRECT_URI = ['\"]http://localhost:8000[^'\"]*['\"]|STRAVA_REDIRECT_URI = os.environ.get('STRAVA_REDIRECT_URI', 'https://${DOMAIN}/api/integrations/strava/callback/')|g" "$f"
            grep -n "STRAVA_REDIRECT_URI" "$f" | head -2
        fi
    fi
done

# ─────────────────────────────────────────────────────────────────────
# 7. Запустить миграции в production режиме (на случай если в dev и prod разные)
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 7. Migrations + collectstatic (production) ──"
cd ${APP_DIR}/backend
sudo -u ${APP_USER} bash <<EOF
set -e
source venv/bin/activate
set -a; source .env; set +a
echo "DJANGO_SETTINGS_MODULE = \$DJANGO_SETTINGS_MODULE"
python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear
EOF

# ─────────────────────────────────────────────────────────────────────
# 8. Restart gunicorn + celery
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 8. Restart services ──"
systemctl restart enduranceai-gunicorn
systemctl restart enduranceai-celery
systemctl restart enduranceai-celerybeat
sleep 3
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
    echo "  $s: $(systemctl is-active $s)"
done

# ─────────────────────────────────────────────────────────────────────
# 9. Проверка через curl — DEBUG=False?
# ─────────────────────────────────────────────────────────────────────
echo ""
echo "── 9. Проверка ──"
echo -n "HTTPS:  "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 https://${DOMAIN}/

echo ""
echo "Тест Strava authorize endpoint (должен вернуть redirect на strava.com):"
curl -sI -k --max-time 5 https://${DOMAIN}/api/integrations/strava/authorize/ | grep -E "^(HTTP|Location)" | head -3
echo ""

echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО"
echo ""
echo "⚠️ Что проверить:"
echo "  1. Зайди на сайт в incognito (Ctrl+Shift+N) → https://${DOMAIN}"
echo "  2. Залогинься, попробуй привязать Strava"
echo "  3. После авторизации в Strava тебя должно вернуть на https://${DOMAIN}/..."
echo "     (НЕ на localhost:8000!)"
echo ""
echo "⚠️ В Strava панели (страница Edit Application):"
echo "  Authorization Callback Domain: ${DOMAIN}"
echo "  (БЕЗ https://, БЕЗ /api/...)"
echo ""
echo "Если страничка ошибки Strava — пришли URL который видишь"
echo "═══════════════════════════════════════════════════════"
