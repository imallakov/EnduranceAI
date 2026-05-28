#!/usr/bin/env bash
# Диагностика — что Gemini успел сделать на сервере
# Запускать как root на сервере: bash check_status.sh

echo "═══════════════════════════════════════════════════════"
echo " EnduranceAI VPS state check — $(date)"
echo "═══════════════════════════════════════════════════════"

echo ""
echo "── 1. Запущенные процессы деплоя ──"
ps aux | grep -E "(pip|npm|node|webpack|vite|gunicorn|celery|certbot)" | grep -v grep | head -10
echo ""

echo "── 2. Папка проекта ──"
ls -la /var/www/enduranceai/ 2>/dev/null | head -10
echo ""

echo "── 3. Backend состояние ──"
if [ -d /var/www/enduranceai/backend ]; then
  echo "✓ backend/ есть"
  [ -d /var/www/enduranceai/backend/venv ] && echo "✓ venv создан" || echo "✗ venv НЕТ"
  [ -f /var/www/enduranceai/backend/venv/bin/python ] && /var/www/enduranceai/backend/venv/bin/python --version || true
  [ -f /var/www/enduranceai/backend/.env ] && echo "✓ .env есть ($(wc -l < /var/www/enduranceai/backend/.env) строк)" || echo "✗ .env НЕТ"
  [ -d /var/www/enduranceai/backend/staticfiles ] && echo "✓ collectstatic выполнен ($(ls /var/www/enduranceai/backend/staticfiles | wc -l) файлов)" || echo "✗ collectstatic НЕТ"
else
  echo "✗ backend/ НЕТ"
fi
echo ""

echo "── 4. Frontend состояние ──"
if [ -d /var/www/enduranceai/frontend ]; then
  echo "✓ frontend/ есть"
  [ -d /var/www/enduranceai/frontend/node_modules ] && echo "✓ node_modules ($(du -sh /var/www/enduranceai/frontend/node_modules 2>/dev/null | cut -f1))" || echo "✗ node_modules НЕТ"
  [ -d /var/www/enduranceai/frontend/dist ] && echo "✓ dist/ собран ($(du -sh /var/www/enduranceai/frontend/dist 2>/dev/null | cut -f1))" || echo "✗ dist/ НЕТ (npm run build не отработал)"
  [ -f /var/www/enduranceai/frontend/.env.production ] && echo "✓ .env.production есть" || echo "✗ .env.production НЕТ"
else
  echo "✗ frontend/ НЕТ"
fi
echo ""

echo "── 5. PostgreSQL ──"
systemctl is-active postgresql || echo "postgres не активен"
sudo -u postgres psql -lqt 2>/dev/null | grep enduranceai && echo "✓ БД enduranceai создана" || echo "✗ БД enduranceai НЕ создана"
echo ""

echo "── 6. Redis ──"
systemctl is-active redis-server || systemctl is-active redis || echo "redis не активен"
redis-cli ping 2>/dev/null || echo "redis-cli не отвечает"
echo ""

echo "── 7. Nginx ──"
systemctl is-active nginx
ls /etc/nginx/sites-enabled/ 2>/dev/null
echo ""

echo "── 8. systemd services EnduranceAI ──"
for svc in enduranceai-gunicorn enduranceai-celery enduranceai-celerybeat; do
  if systemctl list-unit-files | grep -q "$svc"; then
    state=$(systemctl is-active $svc 2>/dev/null)
    echo "  $svc: $state"
  else
    echo "  $svc: НЕ СОЗДАН"
  fi
done
echo ""

echo "── 9. Что слушает на портах ──"
ss -tlnp 2>/dev/null | grep -E ":(80|443|8000|5432|6379)\s" | head -10
echo ""

echo "── 10. SSL сертификат ──"
ls /etc/letsencrypt/live/ 2>/dev/null || echo "Let's Encrypt НЕ выпущен"
echo ""

echo "── 11. Внешний доступ ──"
echo -n "  HTTP (80): "
curl -sI -o /dev/null -w "%{http_code}\n" --max-time 5 http://endurance.yuzapp.space/ 2>/dev/null || echo "недоступен"
echo -n "  HTTPS (443): "
curl -sI -o /dev/null -w "%{http_code}\n" --max-time 5 https://endurance.yuzapp.space/ 2>/dev/null || echo "недоступен"
echo ""

echo "── 12. RAM/Disk ──"
free -h | head -3
df -h / | tail -1
echo ""

echo "── 13. Последние ошибки nginx (если есть) ──"
tail -5 /var/log/nginx/error.log 2>/dev/null || echo "нет лога"
echo ""

echo "── 14. Установленные версии ──"
echo -n "  Python: "; python3 --version 2>/dev/null
echo -n "  Python 3.11: "; python3.11 --version 2>/dev/null || echo "не установлен"
echo -n "  Node: "; node --version 2>/dev/null
echo -n "  npm: "; npm --version 2>/dev/null
echo ""

echo "═══════════════════════════════════════════════════════"
echo " Готово — скопируй вывод выше и пришли"
echo "═══════════════════════════════════════════════════════"
