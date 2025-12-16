FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies for mysqlclient
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    libmariadb-dev-compat \
    python3-dev \
    build-essential \
    && apt-get clean

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Collect static files at image build time so they are baked into the image.
# This requires that any settings / .env needed for static collection are
# present at build time. If your collectstatic fails during build, consider
# adding a minimal `.env` or switching collect to runtime.
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

# Run application with gunicorn (production-ready WSGI server)
CMD ["gunicorn", "landing_page.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
