import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Servicios de autenticación
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
  changePassword: (passwords) => api.put('/auth/change-password', passwords),
  createUser: (data) => api.post('/auth/create-user', data),
};

// Servicios de formularios
export const formulariosService = {
  // Obtener todos los formularios (para jefes de tráfico)
  getAllFormularios: () => api.get('/formularios/todos'),
  
  // Aprobar/rechazar formulario (para jefes de operaciones)
  updateFormularioEstado: (id, accion, comentario) => 
    api.put(`/formularios/${id}/estado`, { accion, comentario }),
  
  // Obtener historial de un formulario
  getFormularioHistorial: (id) => api.get(`/formularios/${id}/historial`),
  
  // Obtener informes
  getInformes: (fechaDesde, fechaHasta) => 
    api.get(`/formularios/informes/export?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`),
  
  // Crear formularios existentes
  createApertura: (data) => api.post('/formularios/apertura', data),
  createCierre: (data) => api.post('/formularios/cierre', data),
  createIncidencia: (data) => api.post('/formularios/incidencias', data),
};

// Servicios de notificaciones
export const notificacionesService = {
  getAll: (params) => api.get('/notificaciones', { params }),
  getUnreadCount: () => api.get('/notificaciones/unread-count'),
  markAsRead: (id) => api.put(`/notificaciones/${id}/read`),
  markAllAsRead: () => api.put('/notificaciones/read-all'),
  process: (id, data) => api.put(`/notificaciones/${id}/process`, data),
  getById: (id) => api.get(`/notificaciones/${id}`),
  getArchivos: (id) => api.get(`/notificaciones/${id}/files`),
  getStats: () => api.get('/notificaciones/stats/overview'),
  delete: (id) => api.delete(`/notificaciones/${id}`),
};

export default api; 