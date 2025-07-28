const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();
const fs = require('fs');

console.log('📦 Módulos cargados correctamente');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Iniciando servidor...');

// Configuración de CORS más flexible y robusta
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://localhost:8082',
      'http://localhost',
      'http://frontend',
      'https://tu-dominio.com'
    ];

// Validar y limpiar orígenes CORS
const validCorsOrigins = corsOrigins.filter(origin => {
  if (!origin || origin.trim() === '') return false;
  return true;
});

console.log('🔐 CORS configurado para:', validCorsOrigins);

// Función para validar origen CORS
const validateCorsOrigin = (origin) => {
  // Permitir requests sin origin (como aplicaciones móviles)
  if (!origin) return true;
  
  // Verificar si el origen está en la lista permitida
  const isAllowed = validCorsOrigins.some(allowedOrigin => {
    // Comparación exacta
    if (allowedOrigin === origin) return true;
    
    // Soporte para wildcards
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '');
      return origin.includes(pattern);
    }
    
    return false;
  });
  
  if (!isAllowed) {
    console.warn('❌ CORS rechazado para origen:', origin);
    console.warn('📋 Orígenes permitidos:', validCorsOrigins);
  }
  
  return isAllowed;
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como aplicaciones móviles) o desde orígenes permitidos
    if (validateCorsOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Servir archivos estáticos de uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    // Configurar headers de seguridad para archivos
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
  }
}));

// Middleware para logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${req.ip}`);
    next();
  });
}

console.log('📋 Configurando rutas...');
// Rutas
console.log('🔗 Registrando rutas...');
app.use('/api/auth', require('./routes/auth'));
console.log('✅ Ruta /api/auth registrada');

if (fs.existsSync('./routes/employees.js') && fs.readFileSync('./routes/employees.js', 'utf8').trim().length > 0) {
  app.use('/api/employees', require('./routes/employees'));
  console.log('✅ Ruta /api/employees registrada');
}

app.use('/api/formularios', require('./routes/formularios'));
console.log('✅ Ruta /api/formularios registrada');

app.use('/api/notificaciones', require('./routes/notificaciones'));
console.log('✅ Ruta /api/notificaciones registrada');

app.use('/api/files', require('./routes/files'));
console.log('✅ Ruta /api/files registrada');

// Debug: Mostrar rutas registradas
console.log('🔗 Rutas registradas:');
console.log('  - /api/auth');
console.log('  - /api/formularios');
console.log('  - /api/notificaciones');
console.log('  - /api/files');

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Sistema de Solucioning Formularios funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Ruta de prueba para archivos
app.get('/api/test-files/:id', (req, res) => {
  console.log('🔍 Ruta de prueba llamada con ID:', req.params.id);
  res.json({ 
    message: 'Ruta de prueba funcionando',
    id: req.params.id,
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Error de CORS
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ 
      error: 'Acceso denegado por política CORS',
      message: 'El origen de la petición no está permitido'
    });
  }
  
  res.status(err.status || 500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Ruta 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    message: 'La ruta solicitada no existe en este servidor'
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API disponible en: http://localhost:${PORT}/api`);
    console.log(`📁 Uploads disponibles en: http://localhost:${PORT}/uploads`);
  });
}

module.exports = app; 