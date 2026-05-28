#!/usr/bin/env bash
# EnduranceAI - GitHub Deployment Script
# Run this script on the VPS to pull the latest changes and update the application.

set -e

APP_DIR="/var/www/enduranceai"
APP_USER="www-data"

echo "=========================================="
echo "Starting EnduranceAI Deployment..."
echo "=========================================="

cd $APP_DIR

# 1. Pull the latest code from GitHub
echo "-> Pulling latest code from GitHub..."
git pull origin main

# Fix ownership of any new files downloaded by git
chown -R $APP_USER:$APP_USER $APP_DIR


# 2. Update Backend
echo "-> Updating Backend..."
sudo -u $APP_USER bash -c '
    cd backend
    source venv/bin/activate
    pip install -r requirements.txt
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput --clear
'

# 3. Update Frontend
echo "-> Updating Frontend..."
sudo -u $APP_USER bash -c '
    cd frontend
    npm install
    npm run build
'

# 4. Restart Services
echo "-> Restarting Services..."
# Gunicorn
if systemctl is-active --quiet enduranceai-gunicorn; then
    systemctl restart enduranceai-gunicorn
elif systemctl is-active --quiet gunicorn; then
    systemctl restart gunicorn
fi

# Celery
if systemctl is-active --quiet enduranceai-celery; then
    systemctl restart enduranceai-celery
elif systemctl is-active --quiet celery; then
    systemctl restart celery
fi

if systemctl is-active --quiet enduranceai-celerybeat; then
    systemctl restart enduranceai-celerybeat
fi

systemctl reload nginx

echo "=========================================="
echo "Deployment Completed Successfully! 🚀"
echo "=========================================="
