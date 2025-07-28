# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Build argument para la URL de la API
ARG REACT_APP_API_URL=/api

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (necesarias para el build)
RUN npm install --silent

# Copiar código fuente
COPY . .

# Establecer la variable de entorno para el build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Construir la aplicación
RUN npm run build

# Production stage
FROM nginx:alpine

# Instalar herramientas para healthcheck
RUN apk add --no-cache curl

# Copiar configuración de nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar archivos construidos
COPY --from=build /app/build /usr/share/nginx/html

# Crear directorio para uploads si no existe
RUN mkdir -p /usr/share/nginx/html/uploads

# Exponer puerto
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Comando para ejecutar nginx
CMD ["nginx", "-g", "daemon off;"] 