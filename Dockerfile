
FROM python:3.11-bullseye
#FROM python:3.11-slim-bookworm  
# Explicit Bookworm for reliable packages

# Runtime behavior
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install dependencies in one layer (chained update + install)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        python3-dev \
        pkg-config \
        default-libmysqlclient-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput --clear

# Run migrations and start Gunicorn
CMD python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput --clear && \
    gunicorn --bind 0.0.0.0:8000 emapp.wsgi:application