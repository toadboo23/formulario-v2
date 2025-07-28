const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Función para registrar logs generales
const logAccion = async (usuarioId, accion, resultado, detalles = '') => {
  try {
    await pool.query(
      `INSERT INTO logs (usuario_id, accion, resultado, detalles) VALUES ($1, $2, $3, $4)` ,
      [usuarioId, accion, resultado, detalles]
    );
  } catch (err) {
    console.error('Error registrando log general:', err);
  }
};

// Login
router.post('/login', [
  body('username').notEmpty().withMessage('Usuario es requerido'),
  body('password').notEmpty().withMessage('Contraseña es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    // Buscar usuario
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await logAccion(null, 'login', 'fallido', `Intento de login con usuario inexistente: ${username}`);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logAccion(user.id, 'login', 'fallido', 'Contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'formularios_jwt_secret_key_2024',
      { expiresIn: '24h' }
    );

    // Enviar respuesta sin contraseña
    const { password: _, ...userWithoutPassword } = user;
    await logAccion(user.id, 'login', 'exitoso', 'Login correcto');
    res.json({
      message: 'Login exitoso',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar token
router.get('/verify', auth, async (req, res) => {
  try {
    res.json({
      message: 'Token válido',
      user: req.user
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil del usuario
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Cambiar contraseña
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Contraseña actual es requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // Obtener usuario actual
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await pool.query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario (solo jefe de operaciones)
router.post('/create-user', auth, [
  body('username').notEmpty().withMessage('Usuario es requerido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('role').isIn(['jefe_operaciones', 'jefe_trafico']).withMessage('Rol inválido')
], async (req, res) => {
  try {
    // Solo jefe de operaciones puede crear usuarios
    if (req.user.role !== 'jefe_operaciones') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { username, password, email, role } = req.body;
    
    // Verificar que el usuario no exista
    const exists = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insertar usuario
    const result = await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
      [username, hashedPassword, email, role]
    );
    
    await logAccion(req.user.id, 'crear_usuario', 'exitoso', `Usuario creado: ${username} (${role})`);
    res.status(201).json({ user: result.rows[0], message: 'Usuario creado correctamente' });
  } catch (error) {
    await logAccion(req.user?.id, 'crear_usuario', 'fallido', error.message);
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 