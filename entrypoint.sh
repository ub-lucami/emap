#!/bin/sh
set -e

# Ensure static root exists to avoid WhiteNoise warning during startup
mkdir -p /app/staticfiles

# Collect static files into STATIC_ROOT
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Launch Gunicorn
echo "Starting gunicorn..."
exec gunicorn landing_page.wsgi:application --bind 0.0.0.0:8000 --workers 3
