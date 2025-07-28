# 🔍 Guía de Troubleshooting para Errores CORS

## 📋 **Descripción del Problema**

Los errores de CORS (Cross-Origin Resource Sharing) ocurren cuando el frontend intenta hacer peticiones al backend desde un origen que no está permitido en la configuración de CORS del servidor.

### 🚨 **Síntomas Comunes**

- Error 403 (Forbidden) en el navegador
- Mensaje: "Request failed with status code 403"
- Error en consola: "CORS rechazado para origen: [URL]"
- Login imposible desde el navegador

## 🔧 **Solución Paso a Paso**

### 1. **Verificar Configuración Actual**

```bash
# En el VPS
cd /opt/formularios-v2
cat .env | grep CORS_ORIGIN
```

### 2. **Verificar Logs del Backend**

```bash
# Ver logs en tiempo real
docker logs formularios-backend -f

# Ver logs específicos de CORS
docker logs formularios-backend 2>&1 | grep -i cors
```

### 3. **Actualizar Configuración CORS**

Si el origen no está incluido, actualizar el archivo `.env`:

```bash
# Editar .env en el VPS
nano .env

# Agregar el origen faltante a CORS_ORIGIN
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://69.62.107.86:8082,https://tu-dominio.com
```

### 4. **Reiniciar Servicios**

```bash
# Reiniciar solo el backend
docker-compose restart backend

# O reiniciar todo el stack
docker-compose down
docker-compose up -d
```

### 5. **Verificar Configuración**

```bash
# Verificar que el backend lea la nueva configuración
docker logs formularios-backend 2>&1 | grep "CORS configurado"

# Debería mostrar algo como:
# 🔐 CORS configurado para: [
#   'http://frontend',
#   'http://localhost:8082',
#   'http://localhost',
#   'http://69.62.107.86:8082',
#   'https://tu-dominio.com'
# ]
```

## 🛠️ **Herramientas de Diagnóstico**

### Script de Validación

```bash
# Ejecutar validación local
cd server
node scripts/validate-cors.js
```

### Test de CORS

```bash
# Probar desde el VPS
curl -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://69.62.107.86:8082' \
  -d '{"username":"test","password":"test"}'
```

## 📝 **Configuración Recomendada**

### Para Desarrollo Local

```env
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://127.0.0.1:8082
```

### Para Producción con IP Específica

```env
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://69.62.107.86:8082,https://tu-dominio.com
```

### Para Múltiples Dominios

```env
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://69.62.107.86:8082,https://formularios.solucioning.com,https://app.solucioning.com
```

## 🔄 **Prevención Automática**

### 1. **Validación en GitHub Actions**

El workflow de GitHub Actions ahora incluye validación automática de CORS antes del despliegue.

### 2. **Script de Validación**

```bash
# Ejecutar antes de cada despliegue
node server/scripts/validate-cors.js
```

### 3. **Checklist de Despliegue**

- [ ] Verificar que CORS_ORIGIN incluya todos los orígenes necesarios
- [ ] Ejecutar script de validación
- [ ] Verificar logs del backend después del despliegue
- [ ] Probar login desde el navegador

## 🚨 **Casos Especiales**

### Cambio de IP del VPS

Si cambia la IP del VPS, actualizar inmediatamente:

```bash
# En el VPS
sed -i 's|http://69.62.107.86:8082|http://NUEVA_IP:8082|g' .env
docker-compose restart backend
```

### Múltiples Entornos

Para manejar múltiples entornos, usar variables de entorno específicas:

```env
# Desarrollo
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost

# Staging
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://staging.solucioning.com

# Producción
CORS_ORIGIN=http://frontend,http://localhost:8082,http://localhost,http://69.62.107.86:8082,https://formularios.solucioning.com
```

## 📞 **Contacto y Soporte**

Si el problema persiste después de seguir esta guía:

1. Verificar logs completos del backend
2. Confirmar que el archivo `.env` está actualizado
3. Verificar que Docker Compose está leyendo el archivo `.env`
4. Revisar la configuración de red del VPS

---

**Última actualización**: 28 de Julio, 2025
**Versión**: 1.0.0 