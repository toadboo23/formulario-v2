# 📋 Reglas Estrictas de Commit - Solo Código Fuente

## 🎯 **Objetivo**
Este proyecto sigue reglas estrictas de commit para evitar problemas de configuración entre diferentes entornos. **Solo se permite subir código fuente**, nunca archivos de configuración.

## ✅ **Qué SÍ se puede subir (Código Fuente)**

### **Frontend (React)**
- ✅ `client/src/` - Código fuente de React
- ✅ `client/public/` - Archivos públicos estáticos
- ✅ `client/package.json` - Dependencias del frontend
- ✅ `client/Dockerfile` - Configuración de Docker

### **Backend (Node.js)**
- ✅ `server/src/` - Código fuente del servidor
- ✅ `server/routes/` - Rutas de la API
- ✅ `server/middleware/` - Middleware
- ✅ `server/models/` - Modelos de datos
- ✅ `server/package.json` - Dependencias del backend
- ✅ `server/Dockerfile` - Configuración de Docker

### **Base de Datos**
- ✅ `server/scripts/migrate.js` - Scripts de migración
- ✅ `server/scripts/seed.js` - Scripts de datos iniciales

### **Docker y Despliegue**
- ✅ `docker-compose.yml` - Configuración principal de Docker
- ✅ `Dockerfile` - Configuración de Docker
- ✅ `.github/workflows/` - GitHub Actions

### **Documentación**
- ✅ `README.md` - Documentación principal
- ✅ `docs/` - Documentación del proyecto
- ✅ `LICENSE` - Licencia del proyecto

## ❌ **Qué NO se puede subir (Configuración)**

### **Variables de Entorno**
- ❌ `.env`
- ❌ `.env.local`
- ❌ `.env.production`
- ❌ `.env.staging`
- ❌ `.env.development`

### **Archivos de Configuración Sensibles**
- ❌ `config/production.json`
- ❌ `config/staging.json`
- ❌ `config/database.json`
- ❌ `config/email.json`

### **Certificados y Claves**
- ❌ `*.pem`
- ❌ `*.key`
- ❌ `*.crt`
- ❌ `id_rsa`
- ❌ `id_rsa.pub`
- ❌ `*.ppk`

### **Archivos de Prueba y Debug**
- ❌ `test-*.js`
- ❌ `debug-*.js`
- ❌ `check-*.js`
- ❌ `verify-*.js`
- ❌ `create-*.js`
- ❌ `fix-*.js`

### **Logs y Archivos Temporales**
- ❌ `*.log`
- ❌ `logs/`
- ❌ `*.tmp`
- ❌ `temp/`
- ❌ `tmp/`

### **Dependencias y Build**
- ❌ `node_modules/`
- ❌ `build/`
- ❌ `dist/`
- ❌ `coverage/`

### **Archivos de Lock**
- ❌ `package-lock.json`
- ❌ `yarn.lock`
- ❌ `pnpm-lock.yaml`

## 🔧 **Configuración por Entorno**

### **Desarrollo Local**
```bash
# Copiar archivo de ejemplo
cp env.example .env

# Editar variables de entorno
nano .env
```

### **VPS/Producción**
```bash
# En el VPS, después del despliegue
cd /opt/formularios-v2
cp env.example .env

# Editar para producción
nano .env
```

## 📝 **Comandos de Commit Seguros**

### **Verificar qué se va a subir**
```bash
git status
git diff --cached
```

### **Commit solo código fuente**
```bash
# Agregar solo archivos específicos
git add client/src/
git add server/src/
git add server/routes/
git add docker-compose.yml
git add README.md

# Commit
git commit -m "feat: agregar nueva funcionalidad"

# Push
git push origin main
```

### **Ignorar archivos de configuración**
```bash
# Si accidentalmente agregaste archivos de configuración
git reset HEAD .env
git reset HEAD config/
git reset HEAD *.log
```

## 🚨 **Verificaciones Antes del Commit**

### **1. Verificar .gitignore**
```bash
# Verificar que los archivos sensibles estén ignorados
git check-ignore .env
git check-ignore config/
git check-ignore *.log
```

### **2. Verificar qué se va a subir**
```bash
# Ver archivos que se van a commitear
git diff --cached --name-only
```

### **3. Verificar que no haya archivos sensibles**
```bash
# Buscar archivos que no deberían subirse
git diff --cached --name-only | grep -E "\.(env|log|key|pem|crt|ppk)$"
```

## 🔍 **Ejemplos de Commits Correctos**

### **✅ Correcto - Solo código fuente**
```bash
git add client/src/components/NewComponent.js
git add server/routes/newRoute.js
git add server/models/NewModel.js
git commit -m "feat: agregar nueva funcionalidad de usuarios"
```

### **❌ Incorrecto - Incluye configuración**
```bash
git add .env                    # ❌ NO
git add config/production.json  # ❌ NO
git add *.log                   # ❌ NO
git add id_rsa                  # ❌ NO
```

## 🛡️ **Protecciones Automáticas**

### **Pre-commit Hook (Opcional)**
```bash
# Crear hook para verificar archivos sensibles
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Verificar que no se suban archivos sensibles
if git diff --cached --name-only | grep -E "\.(env|log|key|pem|crt|ppk)$"; then
    echo "❌ Error: No se pueden subir archivos sensibles"
    echo "📋 Archivos bloqueados:"
    git diff --cached --name-only | grep -E "\.(env|log|key|pem|crt|ppk)$"
    exit 1
fi
echo "✅ Commit seguro - solo código fuente"
EOF

chmod +x .git/hooks/pre-commit
```

## 📋 **Checklist Antes del Commit**

- [ ] ✅ No hay archivos `.env` en el commit
- [ ] ✅ No hay archivos de configuración sensibles
- [ ] ✅ No hay certificados o claves SSH
- [ ] ✅ No hay logs o archivos temporales
- [ ] ✅ No hay `node_modules` o archivos de build
- [ ] ✅ Solo código fuente y documentación
- [ ] ✅ Archivos de ejemplo están incluidos (`env.example`)

## 🚀 **Beneficios de estas Reglas**

1. **🔒 Seguridad**: No se exponen credenciales
2. **🔄 Consistencia**: Configuración específica por entorno
3. **🐛 Prevención de errores**: Evita conflictos de configuración
4. **📦 Tamaño del repo**: Solo código fuente, más ligero
5. **🛡️ Despliegue seguro**: Cada entorno tiene su configuración

## 📞 **En caso de Emergencia**

Si necesitas subir un archivo de configuración temporalmente:

1. **Crear rama temporal**
```bash
git checkout -b temp-config
```

2. **Subir solo a esa rama**
```bash
git add .env
git commit -m "temp: configuración temporal"
git push origin temp-config
```

3. **Eliminar después**
```bash
git checkout main
git branch -D temp-config
git push origin --delete temp-config
```

---

**⚠️ Recuerda: Solo código fuente, nunca configuración** 