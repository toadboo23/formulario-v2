import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificacionesService } from '../services/api';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertTriangle,
  BarChart3,
  Users
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import NotificationDetailModal from './NotificationDetailModal';

const PendingFormsList = () => {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendiente'); // pendiente, procesada, rechazada
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetchNotificaciones();
  }, [filter]);

  const fetchNotificaciones = async () => {
    try {
      setLoading(true);
      const response = await notificacionesService.getAll({ 
        estado: filter,
        limit: 50 
      });
      setNotificaciones(response.data.notificaciones || []);
    } catch (error) {
      console.error('Error obteniendo notificaciones:', error);
      toast.error('Error al cargar las notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessNotification = async (id, action) => {
    try {
      await notificacionesService.process(id, { 
        estado: action === 'approve' ? 'procesada' : 'rechazada',
        observaciones_procesamiento: action === 'approve' ? 'Aprobado' : 'Rechazado'
      });
      
      toast.success(`Formulario ${action === 'approve' ? 'aprobado' : 'rechazado'} exitosamente`);
      fetchNotificaciones(); // Recargar lista
    } catch (error) {
      console.error('Error procesando notificación:', error);
      toast.error('Error al procesar la notificación');
    }
  };

  const handleViewDetails = (id) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const getFormIcon = (tipo) => {
    switch (tipo) {
      case 'apertura':
        return <FileText className="h-5 w-5 text-blue-600" />;
      case 'cierre':
        return <BarChart3 className="h-5 w-5 text-green-600" />;
      case 'incidencia':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </span>
        );
      case 'procesada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobado
          </span>
        );
      case 'rechazada':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex space-x-4">
        <button
          onClick={() => setFilter('pendiente')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'pendiente'
              ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Pendientes ({notificaciones.filter(n => n.estado === 'pendiente').length})
        </button>
        <button
          onClick={() => setFilter('procesada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'procesada'
              ? 'bg-green-100 text-green-800 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Aprobados ({notificaciones.filter(n => n.estado === 'procesada').length})
        </button>
        <button
          onClick={() => setFilter('rechazada')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'rechazada'
              ? 'bg-red-100 text-red-800 border-2 border-red-300'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Rechazados ({notificaciones.filter(n => n.estado === 'rechazada').length})
        </button>
      </div>

      {/* Lista de formularios */}
      <div className="space-y-4">
        {notificaciones.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay formularios {filter === 'pendiente' ? 'pendientes' : filter === 'procesada' ? 'aprobados' : 'rechazados'}
            </h3>
            <p className="text-gray-500">
              {filter === 'pendiente' 
                ? 'Todos los formularios han sido procesados'
                : `No hay formularios ${filter === 'procesada' ? 'aprobados' : 'rechazados'} aún`
              }
            </p>
          </div>
        ) : (
          notificaciones.map((notificacion) => (
            <div
              key={notificacion.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getFormIcon(notificacion.tipo_formulario)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getFormTitle(notificacion.tipo_formulario)}
                      </h3>
                      {getStatusBadge(notificacion.estado)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Enviado por: <span className="font-medium">{notificacion.jefe_trafico_username}</span>
                    </p>
                    
                    <p className="text-sm text-gray-500 mb-3">
                      {notificacion.mensaje}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Fecha: {formatDate(notificacion.fecha_creacion)}</span>
                      {notificacion.fecha_procesamiento && (
                        <span>Procesado: {formatDate(notificacion.fecha_procesamiento)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(notificacion.id)}
                    className="btn-secondary btn-sm"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {notificacion.estado === 'pendiente' && (
                    <>
                      <button
                        onClick={() => handleProcessNotification(notificacion.id, 'approve')}
                        className="btn-success btn-sm"
                        title="Aprobar"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProcessNotification(notificacion.id, 'reject')}
                        className="btn-danger btn-sm"
                        title="Rechazar"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {notificacion.observaciones_procesamiento && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Observaciones:</span> {notificacion.observaciones_procesamiento}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de detalle */}
      {modalOpen && (
        <NotificationDetailModal
          id={selectedId}
          onClose={() => setModalOpen(false)}
          onApprove={async (id) => {
            await handleProcessNotification(id, 'approve');
            setModalOpen(false);
          }}
          onReject={async (id) => {
            await handleProcessNotification(id, 'reject');
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PendingFormsList; 