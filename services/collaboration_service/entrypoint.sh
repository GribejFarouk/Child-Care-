#!/bin/bash
set -e

echo "Applying database migrations..."
python manage.py migrate

if [ "$#" -gt 0 ]; then
    exec "$@"
else
    echo "Starting Gunicorn server..."
    exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers "${GUNICORN_WORKERS:-1}"
fi
