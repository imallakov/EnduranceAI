#!/usr/bin/env bash
###############################################################################
# Минимальный fix: переключить backend на production mode
# Только 3 правки в .env через sed + патч development.py если нужно
###############################################################################
set -e

readonly DOMAIN="endurance.yuzapp.space"
readonly APP_DIR="/var/www/enduranceai"
readonly ENV_FILE="${APP_DIR}/backend/.env"

echo "═══════════════════════════════════════════════════════"
echo "Quick fix: production + Strava URL"
echo "═══════════════════════════════════════════════════════"

# 1. Backup
cp "$ENV_FILE" "${ENV_FILE}.before-prod"
echo "✓ Backup → ${ENV_FILE}.before-prod"

# 2. Меняем DJANGO_SETTINGS_MODULE → production
sed -i 's|DJANGO_SETTINGS_MODULE=config.settings.development|DJANGO_SETTINGS_MODULE=config.settings.production|' "$ENV_FILE"

# 3. Меняем STRAVA_REDIRECT_URI → https + правильный домен
sed -i "s|STRAVA_REDIRECT_URI=http://localhost:8000|STRAVA_REDIRECT_URI=https://${DOMAIN}|" "$ENV_FILE"
sed -i "s|STRAVA_REDIRECT_URI=http://${DOMAIN}|STRAVA_REDIRECT_URI=https://${DOMAIN}|" "$ENV_FILE"

# 4. Добавим FRONTEND_URL если его нет (для редиректа после Strava callback)
grep -q "^FRONTEND_URL=" "$ENV_FILE" || echo "FRONTEND_URL=https://${DOMAIN}" >> "$ENV_FILE"
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" "$ENV_FILE"

# 5. SECRET_KEY: insecure dev-key → новый случайный
if grep -q "django-insecure-enduranceai-dev-key" "$ENV_FILE"; then
    NEW_SECRET=$(openssl rand -base64 50 | tr -d '\n' | tr -d '/+=')
    sed -i "s|SECRET_KEY=django-insecure-enduranceai-dev-key-change-in-production|SECRET_KEY=${NEW_SECRET}|" "$ENV_FILE"
    sed -i "s|DJANGO_SECRET_KEY=django-insecure-enduranceai-dev-key-change-in-production|DJANGO_SECRET_KEY=${NEW_SECRET}|" "$ENV_FILE"
    echo "✓ SECRET_KEY заменён на случайный"
fi

# 6. REDIS_URL: убедимся что 127.0.0.1 а не localhost (для celery)
sed -i "s|REDIS_URL=redis://localhost:6379|REDIS_URL=redis://127.0.0.1:6379|" "$ENV_FILE"

echo ""
echo "── Текущий .env (без секретов) ──"
grep -E '^[A-Z_]+=' "$ENV_FILE" | grep -vE 'SECRET|PASSWORD|KEY' || true
echo "[DB_PASSWORD, SECRET_KEY, JWT_KEY скрыты]"

# 7. Патч hardcoded localhost в development.py / production.py / любом settings
echo ""
echo "── Поиск hardcoded localhost в settings ──"
for f in $(find ${APP_DIR}/backend/config/settings/ -name "*.py" 2>/dev/null); do
    if grep -qE "localhost:(5173|8000)" "$f"; then
        echo "Найдено в: $f"
        grep -nE "localhost:(5173|8000)" "$f"
    fi
done

# 8. Покажем production.py — есть ли нужные настройки
echo ""
echo "── production.py содержимое (если есть) ──"
PROD="${APP_DIR}/backend/config/settings/production.py"
if [ -f "$PROD" ]; then
    cat "$PROD"
else
    echo "✗ production.py НЕТ — нужно создать"
fi

# 9. Если production.py нет — создадим базовый
if [ ! -f "$PROD" ]; then
    echo ""
    echo "── Создаём production.py на основе development.py ──"
    DEV="${APP_DIR}/backend/config/settings/development.py"
    if [ -f "$DEV" ]; then
        cp "$DEV" "$PROD"
        # Заменим hardcoded URL
        sed -i "s|localhost:5173|${DOMAIN}|g" "$PROD"
        sed -i "s|localhost:8000|${DOMAIN}|g" "$PROD"
        sed -i "s|http://${DOMAIN}|https://${DOMAIN}|g" "$PROD"
        # DEBUG False
        sed -i 's|^DEBUG = True|DEBUG = False|' "$PROD"
        chown www-data:www-data "$PROD"
        echo "✓ production.py создан на основе development.py с правильными URL"
    fi
fi

# 10. Restart
echo ""
echo "── Restart gunicorn + celery ──"
systemctl restart enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat
sleep 3
for s in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
    echo "  $s: $(systemctl is-active $s)"
done

# Если gunicorn упал — покажем почему
if [ "$(systemctl is-active enduranceai-gunicorn)" != "active" ]; then
    echo ""
    echo "!! Gunicorn НЕ запустился. Последние ошибки:"
    journalctl -u enduranceai-gunicorn -n 30 --no-pager
fi

# 11. Тест
echo ""
echo "── Тест ──"
echo -n "  HTTPS:  "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 https://${DOMAIN}/
echo -n "  /api/users/me/ (должен быть 401): "; curl -sI -o /dev/null -w "%{http_code}\n" --max-time 10 https://${DOMAIN}/api/users/me/

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ ГОТОВО"
echo ""
echo "Теперь:"
echo "1) Открой https://${DOMAIN} в incognito"
echo "2) Залогинься, иди в Settings → Connect Strava"
echo "3) После Strava ты должен вернуться на https://${DOMAIN}/settings"
echo ""
echo "Если опять invalid_state — попробуй ещё раз. State может слететь"
echo "из-за рестарта. Со второй попытки должно сработать."
echo "═══════════════════════════════════════════════════════"
