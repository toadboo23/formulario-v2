# Solucioning Formularios - Sistema de Gestión de Flota

Sistema web para la gestión de formularios de apertura, cierre e incidencias de flota de delivery.

**Estado**: ✅ Configurado para despliegue automático con GitHub Actions
**Última actualización**: 28 de Julio, 2025
**Secret SSH**: Reconfigurado correctamente

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

1. **Clonar en el servidor**
```bash
git clone https://github.com/toadboo23/formulario-v2.git
cd formulario-v2
```

2. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con configuraciones de producción
```

3. **Ejecutar con Docker**
```bash
docker-compose up -d --build
```

### Despliegue Automático con GitHub Actions

El proyecto incluye GitHub Actions para despliegue automático. Configura los siguientes secrets en tu repositorio:

- `VPS_SSH_PRIVATE_KEY`: Clave SSH privada para conectar al VPS
- `VPS_HOST`: IP o dominio del VPS
- `VPS_USER`: Usuario SSH del VPS
- `VPS_PATH`: Ruta donde desplegar en el VPS

## 📊 Estructura del Proyecto

```
formulario-v2/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── services/      # Servicios de API
│   │   └── contexts/      # Contextos de React
│   ├── public/            # Archivos estáticos
│   └── nginx.conf         # Configuración de Nginx
├── server/                # Backend Node.js
│   ├── routes/            # Rutas de la API
│   ├── middleware/        # Middleware personalizado
│   ├── scripts/           # Scripts de migración
│   └── config/            # Configuración de base de datos
├── docs/                  # Documentación
├── docker-compose.yml     # Configuración de Docker
└── README.md             # Este archivo
```

## 🔍 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/verify` - Verificar token

### Formularios
- `POST /api/formularios/apertura` - Crear formulario de apertura
- `POST /api/formularios/cierre` - Crear formulario de cierre
- `POST /api/formularios/incidencias` - Crear reporte de incidencia

### Notificaciones
- `GET /api/notificaciones` - Obtener notificaciones
- `PUT /api/notificaciones/:id` - Procesar notificación
- `GET /api/notificaciones/:id/files` - Obtener archivos de incidencia

### Archivos
- `POST /api/files/upload/:incidenciaId` - Subir archivos
- `GET /api/files/download/:archivoId` - Descargar archivo
- `DELETE /api/files/:archivoId` - Eliminar archivo

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

## 📝 Scripts Útiles

```bash
# Verificar puertos disponibles
node check-ports.js

# Crear usuarios de prueba
docker exec formularios-backend node scripts/setup-production-users.js

# Backup de base de datos
docker exec formularios-postgres pg_dump -U formularios_user formularios_db > backup.sql
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto, contactar al equipo de desarrollo.

---

**Desarrollado con ❤️ para Solucioning** 