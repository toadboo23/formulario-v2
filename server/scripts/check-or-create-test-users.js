const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const TEST_USERS = [
  {
    username: 'testoperaciones',
    email: 'testoperaciones@solucioning.net',
    role: 'jefe_operaciones',
  },
  {
    username: 'testtrafico',
    email: 'testtrafico@solucioning.net',
    role: 'jefe_trafico',
  },
];

const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const main = async () => {
  try {
    const res = await pool.query('SELECT username, password FROM users');
    if (res.rows.length > 0) {
      console.log('Usuarios existentes en la base de datos:');
      res.rows.forEach(u => {
        console.log(`Usuario: ${u.username} | Hash contraseña: ${u.password}`);
      });
      process.exit(0);
    }
    // Si no hay usuarios, crear dos de prueba
    console.log('No hay usuarios, creando dos usuarios de prueba...');
    for (const user of TEST_USERS) {
      const password = generatePassword();
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4)',
        [user.username, hashed, user.email, user.role]
      );
      console.log(`Usuario creado: ${user.username} | Contraseña: ${password} | Rol: ${user.role}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

main(); 