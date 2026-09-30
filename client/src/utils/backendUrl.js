/**
 * Utilidad para resolver la URL base del backend de Karaoke (local o en la nube como Render).
 * Si se define la variable VITE_BACKEND_URL en el despliegue (ej. en Vercel), apuntará automáticamente
 * al microservicio en la nube (Render / Railway / Koyeb). De lo contrario, usará http://localhost:3001.
 */
export function getBackendBaseUrl() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'http://localhost:3001';
}

export function buildBackendUrl(path) {
  const base = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
