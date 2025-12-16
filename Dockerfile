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

# Copy and install an entrypoint script that will collect static files and
# run migrations at container start time (safer than build-time collection
# because runtime env vars are available).
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

# Run application with gunicorn (production-ready WSGI server)
ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
