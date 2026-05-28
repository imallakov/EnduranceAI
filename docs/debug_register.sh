#!/usr/bin/env bash
# Диагностика ошибки регистрации/логина
echo "═══════════════════════════════════════════════════════"
echo " Debug login/register — $(date)"
echo "═══════════════════════════════════════════════════════"

APP_DIR="/var/www/enduranceai"
DOMAIN="endurance.yuzapp.space"

echo ""
echo "── 1. Gunicorn последние 50 строк ошибок ──"
tail -80 ${APP_DIR}/logs/gunicorn-error.log 2>/dev/null | tail -50
echo ""
echo "── 1b. systemd журнал gunicorn ──"
journalctl -u enduranceai-gunicorn -n 30 --no-pager
echo ""

echo "── 2. Nginx error log ──"
tail -30 /var/log/nginx/error.log 2>/dev/null
echo ""

echo "── 3. Nginx access log (последние 20 запросов к /api/) ──"
grep '/api/' /var/log/nginx/access.log | tail -20
echo ""

echo "── 4. Какие URL вообще есть в API (Django) ──"
sudo -u www-data bash <<'EOF'
cd /var/www/enduranceai/backend
source venv/bin/activate
set -a; source .env; set +a
python manage.py show_urls 2>/dev/null | grep -E "(auth|user|register|login|token)" | head -20 || \
  python -c "
from django.urls import get_resolver
from django.conf import settings
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.urls import URLPattern, URLResolver
def show(patterns, prefix=''):
    for p in patterns:
        if isinstance(p, URLResolver):
            show(p.url_patterns, prefix + str(p.pattern))
        else:
            full = prefix + str(p.pattern)
            if any(k in full.lower() for k in ['auth', 'user', 'register', 'login', 'token']):
                print(f'  {full}  →  {p.callback.__name__ if hasattr(p.callback,\"__name__\") else p.callback}')
show(get_resolver().url_patterns)
"
EOF
echo ""

echo "── 5. CURL тест: GET /api/ (есть ли API root) ──"
curl -sI -k --max-time 5 https://${DOMAIN}/api/ | head -5
echo ""

echo "── 6. CURL тест: POST /api/users/register/ ──"
curl -sk -X POST https://${DOMAIN}/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpass123","password2":"testpass123","first_name":"Test","last_name":"Test"}' \
  -w "\n[HTTP code: %{http_code}]\n" | head -20
echo ""

echo "── 7. CURL тест альтернативного URL: POST /api/auth/register/ ──"
curl -sk -X POST https://${DOMAIN}/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test2@test.com","password":"testpass123"}' \
  -w "\n[HTTP code: %{http_code}]\n" | head -20
echo ""

echo "── 8. .env: проверка ALLOWED_HOSTS / CSRF / DEBUG ──"
grep -E '^(DEBUG|DJANGO_DEBUG|DJANGO_ALLOWED_HOSTS|ALLOWED_HOSTS|CSRF_TRUSTED|CORS_)' ${APP_DIR}/backend/.env
echo ""

echo "── 9. Проверка таблиц в БД ──"
sudo -u postgres psql -d enduranceai -c "\dt" 2>&1 | head -30
echo ""

echo "═══════════════════════════════════════════════════════"
