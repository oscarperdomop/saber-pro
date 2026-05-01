# Imagen base ligera y estable para producción
FROM python:3.13-slim

# Evita .pyc y fuerza logs en stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Directorio de trabajo de Django
WORKDIR /app

# Dependencias del sistema para compilar wheels (psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    poppler-utils \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl --proto '=https' --tlsv1.2 -fsSL https://drop-sh.fullyjustified.net | sh && \
    install -m 0755 tectonic /usr/local/bin/tectonic && \
    rm -f tectonic

# Copiar requirements primero para aprovechar cache de Docker layers
COPY requirements.txt /app/requirements.txt

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Copiar el código del backend
COPY . /app

# Exponer puerto Daphne
EXPOSE 8000

# Arranque ASGI con Daphne (soporta HTTP + WebSockets)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "core.asgi:application"]
