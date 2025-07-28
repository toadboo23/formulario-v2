# Solucioning Formularios - Sistema de Gestión de Flota

Sistema web para la gestión de formularios de apertura, cierre e incidencias de flota de delivery.

**Estado**: ✅ Configurado para despliegue automático con GitHub Actions
**Última actualización**: 28 de Julio, 2025
**Secret SSH**: Reconfigurado correctamente
**Prueba**: echo prueba ahora
**Secrets**: Verificados y corregidos
**Despliegue**: Activado con secrets corregidos

## 🚀 Características

- **Formularios de Apertura**: Gestión de empleados no operativos, vehículos y problemas de la jornada
- **Formularios de Cierre**: Análisis de datos y propuestas de soluciones
- **Reporte de Incidencias**: Gestión de incidentes con archivos adjuntos
- **Sistema de Notificaciones**: Comunicación entre jefes de tráfico y operaciones
- **Gestión de Archivos**: Subida y descarga de archivos adjuntos
- **Autenticación JWT**: Sistema seguro de login y roles
- **Interfaz Responsive**: Diseño moderno con TailwindCSS

## 🛠️ Tecnologías

### Backend
- **Node.js** con Express.js
- **PostgreSQL** para base de datos
- **JWT** para autenticación
- **Multer** para manejo de archivos
- **Docker** para containerización

### Frontend
- **React.js** con React Router
- **TailwindCSS** para estilos
- **Axios** para comunicación con API
- **React Hot Toast** para notificaciones
- **Nginx** como servidor web

## 📋 Prerrequisitos

- Docker y Docker Compose
- Node.js 18+ (para desarrollo local)
- Git

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/toadboo23/formulario-v2.git
cd formulario-v2
```

### 2. Configurar variables de entorno
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

### 3. Ejecutar con Docker
```bash
# Construir imágenes
docker-compose build

# Ejecutar servicios
docker-compose up -d

# Verificar estado
docker-compose ps
```

### 4. Acceder a la aplicación
- **Frontend**: http://localhost:8082
- **Backend API**: http://localhost:8081/api
- **Health Check**: http://localhost:8081/api/health

## 👥 Usuarios por Defecto

### Jefe de Tráfico
- **Usuario**: `jefe.trafico`
- **Contraseña**: `jefe123`

### Jefe de Operaciones
- **Usuario**: `jefe.operaciones`
- **Contraseña**: `jefe123`

## 🔧 Desarrollo Local

### Instalar dependencias
```bash
# Backend
cd server
npm install

# Frontend
cd client
npm install
```

### Ejecutar en modo desarrollo
```bash
# Backend (puerto 8081)
cd server
npm run dev

# Frontend (puerto 3000)
cd client
npm start
```

## 🐳 Docker

### Comandos útiles
```bash
# Ver logs
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Detener servicios
docker-compose down

# Reconstruir imágenes
docker-compose build --no-cache
```

## 🔒 Variables de Entorno

### Configuración requerida
```env
# Base de datos
DB_HOST=postgres
DB_PORT=5432
DB_NAME=formularios_db
DB_USER=formularios_user
DB_PASSWORD=formularios_password

# Servidor
NODE_ENV=production
PORT=8081

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro
JWT_SECRET_SUFFIX=production

# CORS
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,https://tu-dominio.com

# Frontend
FRONTEND_PORT=8082
NGINX_HOST=localhost
NGINX_PORT=80

# Producción
PRODUCTION_URL=https://tu-dominio.com
```

## 🚀 Despliegue

### Despliegue Manual

1. **Preparar el servidor**:
   ```bash
   # Conectar al VPS
   ssh root@69.62.107.86
   
   # Crear directorio
   mkdir -p /opt/formularios-v2
   cd /opt/formularios-v2
   ```

2. **Subir archivos**:
   ```bash
   # Desde tu máquina local
   scp -r . root@69.62.107.86:/opt/formularios-v2/
   ```

3. **Configurar variables de entorno**:
   ```bash
   # En el VPS
   cp env.example .env
   # Editar .env según sea necesario
   ```

4. **Desplegar**:
   ```bash
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Despliegue Automático con GitHub Actions

El proyecto está configurado para despliegue automático. Cada push a `main` activará el despliegue.

**Configuración requerida en GitHub Secrets**:
- `VPS_SSH_PRIVATE_KEY`: Clave SSH privada para el VPS
- `VPS_HOST`: IP del VPS (69.62.107.86)
- `VPS_USER`: Usuario del VPS (root)
- `VPS_PATH`: Ruta en el VPS (/opt/formularios-v2)

### 🔍 **Configuración de CORS**

**IMPORTANTE**: Para prevenir errores de login, asegúrate de que la configuración de CORS incluya todos los orígenes necesarios.

#### Verificar Configuración Actual:
```bash
# En el VPS
cat .env | grep CORS_ORIGIN
```

#### Configuración Recomendada:
```env
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://69.62.107.86:8082,https://tu-dominio.com
```

#### Validación Automática:
```bash
# Ejecutar antes del despliegue
node server/scripts/validate-cors.js
```

**Ver documentación completa**: [docs/CORS-TROUBLESHOOTING.md](docs/CORS-TROUBLESHOOTING.md)

## 📊 Estructura del Proyecto

```