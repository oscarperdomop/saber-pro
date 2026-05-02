# Stable lightweight base image for production
FROM python:3.13-slim

# Avoid .pyc and force logs to stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Django working directory
WORKDIR /app

# System dependencies for wheels/build and LaTeX rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    poppler-utils \
    libgraphite2-3 \
    libharfbuzz0b \
    libfreetype6 \
    libfontconfig1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh && \
    install -m 0755 tectonic /usr/local/bin/tectonic && \
    rm -f tectonic

# Copy requirements first to leverage Docker layer cache
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source code
COPY . /app

# Expose Daphne port
EXPOSE 8000

# ASGI startup with Daphne (HTTP + WebSockets)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
