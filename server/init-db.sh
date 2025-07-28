#!/bin/sh

echo "🔄 Esperando a que PostgreSQL esté listo..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "✅ PostgreSQL está listo!"

echo "🔄 Ejecutando migraciones..."
npm run db:migrate

echo "🔄 Importando datos de empleados..."
npm run db:seed

echo "✅ Base de datos inicializada correctamente!"

echo "🚀 Iniciando servidor..."
npm start 