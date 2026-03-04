# Backend Dockerfile - FastAPI
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Variables de entorno por defecto (sobrescribir en docker-compose)
ENV MONGO_URL=mongodb://admin_manrique:Clave@host.docker.internal:27017
ENV DB_NAME=manrique_db
ENV JWT_SECRET=manrique-secret-key-production-2024
ENV CORS_ORIGINS=*

# Puerto
EXPOSE 8001

# Comando para iniciar
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
