#!/usr/bin/env node

/**
 * Script para validar la configuración de CORS
 * Ejecutar antes del despliegue para prevenir errores
 */

require('dotenv').config();

const validateCorsConfig = () => {
  console.log('🔍 Validando configuración de CORS...');
  
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (!corsOrigin) {
    console.error('❌ Error: CORS_ORIGIN no está definido en las variables de entorno');
    console.log('💡 Solución: Agregar CORS_ORIGIN al archivo .env');
    process.exit(1);
  }
  
  const origins = corsOrigin.split(',').map(origin => origin.trim());
  console.log('📋 Orígenes CORS configurados:', origins);
  
  // Validar que no haya orígenes vacíos
  const emptyOrigins = origins.filter(origin => !origin);
  if (emptyOrigins.length > 0) {
    console.error('❌ Error: Hay orígenes CORS vacíos:', emptyOrigins);
    process.exit(1);
  }
  
  // Verificar orígenes comunes que deberían estar incluidos
  const requiredOrigins = [
    'http://frontend',
    'http://localhost:8082'
  ];
  
  const missingOrigins = requiredOrigins.filter(required => 
    !origins.some(origin => origin === required)
  );
  
  if (missingOrigins.length > 0) {
    console.warn('⚠️ Advertencia: Faltan orígenes recomendados:', missingOrigins);
    console.log('💡 Recomendación: Agregar estos orígenes a CORS_ORIGIN');
  }
  
  // Verificar si hay IP del VPS configurada
  const hasVpsIp = origins.some(origin => origin.includes('69.62.107.86'));
  if (!hasVpsIp) {
    console.warn('⚠️ Advertencia: No se detectó la IP del VPS en CORS_ORIGIN');
    console.log('💡 Recomendación: Agregar http://69.62.107.86:8082 si es necesario');
  }
  
  console.log('✅ Configuración de CORS válida');
  console.log('📊 Resumen:');
  console.log(`   - Total de orígenes: ${origins.length}`);
  console.log(`   - Orígenes locales: ${origins.filter(o => o.includes('localhost')).length}`);
  console.log(`   - Orígenes de red: ${origins.filter(o => o.includes('http://') && !o.includes('localhost')).length}`);
  console.log(`   - Orígenes HTTPS: ${origins.filter(o => o.includes('https://')).length}`);
};

// Ejecutar validación
validateCorsConfig(); 