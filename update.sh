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

# Capture current commit to compare changes later
OLD_HEAD=$(git rev-parse HEAD)

# 1. Pull the latest code from GitHub
echo "-> Pulling latest code from GitHub..."
git pull origin main

NEW_HEAD=$(git rev-parse HEAD)

# Fix ownership of any new files downloaded by git
chown -R $APP_USER:$APP_USER $APP_DIR



# Check what changed
BACKEND_CHANGED=false
if git diff --name-only $OLD_HEAD $NEW_HEAD | grep -q '^backend/'; then
    BACKEND_CHANGED=true
fi

FRONTEND_CHANGED=false
if git diff --name-only $OLD_HEAD $NEW_HEAD | grep -q '^frontend/'; then
    FRONTEND_CHANGED=true
fi

if [ "$OLD_HEAD" = "$NEW_HEAD" ]; then
    echo "-> No new commits found. Assuming manual run. Proceeding with full update."
    BACKEND_CHANGED=true
    FRONTEND_CHANGED=true
fi

# 2. Update Backend
if [ "$BACKEND_CHANGED" = true ]; then
    echo "-> Updating Backend..."
    sudo -u $APP_USER bash -c "
        cd backend
        source venv/bin/activate
        
        # Only install python dependencies if requirements.txt changed
        if git diff --name-only $OLD_HEAD $NEW_HEAD | grep -q 'backend/requirements.txt'; then
            echo '-> requirements.txt changed. Installing Python dependencies...'
            pip install -r requirements.txt
        else
            echo '-> No Python dependency changes detected. Skipping pip install.'
        fi
        
        python manage.py migrate --noinput
        python manage.py collectstatic --noinput --clear
    "
else
    echo "-> No backend changes detected. Skipping backend update."
fi

# 3. Update Frontend
if [ "$FRONTEND_CHANGED" = true ]; then
    echo "-> Updating Frontend..."
    sudo -u $APP_USER bash -c "
        cd frontend
        
        # Only run npm install if package.json or package-lock.json changed
        if git diff --name-only $OLD_HEAD $NEW_HEAD | grep -qE 'frontend/package\.json|frontend/package-lock\.json'; then
            echo '-> package.json changed. Installing NPM dependencies...'
            npm install
        else
            echo '-> No NPM dependency changes detected. Skipping npm install.'
        fi
        
        npm run build
    "
else
    echo "-> No frontend changes detected. Skipping frontend build."
fi

# 4. Restart Services
echo "-> Restarting Services..."

if [ "$BACKEND_CHANGED" = true ]; then
    echo "-> Restarting Python services..."
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
else
    echo "-> No backend changes. Skipping Gunicorn and Celery restarts."
fi

if [ "$FRONTEND_CHANGED" = true ] || [ "$BACKEND_CHANGED" = true ]; then
    systemctl reload nginx
fi

echo "=========================================="
echo "Deployment Completed Successfully! 🚀"
echo "=========================================="
