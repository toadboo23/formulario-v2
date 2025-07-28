import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formulariosService } from '../services/api';
import { authService } from '../services/api';
import { 
  FileText, 
  AlertTriangle, 
  Users, 
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Bell
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import PendingFormsList from '../components/PendingFormsList';
import DashboardStats from '../components/DashboardStats';

const Dashboard = () => {
  const { user, isJefeTrafico, isJefeOperaciones } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (isJefeOperaciones) {
          const formulariosStats = await formulariosService.getStats();
          setStats({ formularios: formulariosStats.data });
        }
      } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isJefeTrafico, isJefeOperaciones]);

  const handleFormularioClick = (route) => {
    navigate(route);
  };

  const handleExport = async () => {
    if (!fechaDesde || !fechaHasta) return;
    setExportLoading(true);
    try {
      const response = await fetch(`/api/formularios/informes/export?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Error al generar el informe');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_formularios_${fechaDesde}_a_${fechaHasta}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Error al exportar:', err);
      if (err.message.includes('Error al generar el informe')) {
        alert('Error al generar el informe. Verifique las fechas seleccionadas.');
      } else {
        alert('Error al exportar el informe. Intente nuevamente.');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-soft p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
{getGreeting()}, {user?.username}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.role === 'jefe_trafico' ? 'Gestiona los formularios diarios de tu operación' : 'Supervisa y aprueba los formularios del equipo'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isJefeOperaciones && (
              <button
                className="btn btn-primary"
                onClick={() => setExportModalOpen(true)}
              >
                Exportar informe CSV
              </button>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de exportación */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
            <button
              onClick={() => setExportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exportar informe CSV</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                className="input w-full"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                className="input w-full"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
              />
            </div>
            <button
              className="btn btn-success w-full"
              onClick={handleExport}
              disabled={!fechaDesde || !fechaHasta || exportLoading}
            >
              {exportLoading ? 'Generando...' : 'Descargar CSV'}
            </button>
          </div>
        </div>
      )}

      {/* Formularios para Jefe de Tráfico */}
      {isJefeTrafico && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            className="card cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-medium"
            onClick={() => handleFormularioClick('/formulario-apertura')}
          >
            <div className="card-body text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-success-100 mb-4">
                <FileText className="h-6 w-6 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Formulario de Apertura
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Confirmación del estado de la flota y preparación de trabajadores
              </p>
              <div className="text-xs text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <Calendar size={14} />
                  <span>Mañana</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-medium"
            onClick={() => handleFormularioClick('/formulario-cierre')}
          >
            <div className="card-body text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-warning-100 mb-4">
                <FileText className="h-6 w-6 text-warning-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Formulario de Cierre
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Repaso del día, análisis de datos y propuesta de soluciones
              </p>
              <div className="text-xs text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <Clock size={14} />
                  <span>Tarde/Noche</span>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-medium"
            onClick={() => handleFormularioClick('/incidencias')}
          >
            <div className="card-body text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-danger-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-danger-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Reporte de Incidencias
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Reportar incidencias con riders y observaciones
              </p>
              <div className="text-xs text-gray-500">
                <div className="flex items-center justify-center space-x-2">
                  <AlertTriangle size={14} />
                  <span>Urgente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard para Jefe de Operaciones */}
      {isJefeOperaciones && (
        <>
          {/* Estadísticas principales */}
          {stats && <DashboardStats stats={stats} />}

          {/* Formularios pendientes de aprobación */}
          <div className="bg-white rounded-lg shadow-soft p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-primary-600" />
              Formularios Pendientes de Aprobación
            </h3>
            <PendingFormsList />
          </div>
        </>
      )}

      {/* Información del Sistema */}
      <div className="bg-white rounded-lg shadow-soft p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Información del Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
<p><strong>Usuario:</strong> {user?.username}</p>
            <p><strong>Rol:</strong> {user?.role?.replace('_', ' ').toUpperCase()}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>
          <div>
            <p><strong>Versión:</strong> 2.0.0</p>
            <p><strong>Última actualización:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Estado:</strong> <span className="text-success-600">Activo</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 