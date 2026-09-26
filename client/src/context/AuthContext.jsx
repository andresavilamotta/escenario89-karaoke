import React, { createContext, useContext, useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'escenario89_auth_v2';
const LEGACY_STORAGE_KEYS = ['escenario89_auth_v1'];

// Credenciales oficiales
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'Mocoa2026*';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión guardada al montar y forzar cierre de sesiones anteriores
  useEffect(() => {
    try {
      // Invalidar todas las sesiones v1 anteriores para que todos deban iniciar sesión de nuevo y ver los cambios
      LEGACY_STORAGE_KEYS.forEach((key) => {
        try { localStorage.removeItem(key); } catch (e) {}
      });

      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed && parsed.username) {
          setUser(parsed);
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      console.warn('Error al leer sesión de usuario:', err);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función de inicio de sesión
  const login = (username, password) => {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (cleanUser === VALID_USERNAME && cleanPass === VALID_PASSWORD) {
      const sessionData = {
        username: 'Admin',
        role: 'Operador Principal',
        loginTime: new Date().toISOString(),
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      setUser(sessionData);
      setIsAuthenticated(true);
      return { success: true };
    }

    return {
      success: false,
      error: 'Credenciales inválidas. Verifica tu usuario y contraseña.',
    };
  };

  // Función de cierre de sesión
  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
