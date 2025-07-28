import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formulariosService } from '../services/api';
import { ArrowLeft, Save, BarChart3, AlertTriangle, Lightbulb } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const FormularioCierre = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    analisis_datos: '',
    problemas_jornada: '',
    propuesta_soluciones: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await formulariosService.createCierre(formData);
      toast.success('Formulario de cierre enviado exitosamente');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error enviando formulario:', error);
      toast.error('Error al enviar el formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
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
              Formulario de Cierre
            </h1>
            <p className="text-gray-600">
              Repaso del día, análisis de datos y propuesta de soluciones
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES')}
          </p>
          <p className="text-sm text-gray-400">
            Tarde/Noche
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Análisis de datos */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 text-primary-500 mr-2" />
              Análisis de datos del sistema y métricas clave
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Evaluación de los datos y métricas obtenidas durante la jornada
            </p>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="analisis_datos" className="form-label">
                Análisis de datos del sistema y métricas clave
              </label>
              <textarea
                id="analisis_datos"
                name="analisis_datos"
                rows={6}
                className="textarea"
                placeholder="Describe el análisis de los datos del sistema y las métricas clave obtenidas durante la jornada..."
                value={formData.analisis_datos}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Incluye métricas de rendimiento, tiempos de entrega, satisfacción del cliente, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Problemas de la jornada */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertTriangle className="h-5 w-5 text-warning-500 mr-2" />
              Identificación de problemas ocurridos durante la jornada
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Lista detallada de los problemas y incidencias encontradas
            </p>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="problemas_jornada" className="form-label">
                Identificación de problemas ocurridos durante la jornada
              </label>
              <textarea
                id="problemas_jornada"
                name="problemas_jornada"
                rows={6}
                className="textarea"
                placeholder="Describe los problemas e incidencias que ocurrieron durante la jornada..."
                value={formData.problemas_jornada}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Incluye problemas técnicos, operativos, de personal, logísticos, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Propuesta de soluciones */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Lightbulb className="h-5 w-5 text-success-500 mr-2" />
              Propuesta inmediata de soluciones
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Soluciones y mejoras propuestas para los problemas identificados
            </p>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="propuesta_soluciones" className="form-label">
                Propuesta inmediata de soluciones
              </label>
              <textarea
                id="propuesta_soluciones"
                name="propuesta_soluciones"
                rows={6}
                className="textarea"
                placeholder="Describe las soluciones y mejoras propuestas para los problemas identificados..."
                value={formData.propuesta_soluciones}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Incluye acciones inmediatas, mejoras a corto y largo plazo, recomendaciones, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Resumen de la jornada */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Resumen de la jornada
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Información adicional sobre el cierre del día
            </p>
          </div>
          
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Horario de cierre</h4>
                <p className="text-gray-600">
                  {new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Duración de la jornada</h4>
                <p className="text-gray-600">
                  Calculada automáticamente
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Estado general</h4>
                <p className="text-gray-600">
                  Pendiente de evaluación
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
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Enviar Formulario
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormularioCierre; 