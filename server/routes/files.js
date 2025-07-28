const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Configurar multer para guardar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/incidencias');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp + nombre original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const name = path.basename(file.originalname, extension);
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
    
    cb(null, `${cleanName}_${uniqueSuffix}${extension}`);
  }
});

// Configurar filtros y límites
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB en bytes
    files: 5 // Máximo 5 archivos por request
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'El archivo es demasiado grande. Máximo permitido: 50MB' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Demasiados archivos. Máximo permitido: 5 archivos' 
      });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  
  next(err);
};

// Subir archivos para una incidencia
router.post('/upload/:incidenciaId', 
  auth, 
  requireRole(['jefe_trafico']), 
  upload.array('files', 5), 
  handleMulterError,
  async (req, res) => {
    try {
      const { incidenciaId } = req.params;
      
      // Verificar que la incidencia existe y pertenece al usuario
      const incidenciaResult = await pool.query(
        'SELECT id FROM incidencias WHERE id = $1 AND user_id = $2',
        [incidenciaId, req.user.id]
      );
      
      if (incidenciaResult.rows.length === 0) {
        // Eliminar archivos subidos si la incidencia no es válida
        req.files?.forEach(file => {
          fs.unlinkSync(file.path);
        });
        return res.status(404).json({ error: 'Incidencia no encontrada' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos' });
      }

      const archivosGuardados = [];

      // Guardar información de cada archivo en la base de datos
      for (const file of req.files) {
        const result = await pool.query(`
          INSERT INTO incidencias_archivos 
          (incidencia_id, nombre_original, nombre_archivo, tipo_mime, tamaño, ruta_archivo, uploaded_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          incidenciaId,
          file.originalname,
          file.filename,
          file.mimetype,
          file.size,
          file.path,
          req.user.id
        ]);

        archivosGuardados.push({
          id: result.rows[0].id,
          nombre_original: file.originalname,
          tamaño: file.size,
          tipo_mime: file.mimetype,
          fecha_subida: result.rows[0].fecha_subida
        });
      }

      res.json({
        message: `${req.files.length} archivo(s) subido(s) exitosamente`,
        archivos: archivosGuardados
      });

    } catch (error) {
      console.error('Error subiendo archivos:', error);
      
      // Limpiar archivos subidos en caso de error
      req.files?.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error eliminando archivo:', unlinkError);
        }
      });
      
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// Obtener lista de archivos de una incidencia
router.get('/incidencia/:incidenciaId', 
  auth, 
  requireRole(['jefe_trafico', 'jefe_operaciones']),
  async (req, res) => {
    try {
      const { incidenciaId } = req.params;

      // Para jefe de operaciones: puede ver cualquier incidencia
      // Para jefe de tráfico: solo sus propias incidencias
      let query = `
        SELECT 
          ia.*,
          u.username as uploaded_by_username
        FROM incidencias_archivos ia
        JOIN users u ON ia.uploaded_by = u.id
        WHERE ia.incidencia_id = $1
      `;
      let params = [incidenciaId];

      if (req.user.role === 'jefe_trafico') {
        query += ` AND EXISTS (
          SELECT 1 FROM incidencias i 
          WHERE i.id = ia.incidencia_id AND i.user_id = $2
        )`;
        params.push(req.user.id);
      }

      query += ` ORDER BY ia.fecha_subida DESC`;

      const result = await pool.query(query, params);

      res.json({ archivos: result.rows });

    } catch (error) {
      console.error('Error obteniendo archivos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// Descargar archivo
router.get('/download/:archivoId', 
  auth, 
  requireRole(['jefe_trafico', 'jefe_operaciones']),
  async (req, res) => {
    try {
      const { archivoId } = req.params;

      // Obtener información del archivo
      let query = `
        SELECT ia.*, i.user_id as incidencia_owner
        FROM incidencias_archivos ia
        JOIN incidencias i ON ia.incidencia_id = i.id
        WHERE ia.id = $1
      `;
      
      const result = await pool.query(query, [archivoId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      const archivo = result.rows[0];

      // Verificar permisos: jefe de operaciones ve todo, jefe de tráfico solo sus archivos
      if (req.user.role === 'jefe_trafico' && archivo.incidencia_owner !== req.user.id) {
        return res.status(403).json({ error: 'No autorizado para descargar este archivo' });
      }

      // Verificar que el archivo existe en el sistema de archivos
      if (!fs.existsSync(archivo.ruta_archivo)) {
        return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
      }

      // Configurar headers para descarga
      res.setHeader('Content-Type', archivo.tipo_mime);
      res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombre_original}"`);
      res.setHeader('Content-Length', archivo.tamaño);

      // Enviar archivo
      const fileStream = fs.createReadStream(archivo.ruta_archivo);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Error descargando archivo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// Eliminar archivo (solo el que lo subió)
router.delete('/:archivoId', 
  auth, 
  requireRole(['jefe_trafico']),
  async (req, res) => {
    try {
      const { archivoId } = req.params;

      // Obtener información del archivo y verificar propiedad
      const result = await pool.query(`
        SELECT ia.*, i.user_id as incidencia_owner
        FROM incidencias_archivos ia
        JOIN incidencias i ON ia.incidencia_id = i.id
        WHERE ia.id = $1 AND ia.uploaded_by = $2
      `, [archivoId, req.user.id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Archivo no encontrado o no autorizado' });
      }

      const archivo = result.rows[0];

      // Eliminar archivo del sistema de archivos
      if (fs.existsSync(archivo.ruta_archivo)) {
        fs.unlinkSync(archivo.ruta_archivo);
      }

      // Eliminar registro de la base de datos
      await pool.query('DELETE FROM incidencias_archivos WHERE id = $1', [archivoId]);

      res.json({ message: 'Archivo eliminado exitosamente' });

    } catch (error) {
      console.error('Error eliminando archivo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

module.exports = router; 