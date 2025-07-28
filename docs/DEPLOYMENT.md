# Guía de Despliegue - Solucioning Formularios

## Configuración de Puertos

La aplicación utiliza los siguientes puertos:

- **Frontend (Nginx)**: Puerto `8080`
- **Backend (Node.js)**: Puerto `8081`
- **PostgreSQL**: Puerto `5432`

## Variables de Entorno

### Desarrollo Local
```bash
# Puerto del frontend (opcional, por defecto 8080)
FRONTEND_PORT=8080

# URL de producción (para CORS)
PRODUCTION_URL=https://tu-dominio.com

# Sufijo para JWT Secret (opcional)
JWT_SECRET_SUFFIX=production
```

### Producción (VPS)
```bash
# Configurar variables de entorno en el VPS
export FRONTEND_PORT=8080
export PRODUCTION_URL=https://tu-dominio.com
export JWT_SECRET_SUFFIX=production
```

## Comandos de Despliegue

### 1. Construir y ejecutar localmente
```bash
# Construir las imágenes
docker-compose build

# Ejecutar la aplicación
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 2. Desplegar en VPS
```bash
# Clonar el repositorio en el VPS
git clone <tu-repositorio>
cd formularios-v2

# Configurar variables de entorno
export FRONTEND_PORT=8080
export PRODUCTION_URL=https://tu-dominio.com

# Construir y ejecutar
docker-compose up -d --build

# Verificar que los servicios estén funcionando
docker-compose ps
```

## Verificación de Funcionamiento

### 1. Verificar servicios
```bash
# Verificar que todos los contenedores estén corriendo
docker-compose ps

# Verificar logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### 2. Verificar endpoints
```bash
# Frontend
curl http://localhost:8080

# Backend API
curl http://localhost:8081/api/health

# Base de datos (desde dentro del contenedor)
docker-compose exec postgres psql -U formularios_user -d formularios_db -c "SELECT version();"
```

## Acceso a la Aplicación

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:8081/api
- **Base de datos**: localhost:5432

## Usuarios por Defecto

La aplicación crea automáticamente los siguientes usuarios:

### Jefe de Tráfico
- **Usuario**: `jefe.trafico`
- **Contraseña**: `jefe123`
- **Rol**: `jefe_trafico`

### Jefe de Operaciones
- **Usuario**: `jefe.operaciones`
- **Contraseña**: `jefe123`
- **Rol**: `jefe_operaciones`

## Troubleshooting

### Problemas Comunes

1. **Puerto ya en uso**
   ```bash
   # Verificar puertos en uso
   netstat -tulpn | grep :8080
   netstat -tulpn | grep :8081
   
   # Cambiar puertos si es necesario
   export FRONTEND_PORT=8082
   docker-compose up -d
   ```

2. **Error de conexión a la base de datos**
   ```bash
   # Verificar logs de PostgreSQL
   docker-compose logs postgres
   
   # Reiniciar solo la base de datos
   docker-compose restart postgres
   ```

3. **Error de permisos en archivos**
   ```bash
   # Verificar permisos en el directorio de uploads
   docker-compose exec backend ls -la /app/uploads
   
   # Corregir permisos si es necesario
   docker-compose exec backend chmod -R 755 /app/uploads
   ```

### Logs Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend

# Ver logs de los últimos 100 líneas
docker-compose logs --tail=100
```

## Backup y Restauración

### Backup de la base de datos
```bash
# Crear backup
docker-compose exec postgres pg_dump -U formularios_user formularios_db > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U formularios_user -d formularios_db < backup.sql
```

## Seguridad

### Configuración de Firewall
```bash
# Permitir solo los puertos necesarios
sudo ufw allow 8080/tcp  # Frontend
sudo ufw allow 8081/tcp  # Backend (solo si es necesario acceso directo)
sudo ufw allow 5432/tcp  # PostgreSQL (solo si es necesario acceso directo)
```

### Variables de Entorno Sensibles
- Cambiar `JWT_SECRET_SUFFIX` en producción
- Cambiar contraseñas de la base de datos
- Configurar `PRODUCTION_URL` correctamente

## Monitoreo

### Health Checks
Los servicios incluyen health checks automáticos:
- **Backend**: http://localhost:8081/api/health
- **Frontend**: http://localhost:8080/health
- **PostgreSQL**: Verificación automática de conexión

### Métricas
```bash
# Ver uso de recursos
docker stats

# Ver logs de errores
docker-compose logs | grep ERROR
``` 