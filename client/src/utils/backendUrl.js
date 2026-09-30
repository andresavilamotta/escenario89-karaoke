/**
 * Utilidad para resolver la URL base del backend de Karaoke.
 * 1. Si se configuró VITE_BACKEND_URL, usa esa URL específica.
 * 2. Si se ejecuta en localhost / 127.0.0.1, usa http://localhost:3001 para desarrollo local.
 * 3. En la nube (escenario89.andresavila.org o *.vercel.app), se conecta automáticamente
 *    al backend 24/7 en Render (https://escenario89-karaoke-backend.onrender.com).
 */
export function getBackendBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Solo en entorno estrictamente local de desarrollo
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }

  // En producción web / Vercel: conectar automáticamente al backend en la nube 24/7 de Render
  return 'https://escenario89-karaoke-backend.onrender.com';
}

export function buildBackendUrl(path) {
  const base = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
