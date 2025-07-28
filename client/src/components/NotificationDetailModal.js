import React, { useEffect, useState } from 'react';
import { notificacionesService } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { X, Download, File, FileText, Image, Archive } from 'lucide-react';
import toast from 'react-hot-toast';

const NotificationDetailModal = ({ id, onClose, onApprove, onReject }) => {
  const [loading, setLoading] = useState(true);
  const [notificacion, setNotificacion] = useState(null);
  const [formularioDetalles, setFormularioDetalles] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [loadingArchivos, setLoadingArchivos] = useState(false);
  const [error, setError] = useState(null);

  const fetchArchivos = async () => {
    if (!notificacion || notificacion.tipo_formulario !== 'incidencia') return;
    
    setLoadingArchivos(true);
    try {
      const response = await notificacionesService.getArchivos(id);
      setArchivos(response.data.archivos || []);
    } catch (err) {
      console.error('Error obteniendo archivos:', err);
      toast.error('Error al cargar los archivos');
    } finally {
      setLoadingArchivos(false);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await notificacionesService.getById(id);
        setNotificacion(response.data.notificacion);
        setFormularioDetalles(response.data.formularioDetalles);
      } catch (err) {
        setError('Error al cargar el detalle de la notificación');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (notificacion && notificacion.tipo_formulario === 'incidencia') {
      fetchArchivos();
    }
  }, [notificacion]);

  const renderArrayField = (label, value) => (
    <div className="mb-4">
      <span className="font-semibold text-gray-700">{label}:</span>
      <ul className="list-disc ml-6 text-gray-800">
        {Array.isArray(value) && value.length > 0
          ? value.map((v, i) => <li key={i}>{v}</li>)
          : <li className="italic text-gray-400">Sin datos</li>}
      </ul>
    </div>
  );

  const renderStringField = (label, value) => (
    <div className="mb-4">
      <span className="font-semibold text-gray-700">{label}:</span>
      <span className="ml-2 text-gray-800">{value || <span className="italic text-gray-400">Sin datos</span>}</span>
    </div>
  );

  const getFileIcon = (tipoMime) => {
    if (tipoMime.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (tipoMime.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (tipoMime.includes('zip') || tipoMime.includes('rar')) return <Archive className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadFile = async (archivoId, nombreOriginal) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/files/download/${archivoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error descargando archivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreOriginal;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`📥 ${nombreOriginal} descargado`);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const renderArchivos = () => {
    if (notificacion?.tipo_formulario !== 'incidencia') return null;

    return (
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
          <File className="h-5 w-5 mr-2" />
          Archivos adjuntos ({archivos.length})
        </h4>
        
        {loadingArchivos ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : archivos.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <File className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No hay archivos adjuntos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {archivos.map((archivo) => (
              <div
                key={archivo.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(archivo.tipo_mime)}
                  <div>
                    <p className="font-medium text-gray-900">{archivo.nombre_original}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(archivo.tamaño)} • {new Date(archivo.fecha_subida).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadFile(archivo.id, archivo.nombre_original)}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-white rounded-md transition-colors"
                  title="Descargar archivo"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderFormularioDetalles = () => {
    if (!formularioDetalles) return null;
    switch (notificacion.tipo_formulario) {
      case 'apertura':
        return (
          <div className="space-y-6">
            {renderArrayField('Empleados no operativos', formularioDetalles.empleados_no_operativos)}
            {renderArrayField('Empleados de baja', formularioDetalles.empleados_baja)}
            {renderArrayField('Vehículos no operativos', formularioDetalles.vehiculos_no_operativos)}
            {renderArrayField('Necesitan sustitución', formularioDetalles.necesitan_sustitucion)}
            {renderArrayField('No conectados a la plataforma', formularioDetalles.no_conectados_plataforma)}
            {renderArrayField('Sin batería del móvil', formularioDetalles.sin_bateria_movil)}
            {renderArrayField('Sin batería del vehículo', formularioDetalles.sin_bateria_vehiculo)}
            {renderStringField('Observaciones', formularioDetalles.observaciones)}
          </div>
        );
      case 'cierre':
        return (
          <div className="space-y-6">
            {renderStringField('Análisis de datos', formularioDetalles.analisis_datos)}
            {renderStringField('Problemas de la jornada', formularioDetalles.problemas_jornada)}
            {renderStringField('Propuesta de soluciones', formularioDetalles.propuesta_soluciones)}
          </div>
        );
      case 'incidencia':
        return (
          <div className="space-y-6">
            {renderArrayField('Empleados involucrados', formularioDetalles.empleados_incidencia)}
            {renderStringField('Tipo de incidencia', formularioDetalles.tipo_incidencia)}
            {renderStringField('Observaciones', formularioDetalles.observaciones)}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl sm:max-w-3xl md:max-w-4xl max-h-[90vh] flex flex-col p-0 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>
        <div className="overflow-y-auto p-6 flex-1 min-h-[200px]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : notificacion ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Detalle de Notificación</h2>
              <div className="mb-2 text-xs text-gray-500">ID: {notificacion.id}</div>
              <div className="mb-4 text-sm text-gray-700">
                <span className="font-semibold">Estado:</span> <span className="capitalize">{notificacion.estado}</span>
              </div>
              <div className="mb-4 text-sm text-gray-700">
                <span className="font-semibold">Enviado por:</span> {notificacion.jefe_trafico_username}
              </div>
              <div className="mb-4 text-sm text-gray-700">
                <span className="font-semibold">Fecha de envío:</span> {new Date(notificacion.fecha_creacion).toLocaleString('es-ES')}
              </div>
              {notificacion.fecha_procesamiento && (
                <div className="mb-4 text-sm text-gray-700">
                  <span className="font-semibold">Fecha de procesamiento:</span> {new Date(notificacion.fecha_procesamiento).toLocaleString('es-ES')}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Respuestas del Formulario</h3>
                {renderFormularioDetalles()}
              </div>
              
              {/* Sección de archivos */}
              {renderArchivos()}
              
              {notificacion.observaciones_procesamiento && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Observaciones:</span> {notificacion.observaciones_procesamiento}
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
        {/* Botones de acción en la parte inferior */}
        {notificacion && notificacion.estado === 'pendiente' && (
          <div className="flex justify-end gap-4 border-t border-gray-100 px-6 py-4 bg-white rounded-b-lg">
            <button
              onClick={() => onReject && onReject(notificacion.id)}
              className="btn btn-danger"
              aria-label="Rechazar"
            >
              Rechazar
            </button>
            <button
              onClick={() => onApprove && onApprove(notificacion.id)}
              className="btn btn-success"
              aria-label="Aprobar"
            >
              Aprobar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationDetailModal; 