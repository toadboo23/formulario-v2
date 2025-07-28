import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { notificacionesService } from '../services/api';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  FileText, 
  AlertTriangle, 
  BarChart3,
  Clock,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Notificaciones = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notificacion, setNotificacion] = useState(null);
  const [formularioDetalles, setFormularioDetalles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNotificacionDetails();
    }
  }, [id]);

  const fetchNotificacionDetails = async () => {
    try {
      setLoading(true);
      const response = await notificacionesService.getById(id);
      setNotificacion(response.data.notificacion);
      setFormularioDetalles(response.data.formularioDetalles);
    } catch (error) {
      console.error('Error obteniendo detalles de notificación:', error);
      toast.error('Error al cargar los detalles de la notificación');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessNotification = async (action) => {
    try {
      setProcessing(true);
      await notificacionesService.process(id, { 
        estado: action === 'approve' ? 'procesada' : 'rechazada',
        observaciones_procesamiento: action === 'approve' ? 'Aprobado' : 'Rechazado'
      });
      
      toast.success(`Formulario ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error procesando notificación:', error);
      toast.error('Error al procesar la notificación');
    } finally {
      setProcessing(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const getFormIcon = (tipo) => {
    switch (tipo) {
      case 'apertura':
        return <FileText className="h-6 w-6 text-blue-600" />;
      case 'cierre':
        return <BarChart3 className="h-6 w-6 text-green-600" />;
      case 'incidencia':
        return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default:
        return <FileText className="h-6 w-6 text-gray-600" />;
    }
  };

  const getFormTitle = (tipo) => {
    switch (tipo) {
      case 'apertura':
        return 'Formulario de Apertura';
      case 'cierre':
        return 'Formulario de Cierre';
      case 'incidencia':
        return 'Reporte de Incidencia';
      default:
        return 'Formulario';
    }
  };

  const getStatusBadge = (estado) => {
    switch (estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-4 w-4 mr-1" />
            Pendiente
          </span>
        );
      case 'procesada':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-4 w-4 mr-1" />
            Aprobado
          </span>
        );
      case 'rechazada':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="h-4 w-4 mr-1" />
            Rechazado
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  if (true) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Funcionalidad temporalmente deshabilitada</h2>
        <p className="text-gray-600">La sección de notificaciones estará disponible próximamente.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!notificacion) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Notificación no encontrada</h3>
        <button onClick={handleBack} className="btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
          <div className="flex items-center space-x-3">
            {getFormIcon(notificacion.tipo_formulario)}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getFormTitle(notificacion.tipo_formulario)}
              </h1>
              <p className="text-gray-600">
                Enviado por {notificacion.jefe_trafico_username}
              </p>
            </div>
          </div>
        </div>
        {getStatusBadge(notificacion.estado)}
      </div>

      {/* Información de la notificación */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500">Fecha de envío</p>
            <p className="text-gray-900">{formatDate(notificacion.fecha_creacion)}</p>
          </div>
          {notificacion.fecha_procesamiento && (
            <div>
              <p className="text-sm font-medium text-gray-500">Fecha de procesamiento</p>
              <p className="text-gray-900">{formatDate(notificacion.fecha_procesamiento)}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-500">Estado</p>
            <p className="text-gray-900 capitalize">{notificacion.estado}</p>
          </div>
        </div>

        {notificacion.observaciones_procesamiento && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Observaciones del procesamiento:</p>
            <p className="text-gray-600">{notificacion.observaciones_procesamiento}</p>
          </div>
        )}
      </div>

      {/* Detalles del formulario */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Detalles del Formulario
        </h3>
        {renderFormularioDetalles()}
      </div>

      {/* Acciones */}
      {notificacion.estado === 'pendiente' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleProcessNotification('approve')}
              disabled={processing}
              className="btn-success"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? 'Procesando...' : 'Aprobar Formulario'}
            </button>
            <button
              onClick={() => handleProcessNotification('reject')}
              disabled={processing}
              className="btn-danger"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {processing ? 'Procesando...' : 'Rechazar Formulario'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notificaciones; 