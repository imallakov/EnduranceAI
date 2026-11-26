from .base import *
from django.core.exceptions import ImproperlyConfigured

DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='endurance.yuzapp.space').split(',')

# ── Secrets: no insecure fallbacks in production ────────────────────────────
# base.py gives SECRET_KEY a dev default; in prod it MUST come from the env.
# SIMPLE_JWT signs tokens with it — a default/leaked key means forgeable auth
# tokens. Re-read with NO default (raises at startup if unset) and re-bind the
# JWT signing key, which base.py computed from the dev default.
SECRET_KEY = config('SECRET_KEY')
SIMPLE_JWT['SIGNING_KEY'] = SECRET_KEY

# Strava webhook verify token must be a real secret when Strava is enabled.
if config('STRAVA_CLIENT_ID', default='') and STRAVA_WEBHOOK_VERIFY_TOKEN in (
    '', 'change-me-in-production-please',
):
    raise ImproperlyConfigured(
        'STRAVA_WEBHOOK_VERIFY_TOKEN must be a non-default secret in production.'
    )

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='db'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='').split(',')

# Single switch: HTTP_ONLY=true runs the app without TLS (dev / no-domain IP
# deploy) — turns off the HTTPS redirect, Secure cookies and HSTS so plain-HTTP
# auth works. Default False = full hardening (real production behind HTTPS).
HTTP_ONLY = config('HTTP_ONLY', default=False, cast=bool)
_secure = not HTTP_ONLY

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = _secure
SESSION_COOKIE_SECURE = _secure
CSRF_COOKIE_SECURE = _secure

# ── Browser / transport hardening ───────────────────────────────────────────
# HSTS: tell browsers to only ever use HTTPS. Forced off in HTTP_ONLY mode
# (an HSTS header over http would lock the browser out of the site).
SECURE_HSTS_SECONDS = 0 if HTTP_ONLY else config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
SESSION_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = 'DENY'

# The httpOnly refresh cookie travels over HTTPS in production; in HTTP_ONLY
# mode it must be allowed over plain http or auth refresh breaks.
REFRESH_COOKIE_SECURE = _secure
