import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formulariosService } from '../services/api';
import { ArrowLeft, Save, AlertTriangle, Users, FileText, Paperclip } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import FileUpload from '../components/FileUpload';
import toast from 'react-hot-toast';

const Incidencias = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empleados_incidencia: '', // Ahora es string, luego se parsea
    tipo_incidencia: '',
    observaciones: ''
  });
  const [incidenciaId, setIncidenciaId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // Archivos subidos exitosamente
  const fileUploadRef = useRef(null); // Referencia al componente FileUpload

  const tiposIncidencias = [
    'Accidente de tráfico',
    'Accidente de trabajo',
    'Problema técnico del vehículo',
    'Problema con la aplicación',
    'Problema de conexión',
    'Problema de batería',
    'Problema de salud',
    'Problema de seguridad',
    'Problema de entrega',
    'Problema con el cliente',
    'Problema de horario',
    'Problema de documentación',
    'Otro'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.tipo_incidencia.trim()) {
      toast.error('Debes seleccionar un tipo de incidencia');
      return;
    }

    // Validar que haya al menos un empleado
    const empleados = formData.empleados_incidencia.split(',').map(e => e.trim()).filter(Boolean);
    if (empleados.length === 0) {
      toast.error('Debes ingresar al menos un empleado (nombre y/o ID)');
      return;
    }

    setLoading(true);

    try {
      // Crear la incidencia primero
      const response = await formulariosService.createIncidencia({
        ...formData,
        empleados_incidencia: empleados
      });
      
      if (response.incidencia && response.incidencia.id) {
        setIncidenciaId(response.incidencia.id);
        toast.success('✅ Incidencia reportada exitosamente');

        // Si hay archivos pendientes en el componente FileUpload, subirlos automáticamente
        if (fileUploadRef.current && fileUploadRef.current.uploadPendingFiles) {
          try {
            await fileUploadRef.current.uploadPendingFiles();
          } catch (err) {
            console.error('Error uploading pending files:', err);
            // Los errores individuales ya se manejan en FileUpload
          }
        }

        // Redirigir al dashboard después de un breve delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        toast.success('Incidencia reportada exitosamente');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error reportando incidencia:', error);
      toast.error('Error al reportar la incidencia: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleFilesUpdated = (files) => {
    setUploadedFiles(files);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reporte de Incidencias
            </h1>
            <p className="text-gray-600">
              Reportar incidencias con riders y observaciones
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES')}
          </p>
          <p className="text-sm text-gray-400">
            Urgente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Ingreso manual de empleados */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 text-primary-500 mr-2" />
              Riders involucrados
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ingresa los nombres y/o IDs de los empleados involucrados, separados por coma. Ejemplo: Juan Pérez (ID123), Ana López (ID456)
            </p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Empleados involucrados en la incidencia</label>
              <input
                type="text"
                name="empleados_incidencia"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.empleados_incidencia}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Puedes ingresar múltiples empleados separados por coma</p>
            </div>
          </div>
        </div>

        {/* Tipo de incidencia */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
              Tipo de incidencia
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Categoriza el tipo de incidencia reportada
            </p>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="tipo_incidencia" className="form-label">
                Tipo de incidencia
              </label>
              <select
                id="tipo_incidencia"
                name="tipo_incidencia"
                className="select"
                value={formData.tipo_incidencia}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar tipo de incidencia...</option>
                {tiposIncidencias.map((tipo, index) => (
                  <option key={index} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Observaciones */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="h-5 w-5 text-success-500 mr-2" />
              Observaciones
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Detalles adicionales sobre la incidencia
            </p>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="observaciones" className="form-label">
                Observaciones detalladas
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows={6}
                className="textarea"
                placeholder="Describe detalladamente la incidencia, incluyendo hora, lugar, circunstancias, acciones tomadas, etc..."
                value={formData.observaciones}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500 mt-1">
                Incluye todos los detalles relevantes para el seguimiento de la incidencia
              </p>
            </div>
          </div>
        </div>

        {/* Archivos adjuntos */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Paperclip className="h-5 w-5 text-primary-500 mr-2" />
              Archivos adjuntos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Agrega imágenes, documentos u otros archivos relacionados con la incidencia (opcional)
            </p>
          </div>
          
          <div className="card-body">
            <FileUpload
              ref={fileUploadRef}
              incidenciaId={incidenciaId}
              onFilesUploaded={handleFilesUpdated}
              existingFiles={uploadedFiles}
              canUpload={true}
            />
            
            {/* Información adicional sobre archivos */}
            <div className="mt-4 space-y-2">
              {!incidenciaId && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <Paperclip className="h-5 w-5 text-blue-600 mt-0.5" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-900">
                        💡 Información sobre archivos
                      </h4>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Puedes seleccionar archivos ahora y se subirán automáticamente al enviar la incidencia</li>
                          <li>Máximo 5 archivos de 5MB cada uno</li>
                          <li>Recibirás una confirmación por cada archivo subido exitosamente</li>
                          <li>Formatos aceptados: imágenes, documentos, PDFs, archivos comprimidos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {incidenciaId && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ <strong>Incidencia creada exitosamente.</strong> Ahora puedes subir archivos adicionales si es necesario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Información de urgencia */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Información de urgencia
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Datos importantes para el seguimiento
            </p>
          </div>
          
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-900 mb-2">Prioridad</h4>
                <p className="text-red-700">
                  Alta - Requiere atención inmediata
                </p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h4 className="font-medium text-yellow-900 mb-2">Estado</h4>
                <p className="text-yellow-700">
                  {incidenciaId ? 'Reportada - En proceso' : 'Pendiente de envío'}
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Hora de reporte</h4>
                <p className="text-blue-700">
                  {new Date().toLocaleTimeString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleBack}
            className="btn-secondary"
            disabled={loading}
          >
            {incidenciaId ? 'Ir al Dashboard' : 'Cancelar'}
          </button>
          
          {!incidenciaId && (
            <button
              type="submit"
              className="btn-danger"
              disabled={loading}
            >
              {loading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Reportar Incidencia
                </>
              )}
            </button>
          )}
        </div>

        {/* Mensaje de éxito */}
        {incidenciaId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Save className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-900">
                  ¡Incidencia reportada exitosamente!
                </h4>
                <p className="mt-1 text-sm text-green-700">
                  Tu reporte ha sido enviado al jefe de operaciones. ID de incidencia: <span className="font-mono font-semibold">#{incidenciaId}</span>
                </p>
                <p className="mt-1 text-xs text-green-600">
                  Serás redirigido al dashboard en unos segundos...
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default Incidencias; 