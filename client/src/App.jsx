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

        {/* Ruta Principal: Pantalla Única de Karaoke (Display con Controles Integrados) */}
        <Route path="/" element={<DisplayView />} />
        <Route path="/display" element={<DisplayView />} />

        {/* Consola Tradicional de Operador Dual-Screen (opcional) */}
        <Route
          path="/operator"
          element={
            <ProtectedRoute>
              <OperatorView />
            </ProtectedRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
