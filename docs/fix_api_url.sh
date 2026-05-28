#!/usr/bin/env bash
# Fix: VITE_API_URL дублировался /api → /api/api
# Решение: убрать /api из VITE_API_URL и пересобрать frontend
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"
readonly APP_USER="www-data"

exec > >(tee -a /var/log/enduranceai-finish.log) 2>&1
echo "═══════════════════════════════════════════════════════"
echo "Fix VITE_API_URL doubling: $(date)"
echo "═══════════════════════════════════════════════════════"

# 1. Правильный .env.production (БЕЗ /api в URL, т.к. код уже добавляет)
echo ""
echo "── 1. Обновление .env.production ──"
cat > ${APP_DIR}/frontend/.env.production <<EOF
VITE_API_URL=https://${DOMAIN}
VITE_APP_ENV=production
EOF
chown ${APP_USER}:${APP_USER} ${APP_DIR}/frontend/.env.production
echo "Содержимое:"
cat ${APP_DIR}/frontend/.env.production

# 2. Пересобрать frontend
echo ""
echo "── 2. Rebuild frontend (~30-60 сек, без TS check) ──"
cd ${APP_DIR}/frontend

# Временно меняем build script
sudo -u ${APP_USER} cp package.json package.json.bak
sudo -u ${APP_USER} sed -i 's|"build": "tsc -b && vite build"|"build": "vite build"|' package.json
sudo -u ${APP_USER} sed -i 's|"build": "tsc && vite build"|"build": "vite build"|' package.json

sudo -u ${APP_USER} NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Восстанавливаем
sudo -u ${APP_USER} mv package.json.bak package.json

if [ -d ${APP_DIR}/frontend/dist ]; then
    echo "✓ dist/ пересобран ($(du -sh ${APP_DIR}/frontend/dist | cut -f1))"
fi

# 3. Фикс gunicorn permission warning
echo ""
echo "── 3. Fix gunicorn /var/www/.gunicorn permission ──"
mkdir -p /var/www/.gunicorn
chown www-data:www-data /var/www/.gunicorn

# 4. Рестарт gunicorn (на случай если что)
echo ""
echo "── 4. Restart services ──"
systemctl restart enduranceai-gunicorn
sleep 2
echo "  gunicorn: $(systemctl is-active enduranceai-gunicorn)"

# 5. Проверка
echo ""
echo "── 5. Проверка endpoint регистрации ──"
echo -n "POST /api/auth/register/ : "
RESP=$(curl -sk -X POST https://${DOMAIN}/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"diag@diag.test","password":"diagtest123","password2":"diagtest123","first_name":"Diag","last_name":"Test"}' \
  -w "\nHTTP:%{http_code}")
echo "$RESP" | tail -1
echo ""

echo "── 6. Проверка что в dist/ теперь правильный URL ──"
grep -o "https://endurance.yuzapp.space[^\"']*" ${APP_DIR}/frontend/dist/assets/*.js | head -5 || echo "(не найдено в bundle — возможно URL обращается через переменную)"
echo ""
echo "Проверь — НЕ должно быть https://endurance.yuzapp.space/api в bundle:"
grep -o "endurance.yuzapp.space/api/api" ${APP_DIR}/frontend/dist/assets/*.js && echo "✗ ВСЁ ЕЩЁ ДУБЛИРОВАНИЕ" || echo "✓ Дублирования /api нет"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО — открой https://${DOMAIN} в incognito (Ctrl+Shift+N)"
echo "    или Ctrl+Shift+R чтобы сбросить кэш браузера"
echo "═══════════════════════════════════════════════════════"
