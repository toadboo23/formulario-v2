const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

// Función para generar contraseña segura de 12 caracteres
const generateSecurePassword = () => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Asegurar que tenga al menos un carácter de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Completar hasta 12 caracteres
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Mezclar la contraseña
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Función para generar nombres aleatorios (ya no se usa)
const generateRandomName = () => {
  return {
    nombre: '',
    apellido: ''
  };
};

// Función para crear usuarios de producción
const setupProductionUsers = async () => {
  try {
    console.log('🔄 Configurando usuarios de producción...');
    
    const users = [];
    const csvData = ['username,email,password,role\n'];
    
    // Crear 50 usuarios de Jefe de Tráfico
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
      
      console.log(`✅ Usuario Jefe Tráfico ${i}/50 creado: ${username}`);
    }
    
    // Crear 20 usuarios de Jefe de Operaciones
    for (let i = 1; i <= 20; i++) {
      const username = `jefeoperaciones${i}`;
      const email = `jefeoperaciones${i}@solucioning.net`;
      const password = generateSecurePassword();
      const role = 'jefe_operaciones';
      
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
      
      console.log(`✅ Usuario Jefe Operaciones ${i}/20 creado: ${username}`);
    }
    
    // Guardar archivo CSV con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = path.join(__dirname, '..', '..', 'docs', `production-users-${timestamp}.csv`);
    
    // Crear directorio si no existe
    const dir = path.dirname(csvPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(csvPath, csvData.join(''));
    
    console.log(`✅ Archivo CSV guardado en: ${csvPath}`);
    console.log(`✅ Se crearon ${users.length} usuarios en total`);
    console.log('⚠️  IMPORTANTE: Guarda este archivo CSV en un lugar seguro y elimínalo del servidor');
    
    return users;
    
  } catch (error) {
    console.error('❌ Error configurando usuarios:', error);
    throw error;
  }
};

// Función principal
const main = async () => {
  try {
    // Verificar que no se ejecute accidentalmente
    if (process.env.NODE_ENV === 'production' && !process.env.FORCE_SETUP_USERS) {
      console.log('🚨 Este script no debe ejecutarse en producción sin la variable FORCE_SETUP_USERS=true');
      console.log('💡 Para ejecutar en producción: FORCE_SETUP_USERS=true node scripts/setup-production-users.js');
      process.exit(1);
    }
    
    await setupProductionUsers();
    console.log('🎉 Configuración de usuarios completada exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('💥 Error en la configuración:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { setupProductionUsers }; 