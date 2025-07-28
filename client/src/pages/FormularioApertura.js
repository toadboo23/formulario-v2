import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formulariosService } from '../services/api';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const FormularioApertura = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empleados_no_operativos: '',
    empleados_baja: '',
    vehiculos_no_operativos: '',
    necesitan_sustitucion: '',
    no_conectados_plataforma: '',
    sin_bateria_movil: '',
    sin_bateria_vehiculo: '',
    observaciones: ''
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
      await formulariosService.createApertura({
        ...formData,
        empleados_no_operativos: formData.empleados_no_operativos.split(',').map(e => e.trim()).filter(Boolean),
        empleados_baja: formData.empleados_baja.split(',').map(e => e.trim()).filter(Boolean),
        vehiculos_no_operativos: formData.vehiculos_no_operativos.split(',').map(e => e.trim()).filter(Boolean),
        necesitan_sustitucion: formData.necesitan_sustitucion.split(',').map(e => e.trim()).filter(Boolean),
        no_conectados_plataforma: formData.no_conectados_plataforma.split(',').map(e => e.trim()).filter(Boolean),
        sin_bateria_movil: formData.sin_bateria_movil.split(',').map(e => e.trim()).filter(Boolean),
        sin_bateria_vehiculo: formData.sin_bateria_vehiculo.split(',').map(e => e.trim()).filter(Boolean)
      });
      toast.success('Formulario de apertura enviado exitosamente');
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
              Formulario de Apertura
            </h1>
            <p className="text-gray-600">
              Confirmación del estado de la flota y preparación de trabajadores
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES')}
          </p>
          <p className="text-sm text-gray-400">
            Mañana
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Estado de la flota */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 text-warning-500 mr-2" />
              Confirmación del estado de la flota
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ingresa los nombres y/o IDs de los empleados para cada campo, separados por coma. Ejemplo: Juan Pérez (ID123), Ana López (ID456)
            </p>
          </div>
          <div className="card-body space-y-6">
            <div className="form-group">
              <label className="form-label">¿Hay alguien no operativo?</label>
              <input
                type="text"
                name="empleados_no_operativos"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.empleados_no_operativos}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Hay bajas de personal?</label>
              <input
                type="text"
                name="empleados_baja"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.empleados_baja}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Todos los vehículos están operativos?</label>
              <input
                type="text"
                name="vehiculos_no_operativos"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.vehiculos_no_operativos}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Es necesario sustituir a algún rider o vehículo?</label>
              <input
                type="text"
                name="necesitan_sustitucion"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.necesitan_sustitucion}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        {/* Conexión y preparación */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <AlertCircle className="h-5 w-5 text-primary-500 mr-2" />
              Comprobación de conexión y preparación de los trabajadores
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Ingresa los nombres y/o IDs de los empleados para cada campo, separados por coma.
            </p>
          </div>
          <div className="card-body space-y-6">
            <div className="form-group">
              <label className="form-label">¿Hay alguien que NO se ha conectado correctamente a la plataforma?</label>
              <input
                type="text"
                name="no_conectados_plataforma"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.no_conectados_plataforma}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Hay alguien sin batería del móvil al 100%?</label>
              <input
                type="text"
                name="sin_bateria_movil"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.sin_bateria_movil}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">¿Hay alguien sin batería del vehículo al 100%?</label>
              <input
                type="text"
                name="sin_bateria_vehiculo"
                className="input"
                placeholder="Ej: Juan Pérez (ID123), Ana López (ID456)"
                value={formData.sin_bateria_vehiculo}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
        {/* Observaciones adicionales */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">
              Observaciones adicionales
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Información adicional relevante para la apertura
            </p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="observaciones" className="form-label">
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows={4}
                className="textarea"
                placeholder="Agregar observaciones adicionales..."
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              />
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

export default FormularioApertura; 