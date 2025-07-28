const pool = require('./config/database');

const checkUser = async () => {
  try {
    const result = await pool.query('SELECT username, role, email FROM users WHERE username = $1', ['lvega']);
    console.log('Usuario lvega:', result.rows[0] || 'No encontrado');
    
    // También verificar todos los usuarios
    const allUsers = await pool.query('SELECT username, role, email FROM users ORDER BY role, username');
    console.log('\nTodos los usuarios:');
    allUsers.rows.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.email}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
};

checkUser(); 