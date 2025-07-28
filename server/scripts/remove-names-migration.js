const pool = require('../config/database');

const removeNamesMigration = async () => {
  try {
    console.log('🔄 Iniciando migración para remover nombres y apellidos...');
    
    // 1. Crear una nueva tabla users sin los campos nombre y apellido
    console.log('📋 Creando nueva tabla users sin campos nombre y apellido...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users_new (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('jefe_trafico', 'jefe_operaciones')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 2. Copiar datos existentes (excluyendo nombre y apellido)
    console.log('📊 Copiando datos existentes...');
    await pool.query(`
      INSERT INTO users_new (id, username, password, email, role, created_at, updated_at)
      SELECT id, username, password, email, role, created_at, updated_at
      FROM users
      ON CONFLICT (username) DO NOTHING
    `);
    
    // 3. Eliminar la tabla antigua
    console.log('🗑️ Eliminando tabla antigua...');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    
    // 4. Renombrar la nueva tabla
    console.log('🔄 Renombrando tabla...');
    await pool.query('ALTER TABLE users_new RENAME TO users');
    
    // 5. Recrear los índices
    console.log('🔍 Recreando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    
    // 6. Verificar que los datos se copiaron correctamente
    const result = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`✅ Migración completada. Total de usuarios: ${result.rows[0].total}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    await removeNamesMigration();
    console.log('🎉 Migración de nombres y apellidos completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { removeNamesMigration }; 