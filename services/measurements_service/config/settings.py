"""
Measurements Service Django settings.
PostgreSQL-ready with SQLite fallback for local development.
Pattern identical to profile_service.
"""
import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Security ---
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')
DEBUG = os.environ.get('DJANGO_DEBUG', 'True').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# --- Applications ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    # Local
    'measurements',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
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
        'DIRS': [],
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

# --- Database ---
# Uses PostgreSQL when MEASUREMENTS_DB_NAME env var is set, otherwise SQLite for local dev
if os.environ.get('MEASUREMENTS_DB_NAME'):
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ['MEASUREMENTS_DB_NAME'],
            'USER': os.environ.get('MEASUREMENTS_DB_USER', 'childcare'),
            'PASSWORD': os.environ.get('MEASUREMENTS_DB_PASSWORD', ''),
            'HOST': os.environ.get('MEASUREMENTS_DB_HOST', 'localhost'),
            'PORT': os.environ.get('MEASUREMENTS_DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# --- REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'measurements.authentication.SharedJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# --- JWT ---
# Must match the JWT_SIGNING_KEY used by auth_service to validate tokens locally
JWT_SIGNING_KEY = os.environ.get('JWT_SIGNING_KEY', 'dev-jwt-secret-change-in-production')

SIMPLE_JWT = {
    'SIGNING_KEY': JWT_SIGNING_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_CLAIM': 'user_id',
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# --- i18n ---
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Tunis'
USE_I18N = True
USE_TZ = True

# --- Static ---
STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


import os
from django.core.exceptions import ImproperlyConfigured
INTERNAL_TOKEN = os.environ.get('INTERNAL_SERVICE_TOKEN')
if not INTERNAL_TOKEN or len(INTERNAL_TOKEN) < 32 or INTERNAL_TOKEN.startswith('change_me_') or INTERNAL_TOKEN.startswith('replace_with_') or INTERNAL_TOKEN == 'childcare_internal_service_token_2026_secure':
    raise ImproperlyConfigured('INTERNAL_SERVICE_TOKEN is missing or insecurely configured.')

