import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FormularioApertura from './pages/FormularioApertura';
import FormularioCierre from './pages/FormularioCierre';
import Incidencias from './pages/Incidencias';
import Notificaciones from './pages/Notificaciones';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Rutas para Jefe de Tráfico */}
        <Route path="formulario-apertura" element={
          <PrivateRoute allowedRoles={['jefe_trafico']}>
            <FormularioApertura />
          </PrivateRoute>
        } />
        <Route path="formulario-cierre" element={
          <PrivateRoute allowedRoles={['jefe_trafico']}>
            <FormularioCierre />
          </PrivateRoute>
        } />
        <Route path="incidencias" element={
          <PrivateRoute allowedRoles={['jefe_trafico']}>
            <Incidencias />
          </PrivateRoute>
        } />
        
        {/* Rutas para Jefe de Operaciones */}
        <Route path="notificaciones" element={
          <PrivateRoute allowedRoles={['jefe_operaciones']}>
            <Notificaciones />
          </PrivateRoute>
        } />
        <Route path="notificaciones/:id" element={
          <PrivateRoute allowedRoles={['jefe_operaciones']}>
            <Notificaciones />
          </PrivateRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App; 