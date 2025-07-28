import React, { useState, useEffect } from 'react';
import { notificacionesService } from '../services/api';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    total: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
    porTipo: {
      apertura: 0,
      cierre: 0,
      incidencia: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await notificacionesService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Solucioning - Formularios',
      value: stats.total,
      icon: FileText,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pendientes',
      value: stats.pendientes,
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Aprobados',
      value: stats.aprobados,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Rechazados',
      value: stats.rechazados,
      icon: XCircle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  const tipoCards = [
    {
      title: 'Apertura',
      value: stats.porTipo.apertura,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Cierre',
      value: stats.porTipo.cierre,
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Incidencias',
      value: stats.porTipo.incidencia,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Estadísticas por tipo */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
          Formularios por Tipo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tipoCards.map((tipo, index) => (
            <div key={index} className={`p-4 rounded-lg ${tipo.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <tipo.icon className={`h-5 w-5 ${tipo.color} mr-2`} />
                  <span className="font-medium text-gray-900">{tipo.title}</span>
                </div>
                <span className={`text-2xl font-bold ${tipo.color}`}>{tipo.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de actividad reciente */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Resumen de Actividad
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Tasa de aprobación:</span>
            <span className="font-medium text-gray-900">
              {stats.total > 0 ? Math.round((stats.aprobados / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Formularios pendientes:</span>
            <span className="font-medium text-gray-900">{stats.pendientes}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Promedio de procesamiento:</span>
            <span className="font-medium text-gray-900">
              {stats.total > 0 ? Math.round(stats.total / 30) : 0} por día
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats; 