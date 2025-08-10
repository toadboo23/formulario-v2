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

// Exportar informe Excel (solo jefe de operaciones)
router.get('/informes/export', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta } = req.query;
    if (!fecha_desde || !fecha_hasta) {
      return res.status(400).json({ error: 'Debe indicar fecha_desde y fecha_hasta' });
    }

    // Importar ExcelJS
    const ExcelJS = require('exceljs');
    const moment = require('moment');

    // Crear nuevo workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Solucioning Formularios';
    workbook.lastModifiedBy = 'Sistema de Formularios';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Función para formatear arrays como texto
    const formatArray = (arr) => {
      if (!arr || !Array.isArray(arr)) return '';
      return arr.join(', ');
    };

    // Función para formatear fechas
    const formatDate = (date) => {
      if (!date) return '';
      return moment(date).format('DD/MM/YYYY HH:mm:ss');
    };

    // ===== HOJA 1: FORMULARIOS DE APERTURA =====
    const worksheetApertura = workbook.addWorksheet('Formularios Apertura');
    
    // Configurar columnas para apertura
    worksheetApertura.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 12 },
      { header: 'Jefe de Tráfico', key: 'jefe_trafico', width: 20 },
      { header: 'Empleados No Operativos', key: 'empleados_no_operativos', width: 30 },
      { header: 'Empleados de Baja', key: 'empleados_baja', width: 25 },
      { header: 'Vehículos No Operativos', key: 'vehiculos_no_operativos', width: 30 },
      { header: 'Necesitan Sustitución', key: 'necesitan_sustitucion', width: 25 },
      { header: 'No Conectados Plataforma', key: 'no_conectados_plataforma', width: 30 },
      { header: 'Sin Batería Móvil', key: 'sin_bateria_movil', width: 25 },
      { header: 'Sin Batería Vehículo', key: 'sin_bateria_vehiculo', width: 25 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha Creación', key: 'fecha_creacion', width: 20 }
    ];

    // Obtener datos de formularios de apertura
    const apertura = await pool.query(`
      SELECT 
        fa.id, 
        DATE(fa.created_at) as fecha, 
        TO_CHAR(fa.created_at, 'HH24:MI:SS') as hora, 
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
        fa.created_at as fecha_creacion
      FROM formularios_apertura fa
      JOIN users u ON fa.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = fa.id AND n.tipo_formulario = 'apertura'
      WHERE DATE(fa.created_at) BETWEEN $1 AND $2
      ORDER BY fa.created_at DESC
    `, [fecha_desde, fecha_hasta]);

    // Agregar datos a la hoja de apertura
    apertura.rows.forEach(row => {
      worksheetApertura.addRow({
        id: row.id,
        fecha: moment(row.fecha).format('DD/MM/YYYY'),
        hora: row.hora,
        jefe_trafico: row.jefe_trafico,
        empleados_no_operativos: formatArray(row.empleados_no_operativos),
        empleados_baja: formatArray(row.empleados_baja),
        vehiculos_no_operativos: formatArray(row.vehiculos_no_operativos),
        necesitan_sustitucion: formatArray(row.necesitan_sustitucion),
        no_conectados_plataforma: formatArray(row.no_conectados_plataforma),
        sin_bateria_movil: formatArray(row.sin_bateria_movil),
        sin_bateria_vehiculo: formatArray(row.sin_bateria_vehiculo),
        observaciones: row.observaciones || '',
        estado: row.estado,
        fecha_creacion: formatDate(row.fecha_creacion)
      });
    });

    // ===== HOJA 2: FORMULARIOS DE CIERRE =====
    const worksheetCierre = workbook.addWorksheet('Formularios Cierre');
    
    // Configurar columnas para cierre
    worksheetCierre.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 12 },
      { header: 'Jefe de Tráfico', key: 'jefe_trafico', width: 20 },
      { header: 'Análisis de Datos', key: 'analisis_datos', width: 50 },
      { header: 'Problemas de la Jornada', key: 'problemas_jornada', width: 50 },
      { header: 'Propuesta de Soluciones', key: 'propuesta_soluciones', width: 50 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha Creación', key: 'fecha_creacion', width: 20 }
    ];

    // Obtener datos de formularios de cierre
    const cierre = await pool.query(`
      SELECT 
        fc.id, 
        DATE(fc.created_at) as fecha, 
        TO_CHAR(fc.created_at, 'HH24:MI:SS') as hora, 
        u.username as jefe_trafico, 
        fc.analisis_datos, 
        fc.problemas_jornada, 
        fc.propuesta_soluciones, 
        COALESCE(n.estado, 'pendiente') as estado, 
        fc.created_at as fecha_creacion
      FROM formularios_cierre fc
      JOIN users u ON fc.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = fc.id AND n.tipo_formulario = 'cierre'
      WHERE DATE(fc.created_at) BETWEEN $1 AND $2
      ORDER BY fc.created_at DESC
    `, [fecha_desde, fecha_hasta]);

    // Agregar datos a la hoja de cierre
    cierre.rows.forEach(row => {
      worksheetCierre.addRow({
        id: row.id,
        fecha: moment(row.fecha).format('DD/MM/YYYY'),
        hora: row.hora,
        jefe_trafico: row.jefe_trafico,
        analisis_datos: row.analisis_datos || '',
        problemas_jornada: row.problemas_jornada || '',
        propuesta_soluciones: row.propuesta_soluciones || '',
        estado: row.estado,
        fecha_creacion: formatDate(row.fecha_creacion)
      });
    });

    // ===== HOJA 3: INCIDENCIAS =====
    const worksheetIncidencias = workbook.addWorksheet('Incidencias');
    
    // Configurar columnas para incidencias
    worksheetIncidencias.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Hora', key: 'hora', width: 12 },
      { header: 'Jefe de Tráfico', key: 'jefe_trafico', width: 20 },
      { header: 'Empleados Afectados', key: 'empleados_incidencia', width: 30 },
      { header: 'Tipo de Incidencia', key: 'tipo_incidencia', width: 25 },
      { header: 'Observaciones', key: 'observaciones', width: 50 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Fecha Creación', key: 'fecha_creacion', width: 20 }
    ];

    // Obtener datos de incidencias
    const incidencias = await pool.query(`
      SELECT 
        i.id, 
        DATE(i.created_at) as fecha, 
        TO_CHAR(i.created_at, 'HH24:MI:SS') as hora, 
        u.username as jefe_trafico, 
        i.empleados_incidencia, 
        i.tipo_incidencia, 
        i.observaciones, 
        COALESCE(n.estado, 'pendiente') as estado, 
        i.created_at as fecha_creacion
      FROM incidencias i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN notificaciones n ON n.formulario_id = i.id AND n.tipo_formulario = 'incidencia'
      WHERE DATE(i.created_at) BETWEEN $1 AND $2
      ORDER BY i.created_at DESC
    `, [fecha_desde, fecha_hasta]);

    // Agregar datos a la hoja de incidencias
    incidencias.rows.forEach(row => {
      worksheetIncidencias.addRow({
        id: row.id,
        fecha: moment(row.fecha).format('DD/MM/YYYY'),
        hora: row.hora,
        jefe_trafico: row.jefe_trafico,
        empleados_incidencia: formatArray(row.empleados_incidencia),
        tipo_incidencia: row.tipo_incidencia || '',
        observaciones: row.observaciones || '',
        estado: row.estado,
        fecha_creacion: formatDate(row.fecha_creacion)
      });
    });

    // ===== HOJA 4: RESUMEN GENERAL =====
    const worksheetResumen = workbook.addWorksheet('Resumen General');
    
    // Configurar columnas para resumen
    worksheetResumen.columns = [
      { header: 'Tipo de Formulario', key: 'tipo', width: 20 },
      { header: 'Total Registros', key: 'total', width: 15 },
      { header: 'Pendientes', key: 'pendientes', width: 15 },
      { header: 'Aprobados', key: 'aprobados', width: 15 },
      { header: 'Rechazados', key: 'rechazados', width: 15 }
    ];

    // Calcular estadísticas
    const statsApertura = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN n.estado = 'pendiente' OR n.estado IS NULL THEN 1 END) as pendientes,
        COUNT(CASE WHEN n.estado = 'aprobado' THEN 1 END) as aprobados,
        COUNT(CASE WHEN n.estado = 'rechazado' THEN 1 END) as rechazados
      FROM formularios_apertura fa
      LEFT JOIN notificaciones n ON n.formulario_id = fa.id AND n.tipo_formulario = 'apertura'
      WHERE DATE(fa.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    const statsCierre = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN n.estado = 'pendiente' OR n.estado IS NULL THEN 1 END) as pendientes,
        COUNT(CASE WHEN n.estado = 'aprobado' THEN 1 END) as aprobados,
        COUNT(CASE WHEN n.estado = 'rechazado' THEN 1 END) as rechazados
      FROM formularios_cierre fc
      LEFT JOIN notificaciones n ON n.formulario_id = fc.id AND n.tipo_formulario = 'cierre'
      WHERE DATE(fc.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    const statsIncidencias = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN n.estado = 'pendiente' OR n.estado IS NULL THEN 1 END) as pendientes,
        COUNT(CASE WHEN n.estado = 'aprobado' THEN 1 END) as aprobados,
        COUNT(CASE WHEN n.estado = 'rechazado' THEN 1 END) as rechazados
      FROM incidencias i
      LEFT JOIN notificaciones n ON n.formulario_id = i.id AND n.tipo_formulario = 'incidencia'
      WHERE DATE(i.created_at) BETWEEN $1 AND $2
    `, [fecha_desde, fecha_hasta]);

    // Agregar datos al resumen
    worksheetResumen.addRow({
      tipo: 'Formularios de Apertura',
      total: statsApertura.rows[0].total,
      pendientes: statsApertura.rows[0].pendientes,
      aprobados: statsApertura.rows[0].aprobados,
      rechazados: statsApertura.rows[0].rechazados
    });

    worksheetResumen.addRow({
      tipo: 'Formularios de Cierre',
      total: statsCierre.rows[0].total,
      pendientes: statsCierre.rows[0].pendientes,
      aprobados: statsCierre.rows[0].aprobados,
      rechazados: statsCierre.rows[0].rechazados
    });

    worksheetResumen.addRow({
      tipo: 'Incidencias',
      total: statsIncidencias.rows[0].total,
      pendientes: statsIncidencias.rows[0].pendientes,
      aprobados: statsIncidencias.rows[0].aprobados,
      rechazados: statsIncidencias.rows[0].rechazados
    });

    // Aplicar estilos a todas las hojas
    [worksheetApertura, worksheetCierre, worksheetIncidencias, worksheetResumen].forEach(worksheet => {
      // Estilo para el header
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
      };
      worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

      // Bordes para todas las celdas
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    // Verificar si hay datos
    const totalRegistros = apertura.rows.length + cierre.rows.length + incidencias.rows.length;
    if (totalRegistros === 0) {
      return res.status(404).json({ error: 'No hay datos en el rango seleccionado' });
    }

    // Generar archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Configurar headers de respuesta
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=informe_formularios_${fecha_desde}_a_${fecha_hasta}.xlsx`);
    
    return res.send(buffer);

  } catch (error) {
    console.error('Error exportando informe Excel:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta para obtener todos los formularios (para jefes de tráfico)
router.get('/todos', auth, requireRole(['jefe_trafico']), async (req, res) => {
  try {
    console.log('📋 Obteniendo todos los formularios para jefe de tráfico...');
    
    // Verificar que sea jefe de tráfico
    if (req.user.role !== 'jefe_trafico') {
      return res.status(403).json({ 
        error: 'Acceso denegado', 
        message: 'Solo los jefes de tráfico pueden ver todos los formularios' 
      });
    }

    const query = `
      SELECT 
        f.id,
        f.tipo,
        f.fecha_creacion,
        f.fecha_modificacion,
        f.estado,
        f.jefe_trafico_username,
        f.datos,
        u.username as jefe_trafico_username,
        COALESCE(
          (SELECT fl.accion 
           FROM formularios_logs fl 
           WHERE fl.formulario_id = f.id 
           ORDER BY fl.fecha_accion DESC 
           LIMIT 1), 
          'pendiente'
        ) as ultima_accion,
        COALESCE(
          (SELECT fl.jefe_operaciones_username 
           FROM formularios_logs fl 
           WHERE fl.formulario_id = f.id 
           ORDER BY fl.fecha_accion DESC 
           LIMIT 1), 
          NULL
        ) as ultimo_jefe_operaciones,
        COALESCE(
          (SELECT fl.comentario 
           FROM formularios_logs fl 
           WHERE fl.formulario_id = f.id 
           ORDER BY fl.fecha_accion DESC 
           LIMIT 1), 
          NULL
        ) as ultimo_comentario
      FROM formularios f
      LEFT JOIN users u ON f.jefe_trafico_id = u.id
      ORDER BY f.fecha_creacion DESC
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Se encontraron ${result.rows.length} formularios`);
    
    res.json({
      success: true,
      formularios: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo formularios:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: 'No se pudieron obtener los formularios' 
    });
  }
});

// Ruta para aprobar/rechazar formularios (para jefes de operaciones)
router.put('/:id/estado', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { id } = req.params;
    const { accion, comentario } = req.body; // accion: 'aprobado' o 'rechazado'
    
    console.log(`📋 Actualizando estado del formulario ${id} a ${accion}...`);
    
    // Verificar que el formulario existe
    const formularioCheck = await pool.query('SELECT id, tipo FROM formularios WHERE id = $1', [id]);
    if (formularioCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Formulario no encontrado', 
        message: 'El formulario especificado no existe' 
      });
    }

    // Actualizar estado del formulario
    await pool.query(
      'UPDATE formularios SET estado = $1, fecha_modificacion = CURRENT_TIMESTAMP WHERE id = $2',
      [accion, id]
    );

    // Registrar en el log
    await pool.query(`
      INSERT INTO formularios_logs (
        formulario_id, 
        formulario_tipo, 
        accion, 
        jefe_operaciones_id, 
        jefe_operaciones_username, 
        comentario
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      formularioCheck.rows[0].tipo,
      accion,
      req.user.id,
      req.user.username,
      comentario || null
    ]);

    console.log(`✅ Formulario ${id} ${accion} por ${req.user.username}`);

    res.json({
      success: true,
      message: `Formulario ${accion} exitosamente`,
      formulario_id: id,
      estado: accion,
      jefe_operaciones: req.user.username,
      comentario: comentario
    });

  } catch (error) {
    console.error('❌ Error actualizando estado del formulario:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: 'No se pudo actualizar el estado del formulario' 
    });
  }
});

// Ruta para obtener historial de un formulario
router.get('/:id/historial', auth, requireRole(['jefe_operaciones']), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📋 Obteniendo historial del formulario ${id}...`);
    
    // Verificar que el formulario existe
    const formularioCheck = await pool.query('SELECT id, tipo, jefe_trafico_username FROM formularios WHERE id = $1', [id]);
    if (formularioCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Formulario no encontrado', 
        message: 'El formulario especificado no existe' 
      });
    }

    // Obtener historial de logs
    const historialQuery = `
      SELECT 
        fl.id,
        fl.accion,
        fl.jefe_operaciones_username,
        fl.comentario,
        fl.fecha_accion
      FROM formularios_logs fl
      WHERE fl.formulario_id = $1
      ORDER BY fl.fecha_accion DESC
    `;

    const historialResult = await pool.query(historialQuery, [id]);
    
    console.log(`✅ Historial obtenido: ${historialResult.rows.length} registros`);

    res.json({
      success: true,
      formulario: formularioCheck.rows[0],
      historial: historialResult.rows
    });

  } catch (error) {
    console.error('❌ Error obteniendo historial:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      message: 'No se pudo obtener el historial del formulario' 
    });
  }
});

module.exports = router; 