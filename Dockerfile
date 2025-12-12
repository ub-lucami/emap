
#FROM python:3.10-bullseye
FROM python:3.11-slim

# Runtime behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build deps for mysqlclient (and general Python wheels)
ENV DEBIAN_FRONTEND=noninteractive
USER root

# Install system dependencies in one layer
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3-dev \
        pkg-config \
        default-libmysqlclient-dev; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies first to leverage Docker layer caching
COPY requirements.txt . 
# COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
#COPY . /app/
COPY . .

# EXPOSE 8000

# Run Django (dev server). For production, prefer gunicorn/uvicorn behind a reverse proxy.
# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Collect static files and prepare
RUN python manage.py collectstatic --noinput --clear

# Run migrations + collectstatic on start, then gunicorn
CMD python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput --clear && \
    gunicorn --bind 0.0.0.0:8000 emapp.wsgi:application
# ↑↑↑ Replace "emapp" only if your Django project folder has a different name