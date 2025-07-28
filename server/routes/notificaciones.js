const express = require('express');
const pool = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

console.log('📋 Registrando rutas de notificaciones...');

// Función para registrar logs de acciones sobre notificaciones
const logNotificacion = async (notificacionId, usuarioId, accion, detalles = '') => {
  try {
    await pool.query(
      `INSERT INTO notificaciones_logs (notificacion_id, usuario_id, accion, detalles) VALUES ($1, $2, $3, $4)`,
      [notificacionId, usuarioId, accion, detalles]
    );
  } catch (err) {
    console.error('Error registrando log de notificación:', err);
  }
};

// Obtener notificaciones del jefe de operaciones
router.get('/', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      estado = '', 
      leida = '' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construir query dinámico
    let whereConditions = [`n.jefe_operaciones_id = $1`];
    let queryParams = [req.user.id];
    let paramCount = 1;

    if (estado) {
      paramCount++;
      whereConditions.push(`n.estado = $${paramCount}`);
      queryParams.push(estado);
    }

    if (leida !== '') {
      paramCount++;
      whereConditions.push(`n.leida = $${paramCount}`);
      queryParams.push(leida === 'true');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM notificaciones n
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const mainQuery = `
      SELECT 
        n.*,
        jt.username as jefe_trafico_username,
        jt.email as jefe_trafico_email
      FROM notificaciones n
      JOIN users jt ON n.jefe_trafico_id = jt.id
      ${whereClause}
      ORDER BY n.fecha_creacion DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(mainQuery, queryParams);

    res.json({
      notificaciones: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener notificaciones no leídas (para contador)
router.get('/unread-count', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM notificaciones 
      WHERE jefe_operaciones_id = $1 AND leida = false
    `, [req.user.id]);

    res.json({ count: parseInt(result.rows[0].count) });

  } catch (error) {
    console.error('Error obteniendo contador de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener archivos de una incidencia (para jefe de operaciones)
router.get('/:id/files', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  console.log('🔍 Ruta de archivos llamada con ID:', req.params.id);
  try {
    const { id } = req.params;

    // Primero verificar que la notificación existe y pertenece al jefe de operaciones
    const notificacionResult = await pool.query(`
      SELECT formulario_id, tipo_formulario 
      FROM notificaciones 
      WHERE id = $1 AND jefe_operaciones_id = $2
    `, [id, req.user.id]);

    if (notificacionResult.rows.length === 0) {
      console.log('❌ Notificación no encontrada para ID:', id);
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const notificacion = notificacionResult.rows[0];
    console.log('✅ Notificación encontrada:', notificacion);

    // Solo obtener archivos si es una incidencia
    if (notificacion.tipo_formulario !== 'incidencia') {
      console.log('ℹ️ No es una incidencia, retornando archivos vacíos');
      return res.json({ archivos: [] });
    }

    // Obtener archivos de la incidencia
    const archivosResult = await pool.query(`
      SELECT 
        ia.*,
        u.username as uploaded_by_username
      FROM incidencias_archivos ia
      JOIN users u ON ia.uploaded_by = u.id
      WHERE ia.incidencia_id = $1
      ORDER BY ia.fecha_subida DESC
    `, [notificacion.formulario_id]);

    console.log('📁 Archivos encontrados:', archivosResult.rows.length);
    res.json({ archivos: archivosResult.rows });

  } catch (error) {
    console.error('Error obteniendo archivos de incidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar notificación como leída
router.put('/:id/read', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE notificaciones 
      SET leida = true 
      WHERE id = $1 AND jefe_operaciones_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ 
      message: 'Notificación marcada como leída',
      notificacion: result.rows[0]
    });

  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Marcar todas las notificaciones como leídas
router.put('/read-all', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE notificaciones 
      SET leida = true 
      WHERE jefe_operaciones_id = $1 AND leida = false
      RETURNING COUNT(*) as count
    `, [req.user.id]);

    res.json({ 
      message: 'Todas las notificaciones marcadas como leídas',
      count: parseInt(result.rows[0].count)
    });

  } catch (error) {
    console.error('Error marcando todas las notificaciones como leídas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Procesar notificación (cambiar estado)
router.put('/:id/process', auth, requireRole(['jefe_operaciones']), [
  body('estado').isIn(['procesada', 'rechazada']).withMessage('Estado debe ser procesada o rechazada'),
  body('observaciones_procesamiento').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { estado, observaciones_procesamiento = '' } = req.body;

    const result = await pool.query(`
      UPDATE notificaciones 
      SET 
        estado = $1, 
        observaciones_procesamiento = $2,
        fecha_procesamiento = CURRENT_TIMESTAMP,
        leida = true
      WHERE id = $3 AND jefe_operaciones_id = $4
      RETURNING *
    `, [estado, observaciones_procesamiento, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    // Log procesamiento
    await logNotificacion(id, req.user.id, estado, observaciones_procesamiento);

    res.json({ 
      message: `Notificación ${estado} exitosamente`,
      notificacion: result.rows[0]
    });

  } catch (error) {
    console.error('Error procesando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener detalles completos de una notificación
router.get('/:id', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        n.*,
        jt.username as jefe_trafico_username,
        jt.email as jefe_trafico_email
      FROM notificaciones n
      JOIN users jt ON n.jefe_trafico_id = jt.id
      WHERE n.id = $1 AND n.jefe_operaciones_id = $2
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const notificacion = result.rows[0];

    // Log visualización
    await logNotificacion(id, req.user.id, 'visualizacion', 'El jefe de operaciones visualizó la notificación');

    // Obtener detalles del formulario relacionado
    let formularioDetalles = null;
    if (notificacion.tipo_formulario && notificacion.formulario_id) {
      let formularioQuery = '';
      
             switch (notificacion.tipo_formulario) {
         case 'apertura':
           formularioQuery = `
             SELECT 
               fa.*,
               u.username as jefe_trafico_username
             FROM formularios_apertura fa
             JOIN users u ON fa.user_id = u.id
             WHERE fa.id = $1
           `;
           break;
         case 'cierre':
           formularioQuery = `
             SELECT 
               fc.*,
               u.username as jefe_trafico_username
             FROM formularios_cierre fc
             JOIN users u ON fc.user_id = u.id
             WHERE fc.id = $1
           `;
           break;
         case 'incidencia':
           formularioQuery = `
             SELECT 
               i.*,
               u.username as jefe_trafico_username
             FROM incidencias i
             JOIN users u ON i.user_id = u.id
             WHERE i.id = $1
           `;
           break;
       }

      if (formularioQuery) {
        const formularioResult = await pool.query(formularioQuery, [notificacion.formulario_id]);
        if (formularioResult.rows.length > 0) {
          formularioDetalles = formularioResult.rows[0];
        }
      }
    }

    res.json({
      notificacion,
      formularioDetalles
    });

  } catch (error) {
    console.error('Error obteniendo detalles de notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de notificaciones
router.get('/stats/overview', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN leida = false THEN 1 END) as no_leidas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'procesada' THEN 1 END) as procesadas,
        COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas
      FROM notificaciones 
      WHERE jefe_operaciones_id = $1
    `, [req.user.id]);

    // Notificaciones por tipo
    const porTipo = await pool.query(`
      SELECT 
        tipo_formulario,
        COUNT(*) as cantidad
      FROM notificaciones 
      WHERE jefe_operaciones_id = $1
      GROUP BY tipo_formulario
      ORDER BY cantidad DESC
    `, [req.user.id]);

    // Notificaciones por jefe de tráfico
    const porJefeTrafico = await pool.query(`
      SELECT 
        jt.username,
        COUNT(*) as cantidad
      FROM notificaciones n
      JOIN users jt ON n.jefe_trafico_id = jt.id
      WHERE n.jefe_operaciones_id = $1
      GROUP BY jt.id, jt.username
      ORDER BY cantidad DESC
      LIMIT 10
    `, [req.user.id]);

    // Convertir porTipo a objeto
    const porTipoObj = {
      apertura: 0,
      cierre: 0,
      incidencia: 0
    };

    porTipo.rows.forEach(row => {
      porTipoObj[row.tipo_formulario] = parseInt(row.cantidad);
    });

    res.json({
      total: parseInt(stats.rows[0].total),
      pendientes: parseInt(stats.rows[0].pendientes),
      aprobados: parseInt(stats.rows[0].procesadas),
      rechazados: parseInt(stats.rows[0].rechazadas),
      porTipo: porTipoObj
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar notificación (solo jefe de operaciones)
router.delete('/:id', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM notificaciones 
      WHERE id = $1 AND jefe_operaciones_id = $2
      RETURNING id
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    res.json({ message: 'Notificación eliminada exitosamente' });

  } catch (error) {
    console.error('Error eliminando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

console.log('✅ Rutas de notificaciones registradas correctamente');
module.exports = router; 