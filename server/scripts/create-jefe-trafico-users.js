const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Función para generar contraseñas seguras alfanuméricas
const generateSecurePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Función para generar nombres aleatorios (ya no se usa)
const generateRandomName = () => {
  return {
    nombre: '',
    apellido: ''
  };
};

// Función para crear usuarios
const createJefeTraficoUsers = async () => {
  try {
    console.log('🔄 Creando 50 usuarios de Jefe de Tráfico...');
    
    const users = [];
    const csvData = ['username,email,password,role\n'];
    
    for (let i = 1; i <= 50; i++) {
      const username = `jefetrafico${i}`;
      const email = `jefetrafico${i}@solucioning.net`;
      const password = generateSecurePassword();
      const role = 'jefe_trafico';
      
      // Hashear la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insertar en la base de datos
      await pool.query(`
        INSERT INTO users (username, password, email, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO NOTHING
      `, [username, hashedPassword, email, role]);
      
      // Agregar a la lista para el CSV
      users.push({
        username,
        email,
        password,
        role
      });
      
      // Agregar línea al CSV
      csvData.push(`${username},${email},${password},${role}\n`);
      
      console.log(`✅ Usuario ${i}/50 creado: ${username}`);
    }
    
    // Guardar archivo CSV
    const csvPath = path.join(__dirname, '..', '..', 'docs', 'jefe-trafico-users.csv');
    
    // Crear directorio si no existe
    const dir = path.dirname(csvPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(csvPath, csvData.join(''));
    
    console.log(`✅ Archivo CSV guardado en: ${csvPath}`);
    console.log(`✅ Se crearon ${users.length} usuarios de Jefe de Tráfico`);
    
    return users;
    
  } catch (error) {
    console.error('❌ Error creando usuarios:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    await createJefeTraficoUsers();
    console.log('🎉 Proceso completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error en el proceso:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { createJefeTraficoUsers }; 