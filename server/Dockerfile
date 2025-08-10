FROM node:18-alpine

# Instalar herramientas necesarias
RUN apk add --no-cache netcat-openbsd wget

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production --silent

# Copiar código fuente
COPY . .

# Crear directorio para uploads y establecer permisos correctos como root
RUN mkdir -p uploads/incidencias && \
    chown -R node:node uploads && \
    chmod -R 777 uploads

# Hacer ejecutable el script de inicialización
RUN chmod +x init-db.sh

# Cambiar a usuario no-root
USER node

# Exponer puerto
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Comando para ejecutar la aplicación
CMD ["./init-db.sh"] 