# Manrique Importadora - Guía de Despliegue Docker en Plesk

## Archivos Necesarios

Sube estos archivos a tu servidor:
```
/var/www/manrique/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── server.py
│   ├── requirements.txt
│   └── .env (opcional)
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── yarn.lock
    └── src/
```

---

## PASO 1: Configurar Variables

Edita `docker-compose.yml` y cambia:

```yaml
# En backend -> environment:
- MONGO_URL=mongodb://admin_manrique:TU_CLAVE_REAL@host.docker.internal:27017

# En frontend -> build -> args:
- REACT_APP_BACKEND_URL=https://tu-dominio-real.com
```

---

## PASO 2: Despliegue por Terminal SSH

```bash
# Conectar por SSH a tu VPS
ssh usuario@tu-servidor

# Ir a la carpeta del proyecto
cd /var/www/manrique

# Construir y levantar contenedores
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Ver estado
docker-compose ps
```

---

## PASO 3: Despliegue desde Plesk (Extensión Docker)

### 3.1 Instalar Extensión Docker
1. Panel Plesk → Extensions → Catálogo
2. Buscar "Docker" → Instalar

### 3.2 Crear Contenedor Backend
1. Docker → Add Container → Upload
2. Subir carpeta `backend/` con su Dockerfile
3. Configurar:
   - **Container name**: manrique-backend
   - **Port mapping**: 8001:8001
   - **Environment variables**:
     ```
     MONGO_URL=mongodb://admin_manrique:Clave@172.17.0.1:27017
     DB_NAME=manrique_db
     JWT_SECRET=tu-clave-secreta
     CORS_ORIGINS=*
     ```
4. Click "Run"

### 3.3 Crear Contenedor Frontend
1. Docker → Add Container → Upload
2. Subir carpeta `frontend/` con Dockerfile y nginx.conf
3. Configurar:
   - **Container name**: manrique-frontend
   - **Port mapping**: 3000:80
   - **Build args**:
     ```
     REACT_APP_BACKEND_URL=https://tu-dominio.com
     ```
4. Click "Run"

---

## PASO 4: Configurar Proxy en Plesk

### Para el dominio principal (frontend):
1. Websites & Domains → tu-dominio.com → Apache & nginx Settings
2. En "Additional nginx directives":

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### O crear subdominio para API:
- api.tu-dominio.com → proxy a puerto 8001

---

## PASO 5: Verificar

```bash
# Backend funcionando
curl http://localhost:8001/api/health

# Frontend funcionando
curl http://localhost:3000
```

---

## Comandos Útiles

```bash
# Ver contenedores activos
docker ps

# Reiniciar todo
docker-compose restart

# Ver logs del backend
docker logs manrique-backend -f

# Ver logs del frontend
docker logs manrique-frontend -f

# Detener todo
docker-compose down

# Reconstruir después de cambios
docker-compose up -d --build
```

---

## Notas Importantes

1. **MongoDB**: Si MongoDB está en otro contenedor Docker, usa `172.17.0.1` en lugar de `host.docker.internal` para la IP del host.

2. **SSL/HTTPS**: Configura Let's Encrypt en Plesk para tu dominio.

3. **Puertos**: 
   - Backend: 8001
   - Frontend: 3000 (mapeado a 80 dentro del contenedor)
   - MongoDB: 27017

4. **Credenciales por defecto**:
   - Admin: `admin` / `admin123`
   - Empleado: `empleado1` / `emp123`
