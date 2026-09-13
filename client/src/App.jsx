import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginView from './views/LoginView';
import OperatorView from './views/OperatorView';
import DisplayView from './views/DisplayView';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Ruta Pública de Login */}
        <Route path="/login" element={<LoginView />} />

        {/* Vistas Protegidas del Operador */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <OperatorView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operator"
          element={
            <ProtectedRoute>
              <OperatorView />
            </ProtectedRoute>
          }
        />

        {/* Vista de Proyección para el segundo monitor */}
        <Route path="/display" element={<DisplayView />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
