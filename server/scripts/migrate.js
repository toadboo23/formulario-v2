const pool = require('../config/database');

const createTables = async () => {
  try {
    console.log('🔄 Creando tablas...');

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('jefe_trafico', 'jefe_operaciones')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Eliminar el bloque CREATE TABLE employees y cualquier referencia a employees

    // Tabla de formularios de apertura
    await pool.query(`
      CREATE TABLE IF NOT EXISTS formularios_apertura (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fecha DATE DEFAULT CURRENT_DATE,
        hora TIME DEFAULT CURRENT_TIME,
        
        -- Estado de la flota
        empleados_no_operativos TEXT[],
        empleados_baja TEXT[],
        vehiculos_no_operativos TEXT[],
        necesitan_sustitucion TEXT[],
        
        -- Conexión y preparación
        no_conectados_plataforma TEXT[],
        sin_bateria_movil TEXT[],
        sin_bateria_vehiculo TEXT[],
        
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de formularios de cierre
    await pool.query(`
      CREATE TABLE IF NOT EXISTS formularios_cierre (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fecha DATE DEFAULT CURRENT_DATE,
        hora TIME DEFAULT CURRENT_TIME,
        
        analisis_datos TEXT,
        problemas_jornada TEXT,
        propuesta_soluciones TEXT,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de incidencias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidencias (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        empleados_incidencia TEXT[],
        tipo_incidencia VARCHAR(100),
        observaciones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de archivos de incidencias
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidencias_archivos (
        id SERIAL PRIMARY KEY,
        incidencia_id INTEGER REFERENCES incidencias(id) ON DELETE CASCADE,
        nombre_original VARCHAR(255) NOT NULL,
        nombre_archivo VARCHAR(255) NOT NULL,
        tipo_mime VARCHAR(100) NOT NULL,
        tamaño BIGINT NOT NULL,
        ruta_archivo TEXT NOT NULL,
        uploaded_by INTEGER REFERENCES users(id),
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migración: Remover columna archivos de incidencias si existe
    try {
      await pool.query('ALTER TABLE incidencias DROP COLUMN IF EXISTS archivos');
      console.log('✅ Columna archivos removida de incidencias');
    } catch (error) {
      console.log('ℹ️ Columna archivos ya no existe en incidencias');
    }

    // Tabla de notificaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id SERIAL PRIMARY KEY,
        jefe_operaciones_id INTEGER REFERENCES users(id),
        jefe_trafico_id INTEGER REFERENCES users(id),
        tipo_formulario VARCHAR(20) NOT NULL,
        formulario_id INTEGER NOT NULL,
        titulo VARCHAR(200) NOT NULL,
        mensaje TEXT NOT NULL,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesada', 'rechazada')),
        leida BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_procesamiento TIMESTAMP,
        observaciones_procesamiento TEXT
      )
    `);

    // Tabla de logs de notificaciones
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_logs (
        id SERIAL PRIMARY KEY,
        notificacion_id INTEGER REFERENCES notificaciones(id) ON DELETE CASCADE,
        usuario_id INTEGER REFERENCES users(id),
        accion VARCHAR(50) NOT NULL,
        detalles TEXT,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de logs generales
    await pool.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES users(id),
        accion VARCHAR(50) NOT NULL,
        resultado VARCHAR(50) NOT NULL,
        detalles TEXT,
        fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Crear tabla para logging de aprobaciones/rechazos
    console.log('📋 Creando tabla formularios_logs...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS formularios_logs (
        id SERIAL PRIMARY KEY,
        formulario_id INTEGER NOT NULL,
        formulario_tipo VARCHAR(50) NOT NULL,
        accion VARCHAR(20) NOT NULL CHECK (accion IN ('aprobado', 'rechazado', 'pendiente')),
        jefe_operaciones_id INTEGER NOT NULL,
        jefe_operaciones_username VARCHAR(100) NOT NULL,
        comentario TEXT,
        fecha_accion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jefe_operaciones_id) REFERENCES users(id),
        FOREIGN KEY (formulario_id) REFERENCES formularios(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabla formularios_logs creada');

    // Crear índices para mejor rendimiento
    await pool.query('CREATE INDEX IF NOT EXISTS idx_formularios_logs_formulario_id ON formularios_logs(formulario_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_formularios_logs_jefe_operaciones_id ON formularios_logs(jefe_operaciones_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_formularios_logs_fecha_accion ON formularios_logs(fecha_accion)');
    console.log('✅ Índices creados para formularios_logs');

    // Índices para mejorar rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_formularios_apertura_created_at ON formularios_apertura(created_at);
      CREATE INDEX IF NOT EXISTS idx_formularios_cierre_created_at ON formularios_cierre(created_at);
      CREATE INDEX IF NOT EXISTS idx_incidencias_created_at ON incidencias(created_at);
      CREATE INDEX IF NOT EXISTS idx_notificaciones_estado ON notificaciones(estado);
      CREATE INDEX IF NOT EXISTS idx_notificaciones_jefe_operaciones ON notificaciones(jefe_operaciones_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Crear tabla de formularios
    console.log('📋 Creando tabla formularios...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS formularios (
        id SERIAL PRIMARY KEY,
        tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('apertura', 'cierre', 'incidencia')),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
        jefe_trafico_id INTEGER NOT NULL,
        jefe_trafico_username VARCHAR(100) NOT NULL,
        datos JSONB NOT NULL,
        FOREIGN KEY (jefe_trafico_id) REFERENCES users(id)
      )
    `);
    console.log('✅ Tabla formularios creada');

    // Agregar columna estado si no existe
    try {
      await pool.query('ALTER TABLE formularios ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT \'pendiente\' CHECK (estado IN (\'pendiente\', \'aprobado\', \'rechazado\'))');
      console.log('✅ Columna estado agregada a formularios');
    } catch (error) {
      console.log('ℹ️ Columna estado ya existe en formularios');
    }

    console.log('✅ Tablas creadas exitosamente');
  } catch (error) {
    console.error('❌ Error creando tablas:', error);
    throw error;
  }
};

const insertDefaultUsers = async () => {
  try {
    console.log('🔄 Insertando usuarios por defecto...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Insertar jefe de operaciones por defecto
    await pool.query(`
      INSERT INTO users (username, password, email, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['admin', hashedPassword, 'admin@solucioning.net', 'jefe_operaciones']);

    // Insertar jefe de tráfico por defecto
    await pool.query(`
      INSERT INTO users (username, password, email, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['jefe_trafico', hashedPassword, 'jefe.trafico@solucioning.net', 'jefe_trafico']);

    console.log('✅ Usuarios por defecto insertados');
  } catch (error) {
    console.error('❌ Error insertando usuarios:', error);
    throw error;
  }
};

const runMigrations = async () => {
  try {
    await createTables();
    await insertDefaultUsers();
    console.log('🎉 Migración completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  }
};

runMigrations(); 