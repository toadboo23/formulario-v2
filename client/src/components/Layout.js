import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificacionesService } from '../services/api';
import { authService } from '../services/api';
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  User
} from 'lucide-react';

const Layout = () => {
  const { user, logout, isJefeTrafico, isJefeOperaciones } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Estado y lógica para el modal de crear usuario
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'jefe_trafico', password: '' });
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  const handleCreateUser = async () => {
    setCreateUserLoading(true);
    setCreateUserError('');
    setCreateUserSuccess('');
    try {
      await authService.createUser(newUser);
      setCreateUserSuccess('Usuario creado correctamente');
      setNewUser({ username: '', email: '', role: 'jefe_trafico', password: '' });
    } catch (err) {
      setCreateUserError(err.response?.data?.error || 'Error al crear usuario');
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Obtener contador de notificaciones no leídas
  useEffect(() => {
    if (isJefeOperaciones) {
      const fetchUnreadCount = async () => {
        try {
          const response = await notificacionesService.getUnreadCount();
          setUnreadCount(response.data.count);
        } catch (error) {
          console.error('Error obteniendo notificaciones no leídas:', error);
        }
      };

      fetchUnreadCount();
      // Actualizar cada 30 segundos
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isJefeOperaciones]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: true },
    ...(isJefeTrafico ? [
      { name: 'Formulario Apertura', href: '/formulario-apertura', icon: FileText },
      { name: 'Formulario Cierre', href: '/formulario-cierre', icon: FileText },
      { name: 'Reportar Incidencia', href: '/incidencias', icon: AlertTriangle },
    ] : []),
    ...(isJefeOperaciones ? [
      { name: 'Notificaciones', href: '/notificaciones', icon: Bell, badge: unreadCount > 0 ? unreadCount : null },
    ] : []),
  ];

  const isActive = (href) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="relative z-50 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-900/80" 
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-0 flex">
            <div className="relative mr-16 flex w-full max-w-xs flex-1">
              <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={24} className="text-white" />
                </button>
              </div>
              <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <div className="flex h-16 shrink-0 items-center">
                  <h1 className="text-xl font-bold text-primary-600">
                    Solucioning
                  </h1>
                </div>
                <nav className="flex flex-1 flex-col">
                  <ul className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul className="-mx-2 space-y-1">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <button
                              onClick={() => {
                                navigate(item.href);
                                setSidebarOpen(false);
                              }}
                              className={`
                                group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left
                                ${isActive(item.href)
                                  ? 'bg-primary-50 text-primary-600'
                                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                                }
                              `}
                            >
                              <item.icon size={20} className="shrink-0" />
                              <span className="flex-1">{item.name}</span>
                              {item.badge && (
                                <span className="ml-auto w-6 h-6 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                                  {item.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  </ul>
                </nav>
                {/* Usuario móvil */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User size={16} className="text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.username}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user?.role?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <h1 className="text-xl font-bold text-primary-600">
              Solucioning Formularios
            </h1>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <button
                        onClick={() => navigate(item.href)}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left
                          ${isActive(item.href)
                            ? 'bg-primary-50 text-primary-600'
                            : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon size={20} className="shrink-0" />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <span className="ml-auto w-6 h-6 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              {/* Botón crear usuario - solo para jefe de operaciones */}
              {isJefeOperaciones && (
                <li className="mt-auto">
                  <button
                    onClick={() => setCreateUserModalOpen(true)}
                    className="group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                  >
                    <User size={20} className="shrink-0" />
                    Crear usuario
                  </button>
                </li>
              )}
            </ul>
          </nav>
          {/* Usuario desktop */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-primary-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut size={20} className="mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="lg:pl-64">
        {/* Header móvil */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h1>
            </div>
          </div>
        </div>

        {/* Contenido de la página */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modal de creación de usuario - solo para jefe de operaciones */}
      {createUserModalOpen && isJefeOperaciones && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
            <button
              onClick={() => { setCreateUserModalOpen(false); setCreateUserError(''); setCreateUserSuccess(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Crear usuario</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input type="text" className="input w-full" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" className="input w-full" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select className="input w-full" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="jefe_trafico">Jefe de Tráfico</option>
                <option value="jefe_operaciones">Jefe de Operaciones</option>
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" className="input w-full" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
            {createUserError && <div className="text-red-600 mb-2">{createUserError}</div>}
            {createUserSuccess && <div className="text-green-600 mb-2">{createUserSuccess}</div>}
            <button
              className="btn btn-success w-full"
              onClick={handleCreateUser}
              disabled={createUserLoading}
            >
              {createUserLoading ? 'Creando...' : 'Crear usuario'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout; 