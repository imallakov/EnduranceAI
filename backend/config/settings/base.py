"""
Base Django settings for EnduranceAI.
"""
from pathlib import Path
from decouple import config
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-enduranceai-dev-key-change-in-production')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_results',
    'drf_spectacular',

    # Apps
    'apps.users',
    'apps.activities',
    'apps.metrics',
    'apps.races',
    'apps.plans',
    'apps.dashboard',
    'apps.integrations',
    'apps.legal',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Auth
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'ru-ru'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'config.pagination.OverridablePagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_RATES': {
        'data_export': '1/hour',
    },
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Celery
CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
    }
}

# File uploads
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800   # 50 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800   # 50 MB

# OpenWeatherMap
OPENWEATHERMAP_API_KEY = config('OPENWEATHERMAP_API_KEY', default='')

# Strava OAuth
STRAVA_CLIENT_ID = config('STRAVA_CLIENT_ID', default='')
STRAVA_CLIENT_SECRET = config('STRAVA_CLIENT_SECRET', default='')
STRAVA_REDIRECT_URI = config(
    'STRAVA_REDIRECT_URI',
    default='http://localhost:8000/api/integrations/strava/callback/',
)
# Strava webhook (push) subscription. The verify token is a random secret we
# send to Strava when subscribing; Strava echoes it back during the GET
# verification handshake so we can prove we own the callback endpoint.
STRAVA_WEBHOOK_VERIFY_TOKEN = config(
    'STRAVA_WEBHOOK_VERIFY_TOKEN',
    default='change-me-in-production-please',
)
# Public callback URL Strava will POST events to. Must be HTTPS in production
# and reachable from the public internet.
STRAVA_WEBHOOK_CALLBACK_URL = config(
    'STRAVA_WEBHOOK_CALLBACK_URL',
    default='http://localhost:8000/api/integrations/strava/webhook/',
)

# Frontend URL
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# ML models path
ML_MODELS_DIR = BASE_DIR / 'ml' / 'models'

# GPX data
GPX_DATA_DIR = BASE_DIR / 'data' / 'gpx'

# CORS
CORS_ALLOW_ALL_ORIGINS = True  # dev only, restricted in production

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {
        'apps': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'ml':   {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
}

# Spectacular
SPECTACULAR_SETTINGS = {
    'TITLE': 'EnduranceAI API',
    'DESCRIPTION': 'Predictive analytics for marathon runners',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
