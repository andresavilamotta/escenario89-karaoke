/**
 * Utilidad para resolver la URL base del backend de Karaoke.
 * 1. Si se configuró VITE_BACKEND_URL (ej. en Render: https://escenario89-backend.onrender.com), usa esa URL.
 * 2. Si se ejecuta en localhost / 127.0.0.1, usa http://localhost:3001.
 * 3. Si se ejecuta en la nube de Vercel (escenario89.andresavila.org o *.vercel.app) y no hay servidor externo,
 *    usa rutas relativas (/api) para JAMÁS disparar la alerta de Chrome de acceso a red privada local.
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

  // En producción web / Vercel: rutas relativas (cero llamadas a localhost, cero alertas del navegador)
  return '';
}

export function buildBackendUrl(path) {
  const base = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
