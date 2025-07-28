const express = require('express');
const pool = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { Parser } = require('json2csv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configuración de multer para incidencias
const uploadDir = path.join(__dirname, '../uploads/incidencias');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o777 });
}
// Asegurar permisos de escritura
try {
  fs.accessSync(uploadDir, fs.constants.W_OK);
} catch (error) {
  console.error('Error de permisos en directorio de uploads:', error);
  // Intentar cambiar permisos
  try {
    fs.chmodSync(uploadDir, 0o777);
  } catch (chmodError) {
    console.error('No se pudieron cambiar los permisos:', chmodError);
  }
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-rar-compressed', 'application/x-zip-compressed',
    'text/plain', 'text/csv',
    'application/octet-stream'
  ];
  if (allowed.includes(file.mimetype) || file.originalname.match(/\.(zip|rar)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'));
  }
};
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter
});

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

// ===== FORMULARIOS DE APERTURA =====

// Crear formulario de apertura
router.post('/apertura', auth, requireRole(['jefe_trafico']), [
  body('empleados_no_operativos').optional().isArray(),
  body('empleados_baja').optional().isArray(),
  body('vehiculos_no_operativos').optional().isArray(),
  body('necesitan_sustitucion').optional().isArray(),
  body('no_conectados_plataforma').optional().isArray(),
  body('sin_bateria_movil').optional().isArray(),
  body('sin_bateria_vehiculo').optional().isArray(),
  body('observaciones').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      empleados_no_operativos = [],
      empleados_baja = [],
      vehiculos_no_operativos = [],
      necesitan_sustitucion = [],
      no_conectados_plataforma = [],
      sin_bateria_movil = [],
      sin_bateria_vehiculo = [],
      observaciones = ''
    } = req.body;

    // Insertar formulario
    const result = await pool.query(`
      INSERT INTO formularios_apertura (
        user_id, empleados_no_operativos, empleados_baja, vehiculos_no_operativos,
        necesitan_sustitucion, no_conectados_plataforma, sin_bateria_movil,
        sin_bateria_vehiculo, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id, empleados_no_operativos, empleados_baja, vehiculos_no_operativos,
      necesitan_sustitucion, no_conectados_plataforma, sin_bateria_movil,
      sin_bateria_vehiculo, observaciones
    ]);

    const formulario = result.rows[0];

    // Crear notificación para jefe de operaciones
    const jefeOperaciones = await pool.query("SELECT id FROM users WHERE role = 'jefe_operaciones' AND username = 'jefe.operaciones' LIMIT 1");
    
    if (jefeOperaciones.rows.length > 0) {
      await pool.query(`
        INSERT INTO notificaciones (
          jefe_operaciones_id, jefe_trafico_id, tipo_formulario, formulario_id,
          titulo, mensaje
        ) VALUES ($1, $2, 'apertura', $3, $4, $5)
      `, [
        jefeOperaciones.rows[0].id,
        req.user.id, 
        formulario.id,
        'Nuevo formulario de apertura',
        `El jefe de tráfico ${req.user.username} ha completado el formulario de apertura del día.`
      ]);
    } else {
      console.error('❌ No se encontró jefe de operaciones para crear notificación');
    }

    await logAccion(req.user.id, 'formulario_apertura', 'exitoso', `Formulario de apertura ID: ${formulario.id}`);
    res.status(201).json({
      message: 'Formulario de apertura creado exitosamente',
      formulario
    });

  } catch (error) {
    await logAccion(req.user?.id, 'formulario_apertura', 'fallido', error.message);
    console.error('Error creando formulario de apertura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener formularios de apertura
router.get('/apertura', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, fecha = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (fecha) {
      paramCount++;
      whereClause = `WHERE DATE(created_at) = $${paramCount}`;
      queryParams.push(fecha);
    }

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM formularios_apertura 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const mainQuery = `
      SELECT 
        fa.*,
        u.username as jefe_trafico_username
      FROM formularios_apertura fa
      JOIN users u ON fa.user_id = u.id
      ${whereClause}
      ORDER BY fa.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(mainQuery, queryParams);

    res.json({
      formularios: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo formularios de apertura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== FORMULARIOS DE CIERRE =====

// Crear formulario de cierre
router.post('/cierre', auth, requireRole(['jefe_trafico']), [
  body('analisis_datos').notEmpty().withMessage('Análisis de datos es requerido'),
  body('problemas_jornada').notEmpty().withMessage('Problemas de la jornada es requerido'),
  body('propuesta_soluciones').notEmpty().withMessage('Propuesta de soluciones es requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      analisis_datos,
      problemas_jornada,
      propuesta_soluciones
    } = req.body;

    // Insertar formulario
    const result = await pool.query(`
      INSERT INTO formularios_cierre (
        user_id, analisis_datos, problemas_jornada, propuesta_soluciones
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, analisis_datos, problemas_jornada, propuesta_soluciones]);

    const formulario = result.rows[0];

    // Crear notificación para jefe de operaciones
    const jefeOperacionesCierre = await pool.query("SELECT id FROM users WHERE role = 'jefe_operaciones' AND username = 'jefe.operaciones' LIMIT 1");
    
    if (jefeOperacionesCierre.rows.length > 0) {
      await pool.query(`
        INSERT INTO notificaciones (
          jefe_operaciones_id, jefe_trafico_id, tipo_formulario, formulario_id,
          titulo, mensaje
        ) VALUES ($1, $2, 'cierre', $3, $4, $5)
      `, [
        jefeOperacionesCierre.rows[0].id,
        req.user.id, 
        formulario.id,
        'Nuevo formulario de cierre',
        `El jefe de tráfico ${req.user.username} ha completado el formulario de cierre del día.`
      ]);
    } else {
      console.error('❌ No se encontró jefe de operaciones para crear notificación');
    }

    await logAccion(req.user.id, 'formulario_cierre', 'exitoso', `Formulario de cierre ID: ${formulario.id}`);
    res.status(201).json({
      message: 'Formulario de cierre creado exitosamente',
      formulario
    });

  } catch (error) {
    await logAccion(req.user?.id, 'formulario_cierre', 'fallido', error.message);
    console.error('Error creando formulario de cierre:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener formularios de cierre
router.get('/cierre', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, fecha = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (fecha) {
      paramCount++;
      whereClause = `WHERE DATE(created_at) = $${paramCount}`;
      queryParams.push(fecha);
    }

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM formularios_cierre 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const mainQuery = `
      SELECT 
        fc.*,
        u.username as jefe_trafico_username
      FROM formularios_cierre fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
      ORDER BY fc.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(mainQuery, queryParams);

    res.json({
      formularios: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo formularios de cierre:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== INCIDENCIAS =====

// Crear incidencia con archivos
router.post('/incidencias', auth, requireRole(['jefe_trafico']), upload.array('archivos', 5), [
  body('empleados_incidencia').isArray().withMessage('Empleados de incidencia es requerido'),
  body('tipo_incidencia').notEmpty().withMessage('Tipo de incidencia es requerido'),
  body('observaciones').optional().isString()
], async (req, res) => {
  console.log('🚀 Ruta de incidencias llamada');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Eliminar archivos subidos si hay error de validación
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      empleados_incidencia,
      tipo_incidencia,
      observaciones = ''
    } = req.body;

    // Insertar incidencia
    const result = await pool.query(`
      INSERT INTO incidencias (
        user_id, empleados_incidencia, tipo_incidencia, observaciones
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, empleados_incidencia, tipo_incidencia, observaciones]);

    const incidencia = result.rows[0];

    // Guardar archivos en la nueva tabla incidencias_archivos
    console.log('📁 Archivos recibidos:', req.files ? req.files.length : 0);
    if (req.files && req.files.length > 0) {
      console.log('💾 Guardando archivos en incidencias_archivos...');
      for (const file of req.files) {
        console.log('📄 Guardando archivo:', file.originalname);
        await pool.query(`
          INSERT INTO incidencias_archivos (
            incidencia_id, nombre_original, nombre_archivo, tipo_mime, tamaño, ruta_archivo, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          incidencia.id,
          file.originalname,
          file.filename,
          file.mimetype,
          file.size,
          file.path,
          req.user.id
        ]);
        console.log('✅ Archivo guardado:', file.originalname);
      }
    } else {
      console.log('ℹ️ No hay archivos para guardar');
    }

    // Crear notificación para jefe de operaciones
    const jefeOperacionesIncidencia = await pool.query("SELECT id FROM users WHERE role = 'jefe_operaciones' AND username = 'jefe.operaciones' LIMIT 1");
    
    if (jefeOperacionesIncidencia.rows.length > 0) {
      await pool.query(`
        INSERT INTO notificaciones (
          jefe_operaciones_id, jefe_trafico_id, tipo_formulario, formulario_id,
          titulo, mensaje
        ) VALUES ($1, $2, 'incidencia', $3, $4, $5)
      `, [
        jefeOperacionesIncidencia.rows[0].id,
        req.user.id, 
        incidencia.id,
        'Nueva incidencia reportada',
        `El jefe de tráfico ${req.user.username} ha reportado una incidencia: ${tipo_incidencia}`
      ]);
    } else {
      console.error('❌ No se encontró jefe de operaciones para crear notificación');
    }

    await logAccion(req.user.id, 'incidencia', 'exitoso', `Incidencia ID: ${incidencia.id}`);
    res.status(201).json({
      message: 'Incidencia creada exitosamente',
      incidencia
    });

  } catch (error) {
    // Eliminar archivos subidos si hay error
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    await logAccion(req.user?.id, 'incidencia', 'fallido', error.message);
    console.error('Error creando incidencia:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener incidencias
router.get('/incidencias', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, fecha = '', tipo = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (fecha) {
      paramCount++;
      whereConditions.push(`fecha = $${paramCount}`);
      queryParams.push(fecha);
    }

    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo_incidencia = $${paramCount}`);
      queryParams.push(tipo);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM incidencias 
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const mainQuery = `
      SELECT 
        i.*,
        u.username as jefe_trafico_username
      FROM incidencias i
      JOIN users u ON i.user_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(mainQuery, queryParams);

    res.json({
      incidencias: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo incidencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener tipos de incidencias disponibles
router.get('/incidencias/tipos', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT tipo_incidencia 
      FROM incidencias 
      WHERE tipo_incidencia IS NOT NULL AND tipo_incidencia != ''
      ORDER BY tipo_incidencia
    `);

    res.json({ tipos: result.rows.map(row => row.tipo_incidencia) });

  } catch (error) {
    console.error('Error obteniendo tipos de incidencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== ESTADÍSTICAS =====

// Obtener estadísticas de formularios
router.get('/stats', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    if (fecha_inicio && fecha_fin) {
      paramCount += 2;
      whereClause = `WHERE DATE(created_at) BETWEEN $${paramCount - 1} AND $${paramCount}`;
      queryParams.push(fecha_inicio, fecha_fin);
    }

    // Estadísticas de formularios de apertura
    const aperturaStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN array_length(empleados_no_operativos, 1) > 0 THEN 1 END) as con_empleados_no_operativos,
        COUNT(CASE WHEN array_length(empleados_baja, 1) > 0 THEN 1 END) as con_empleados_baja,
        COUNT(CASE WHEN array_length(vehiculos_no_operativos, 1) > 0 THEN 1 END) as con_vehiculos_no_operativos
      FROM formularios_apertura 
      ${whereClause}
    `, queryParams);

    // Estadísticas de formularios de cierre
    const cierreStats = await pool.query(`
      SELECT COUNT(*) as total
      FROM formularios_cierre 
      ${whereClause}
    `, queryParams);

    // Estadísticas de incidencias
    const incidenciasStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT tipo_incidencia) as tipos_diferentes
      FROM incidencias 
      ${whereClause}
    `, queryParams);

    // Incidencias por tipo
    const incidenciasPorTipo = await pool.query(`
      SELECT 
        tipo_incidencia,
        COUNT(*) as cantidad
      FROM incidencias 
      ${whereClause}
      GROUP BY tipo_incidencia
      ORDER BY cantidad DESC
    `, queryParams);

    res.json({
      apertura: aperturaStats.rows[0],
      cierre: cierreStats.rows[0],
      incidencias: incidenciasStats.rows[0],
      incidenciasPorTipo: incidenciasPorTipo.rows
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Exportar informe CSV (solo jefe de operaciones)
router.get('/informes/export', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'Debe indicar fecha_desde y fecha_hasta' });
    }

    // Formularios de apertura
    const apertura = await pool.query(`
      SELECT 
        'apertura' as tipo, 
        fa.id, 
        DATE(fa.created_at) as fecha, 
        fa.created_at as hora, 
        u.username as jefe_trafico, 
        fa.empleados_no_operativos, 
        fa.empleados_baja, 
        fa.vehiculos_no_operativos, 
        fa.necesitan_sustitucion, 
        fa.no_conectados_plataforma, 
        fa.sin_bateria_movil, 
        fa.sin_bateria_vehiculo, 
        fa.observaciones, 
        COALESCE(n.estado, 'pendiente') as estado, 
        COALESCE(n.fecha_creacion, fa.created_at) as fecha_creacion
      FROM formularios_apertura fa
      JOIN users u ON fa.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = fa.id AND n.tipo_formulario = 'apertura'
      WHERE DATE(fa.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    // Formularios de cierre
    const cierre = await pool.query(`
      SELECT 
        'cierre' as tipo, 
        fc.id, 
        DATE(fc.created_at) as fecha, 
        fc.created_at as hora, 
        u.username as jefe_trafico, 
        fc.analisis_datos, 
        fc.problemas_jornada, 
        fc.propuesta_soluciones, 
        COALESCE(n.estado, 'pendiente') as estado, 
        COALESCE(n.fecha_creacion, fc.created_at) as fecha_creacion
      FROM formularios_cierre fc
      JOIN users u ON fc.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = fc.id AND n.tipo_formulario = 'cierre'
      WHERE DATE(fc.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    // Incidencias
    const incidencias = await pool.query(`
      SELECT 
        'incidencia' as tipo, 
        i.id, 
        DATE(i.created_at) as fecha, 
        i.created_at as hora, 
        u.username as jefe_trafico, 
        i.empleados_incidencia, 
        i.tipo_incidencia, 
        i.observaciones, 
        COALESCE(n.estado, 'pendiente') as estado, 
        COALESCE(n.fecha_creacion, i.created_at) as fecha_creacion
      FROM incidencias i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = i.id AND n.tipo_formulario = 'incidencia'
      WHERE DATE(i.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    // Unir todos los resultados
    const rows = [
      ...apertura.rows,
      ...cierre.rows,
      ...incidencias.rows
    ];

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No hay datos en el rango seleccionado' });
    }

    // Convertir arrays a string para CSV
    const rowsForCsv = rows.map(row => {
      const r = { ...row };
      Object.keys(r).forEach(k => {
        if (Array.isArray(r[k])) r[k] = r[k].join(', ');
      });
      return r;
    });

    const parser = new Parser();
    const csv = parser.parse(rowsForCsv);

    res.header('Content-Type', 'text/csv');
    res.attachment(`informe_formularios_${fecha_desde}_a_${fecha_hasta}.csv`);
    return res.send(csv);
  } catch (error) {
    console.error('Error exportando informe CSV:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 