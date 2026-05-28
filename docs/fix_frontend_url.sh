#!/usr/bin/env bash
###############################################################################
# Найти и заменить ВСЕ упоминания localhost:5173 в backend коде
# (production.py наследуется от base.py — там скорее всего hardcoded URL)
###############################################################################
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"

echo "═══════════════════════════════════════════════════════"
echo "Fix hardcoded localhost:5173 in backend"
echo "═══════════════════════════════════════════════════════"

# 1. Найдём ВСЕ файлы где есть localhost:5173
echo ""
echo "── 1. Все упоминания localhost:5173 в backend ──"
grep -rn "localhost:5173" ${APP_DIR}/backend --include='*.py' 2>/dev/null | grep -v venv | grep -v __pycache__ || echo "(не найдено)"
echo ""

echo "── 2. Все упоминания FRONTEND_URL в backend ──"
grep -rn "FRONTEND_URL\|frontend_url" ${APP_DIR}/backend --include='*.py' 2>/dev/null | grep -v venv | grep -v __pycache__ || echo "(не найдено)"
echo ""

# 3. Покажем Strava callback view — где формируется redirect
echo "── 3. Strava callback view (где идёт redirect) ──"
find ${APP_DIR}/backend -name "*.py" -not -path "*/venv/*" -not -path "*/__pycache__/*" \
    -exec grep -lE "strava.*callback|integrations.*callback" {} \; 2>/dev/null | while read f; do
    echo ""
    echo "=== $f ==="
    grep -nE "redirect|HttpResponseRedirect|FRONTEND_URL|localhost" "$f" | head -10
done

# 4. Backup и patch — заменяем localhost:5173 на правильный URL
echo ""
echo "── 4. Patch: localhost:5173 → https://${DOMAIN} ──"
BACKUP_DIR="/root/backend-backup-$(date +%s)"
mkdir -p "$BACKUP_DIR"

# Бэкапим все файлы которые будем менять
for f in $(grep -rl "localhost:5173" ${APP_DIR}/backend --include='*.py' 2>/dev/null | grep -v venv | grep -v __pycache__); do
    rel=$(echo "$f" | sed "s|${APP_DIR}/backend/||")
    backup_path="${BACKUP_DIR}/${rel}"
    mkdir -p "$(dirname "$backup_path")"
    cp "$f" "$backup_path"
    echo "Patching: $f"
    sed -i "s|http://localhost:5173|https://${DOMAIN}|g" "$f"
    sed -i "s|https://localhost:5173|https://${DOMAIN}|g" "$f"
    sed -i "s|localhost:5173|${DOMAIN}|g" "$f"
done

# Также localhost:8000 (на всякий случай — в URL могут быть API endpoint hardcode)
for f in $(grep -rl "localhost:8000" ${APP_DIR}/backend --include='*.py' 2>/dev/null | grep -v venv | grep -v __pycache__); do
    rel=$(echo "$f" | sed "s|${APP_DIR}/backend/||")
    backup_path="${BACKUP_DIR}/${rel}"
    mkdir -p "$(dirname "$backup_path")"
    [ ! -f "$backup_path" ] && cp "$f" "$backup_path"
    echo "Patching localhost:8000 in: $f"
    sed -i "s|http://localhost:8000|https://${DOMAIN}|g" "$f"
    sed -i "s|localhost:8000|${DOMAIN}|g" "$f"
done

echo ""
echo "Backup сохранён: $BACKUP_DIR"

# 5. Добавим FRONTEND_URL в .env (на всякий случай)
ENV_FILE="${APP_DIR}/backend/.env"
if ! grep -q "^FRONTEND_URL=" "$ENV_FILE"; then
    echo "FRONTEND_URL=https://${DOMAIN}" >> "$ENV_FILE"
    echo "✓ Добавлен FRONTEND_URL в .env"
fi

# 6. Restart
echo ""
echo "── 5. Restart gunicorn + celery ──"
systemctl restart enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat
sleep 3
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
    echo "  $s: $(systemctl is-active $s)"
done

# Если gunicorn упал
if [ "$(systemctl is-active enduranceai-gunicorn)" != "active" ]; then
    echo ""
    echo "!! Gunicorn НЕ запустился. Откатываем patch и показываем ошибку:"
    for f in $(find "$BACKUP_DIR" -name "*.py"); do
        rel=$(echo "$f" | sed "s|${BACKUP_DIR}/||")
        cp "$f" "${APP_DIR}/backend/${rel}"
    done
    systemctl restart enduranceai-gunicorn
    journalctl -u enduranceai-gunicorn -n 30 --no-pager
fi

# 7. Проверка — что осталось из localhost
echo ""
echo "── 6. После patch'а — что осталось ──"
echo "localhost:5173 в backend:"
grep -rn "localhost:5173" ${APP_DIR}/backend --include='*.py' 2>/dev/null | grep -v venv | grep -v __pycache__ | grep -v "$BACKUP_DIR" | head -5 || echo "  ✓ ВСЁ ОЧИЩЕНО"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО"
echo ""
echo "Попробуй ещё раз Strava connect:"
echo "  1. https://${DOMAIN}/settings (incognito или Ctrl+Shift+R)"
echo "  2. Connect Strava"
echo "  3. Должен вернуть на https://${DOMAIN}/settings?strava=connected"
echo ""
echo "Если ещё что-то с localhost — пришли вывод ВЕРХА скрипта"
echo "(там в начале grep показал ВСЕ упоминания localhost:5173)"
echo "═══════════════════════════════════════════════════════"
