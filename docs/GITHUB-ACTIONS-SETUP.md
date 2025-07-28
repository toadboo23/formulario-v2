# Configuración de GitHub Actions para Despliegue Automático

## 📋 Prerrequisitos

1. **Repositorio en GitHub**: El proyecto debe estar en [https://github.com/toadboo23/formulario-v2.git](https://github.com/toadboo23/formulario-v2.git)
2. **Acceso SSH al VPS**: Clave SSH privada para conectar al servidor
3. **Permisos de administrador**: Para configurar secrets en el repositorio

## 🔧 Configuración de Secrets

### 1. Ir a la configuración del repositorio
1. Ve a tu repositorio en GitHub
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, haz clic en **Secrets and variables** → **Actions**

### 2. Agregar los siguientes secrets

#### `VPS_SSH_PRIVATE_KEY`
- **Descripción**: Clave SSH privada para conectar al VPS
- **Tipo**: Secret
- **Valor**: El contenido completo de tu clave SSH privada (incluyendo `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`)

#### `VPS_HOST`
- **Descripción**: IP o dominio del VPS
- **Tipo**: Secret
- **Valor**: `69.62.107.86`

#### `VPS_USER`
- **Descripción**: Usuario SSH del VPS
- **Tipo**: Secret
- **Valor**: `root`

#### `VPS_PATH`
- **Descripción**: Ruta donde desplegar en el VPS
- **Tipo**: Secret
- **Valor**: `/opt/formularios-v2`

## 🔑 Generar Clave SSH (si no tienes una)

### 1. Generar nueva clave SSH
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions@formularios-v2"
```

### 2. Copiar clave pública al VPS
```bash
ssh-copy-id root@69.62.107.86
```

### 3. Obtener clave privada
```bash
cat ~/.ssh/id_rsa
```

## 🚀 Configuración del VPS

### 1. Crear directorio de despliegue
```bash
ssh root@69.62.107.86
mkdir -p /opt/formularios-v2
```

### 2. Verificar permisos
```bash
chmod 755 /opt/formularios-v2
```

### 3. Verificar que Docker esté instalado
```bash
docker --version
docker-compose --version
```

## 📋 Workflow de GitHub Actions

El workflow está configurado en `.github/workflows/deploy.yml` y hace lo siguiente:

### 1. Job de Testing
- Ejecuta tests del backend y frontend
- Verifica que el código funcione correctamente

### 2. Job de Despliegue
- Se ejecuta solo si los tests pasan
- Se ejecuta solo en la rama `main`
- Configura SSH para conectar al VPS
- Copia archivos al servidor
- Construye y ejecuta con Docker Compose
- Verifica que los servicios estén funcionando

## 🔍 Verificación del Despliegue

### 1. Verificar en GitHub Actions
1. Ve a tu repositorio en GitHub
2. Haz clic en **Actions**
3. Verifica que el workflow se ejecute correctamente

### 2. Verificar en el VPS
```bash
# Conectar al VPS
ssh root@69.62.107.86

# Verificar servicios
cd /opt/formularios-v2
docker-compose ps

# Ver logs
docker-compose logs -f

# Health check
curl http://localhost:8081/api/health
```

### 3. Verificar URLs
- **Frontend**: http://69.62.107.86:8082
- **Backend API**: http://69.62.107.86:8081/api
- **Health Check**: http://69.62.107.86:8081/api/health

## 🛠️ Troubleshooting

### Error: Permission denied (publickey)
- Verificar que la clave SSH esté correctamente configurada
- Verificar que la clave pública esté en el VPS

### Error: Connection refused
- Verificar que el VPS esté accesible
- Verificar que el puerto SSH (22) esté abierto

### Error: Docker not found
- Instalar Docker en el VPS
- Verificar que el usuario tenga permisos de Docker

### Error: Port already in use
- Verificar que los puertos 8081, 8082 y 5433 estén disponibles
- Cambiar puertos si es necesario

## 📝 Comandos Útiles

### Verificar secrets en GitHub
```bash
# Los secrets no se pueden ver desde la línea de comandos
# Solo se pueden configurar desde la interfaz web de GitHub
```

### Verificar conexión SSH
```bash
ssh -i ~/.ssh/id_rsa root@69.62.107.86
```

### Verificar puertos en el VPS
```bash
netstat -tulpn | grep LISTEN
```

### Reiniciar servicios manualmente
```bash
ssh root@69.62.107.86
cd /opt/formularios-v2
docker-compose down
docker-compose up -d
```

## 🔒 Seguridad

### Recomendaciones
1. **Usar claves SSH específicas**: No usar la clave SSH principal
2. **Rotar claves regularmente**: Cambiar las claves cada cierto tiempo
3. **Limitar permisos**: Usar un usuario específico para GitHub Actions
4. **Monitorear logs**: Revisar logs de SSH regularmente

### Configuración adicional de seguridad
```bash
# En el VPS, editar /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes

# Reiniciar SSH
systemctl restart sshd
```

---

**Estado**: ✅ Configurado para despliegue automático  
**Repositorio**: [https://github.com/toadboo23/formulario-v2.git](https://github.com/toadboo23/formulario-v2.git)  
**VPS**: 69.62.107.86 