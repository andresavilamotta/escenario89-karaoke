const fs = require('fs');
const path = require('path');

// Directorio exclusivo en Google Drive (Servidor VIP)
const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');

const CATALOG_PATH = path.resolve(__dirname, '..', 'top_500_karaoke_colombia_putumayo.json');
const CHANNEL_CLEAN_PATH = path.resolve(__dirname, '..', 'channel_clean.json');
const LOTE_ALTO_PATH = path.resolve(__dirname, '..', 'lote_alto.json');

const SERVER_CATALOG_JS = path.resolve(__dirname, '..', 'client', 'src', 'data', 'serverCatalog.js');
const SERVER_CATALOG_JSON = path.resolve(__dirname, '..', 'client', 'src', 'data', 'serverCatalog.json');

const DRIVE_CATALOG_JS = path.resolve(__dirname, '..', 'client', 'src', 'data', 'driveCatalog.js');
const DRIVE_CATALOG_JSON = path.resolve(__dirname, '..', 'client', 'src', 'data', 'driveCatalog.json');

// Mapear catálogo top 500
const songs = fs.existsSync(CATALOG_PATH) ? JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) : [];
const songsByVideoId = new Map(songs.map(s => [s.yt_videoId, s]));

// Mapear también channel_clean.json (11,011 temas de Party Tyme)
if (fs.existsSync(CHANNEL_CLEAN_PATH)) {
  try {
    const channelData = JSON.parse(fs.readFileSync(CHANNEL_CLEAN_PATH, 'utf8'));
    (channelData.entries || []).forEach(e => {
      if (!songsByVideoId.has(e.id)) {
        let artist = 'Desconocido';
        let titleOnly = e.title;
        if (e.title.includes(' - ')) {
          const parts = e.title.split(' - ');
          artist = parts[0].trim();
          titleOnly = parts.slice(1).join(' - ').replace(/\(Versión Karaoke\)|\(Karaoke\)|\(Version Karaoke\)/gi, '').trim();
        }
        const mins = Math.floor(e.duration / 60);
        const secs = e.duration % 60;
        const durationStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        songsByVideoId.set(e.id, {
          artist,
          title: titleOnly,
          genre: 'Karaoke',
          yt_duration: durationStr,
          durationSec: e.duration
        });
      }
    });
  } catch (e) {}
}

function parseDurationToSeconds(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 210;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

function sync() {
  const fileMap = new Map(); // videoId -> filename
  const idRegex = /\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i;

  // Escanear exclusivamente la carpeta de Google Drive (Servidor VIP)
  if (fs.existsSync(TARGET_DIR)) {
    const dirFiles = fs.readdirSync(TARGET_DIR);
    for (const file of dirFiles) {
      const match = file.match(idRegex);
      if (match && !fileMap.has(match[1])) {
        fileMap.set(match[1], file);
      }
    }
  }

  const rawEntries = [];

  for (const [videoId, file] of fileMap.entries()) {
    const catalogInfo = songsByVideoId.get(videoId);

    let title = file.replace(` [${videoId}].mp4`, '').replace(` [${videoId}].webm`, '');
    let author = 'Desconocido';
    let duration = '3:30';
    let seconds = 210;

    if (catalogInfo) {
      title = `${catalogInfo.artist} - ${catalogInfo.title}`;
      author = catalogInfo.artist;
      duration = catalogInfo.yt_duration || '3:30';
      seconds = catalogInfo.durationSec || parseDurationToSeconds(duration);
    } else {
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        author = parts[0].trim();
      }
      seconds = parseDurationToSeconds(duration);
    }

    rawEntries.push({
      id: `drive_${videoId}`,
      videoId: videoId,
      filename: file,
      storageKey: encodeURIComponent(file),
      title: title,
      author: author,
      duration: duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      isNative: true,
      isDriveHosted: true,
      isServerHosted: false,
      badge: "👑 Servidor VIP",
      description: "Pista de alta fidelidad en Servidor VIP. Reproducción instantánea sin anuncios.",
      seconds: seconds
    });
  }

  console.log(`Canciones sincronizadas en Catálogo (Total único detectado): ${rawEntries.length}`);

  // Guardar JSONs
  fs.writeFileSync(SERVER_CATALOG_JSON, JSON.stringify(rawEntries, null, 2), 'utf8');
  fs.writeFileSync(DRIVE_CATALOG_JSON, JSON.stringify(rawEntries, null, 2), 'utf8');

  // Guardar serverCatalog.js
  let serverJsContent = `// Catálogo maestro de canciones en Servidor VIP - Auto-generado\n`;
  serverJsContent += `export const SERVER_CATALOG_RAW = ${JSON.stringify(rawEntries, null, 2)};\n\n`;
  serverJsContent += `// Servidor backend - usa proxy relativo /api/videos o variable de entorno
const BASE_STORAGE_URL = (
  import.meta.env?.VITE_LOCAL_VIDEOS_URL ||
  (import.meta.env?.VITE_BACKEND_URL ? \`\${import.meta.env.VITE_BACKEND_URL}/api/videos\` : '/api/videos')
).replace(/\\/+$/, '');

function removeAccents(str) {
  return (str || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}

/**
 * Catálogo enriquecido de pistas de Servidor VIP con índice de búsqueda pre-calculado
 */
export const SERVER_TRACKS = SERVER_CATALOG_RAW.map((track) => ({
  ...track,
  videoUrl: \`\${BASE_STORAGE_URL}/\${encodeURIComponent(track.filename)}\`,
  badge: '👑 Servidor VIP',
  isDriveHosted: true,
  isServerHosted: false,
  _searchIndex: removeAccents(\`\${track.title} \${track.author} \${track.videoId}\`).toLowerCase(),
}));

// Mapa rápido por videoId para auto-intercepción instantánea
const SERVER_TRACKS_BY_VIDEO_ID = new Map(
  SERVER_TRACKS.map((t) => [t.videoId, t])
);

/**
 * Busca canciones en el catálogo del servidor VIP con búsqueda ultra-rápida y límite
 * @param {string} query
 * @param {number} limit
 * @returns {Array} canciones coincidentes
 */
export function searchServerCatalog(query, limit = 50) {
  if (!query || typeof query !== 'string') return [];
  const clean = removeAccents(query.trim().toLowerCase());
  if (clean.length < 2) return [];

  const terms = clean.split(/\\s+/).filter(Boolean);
  const results = [];

  for (let i = 0; i < SERVER_TRACKS.length; i++) {
    const track = SERVER_TRACKS[i];
    if (terms.every((term) => track._searchIndex.includes(term))) {
      results.push(track);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Encuentra una canción del servidor VIP por su videoId original de YouTube
 * @param {string} videoId
 * @returns {object|null}
 */
export function findServerTrackByVideoId(videoId) {
  if (!videoId) return null;
  return SERVER_TRACKS_BY_VIDEO_ID.get(videoId) || null;
}
`;
  fs.writeFileSync(SERVER_CATALOG_JS, serverJsContent, 'utf8');

  // Guardar driveCatalog.js
  let driveJsContent = `// Catálogo maestro de canciones en Servidor VIP - Auto-generado\n`;
  driveJsContent += `export const DRIVE_CATALOG_RAW = ${JSON.stringify(rawEntries, null, 2)};\n\n`;
  driveJsContent += `// Servidor backend - usa proxy relativo /api/videos o variable de entorno
const BASE_STORAGE_URL = (
  import.meta.env?.VITE_LOCAL_VIDEOS_URL ||
  (import.meta.env?.VITE_BACKEND_URL ? \`\${import.meta.env.VITE_BACKEND_URL}/api/videos\` : '/api/videos')
).replace(/\\/+$/, '');

function removeAccents(str) {
  return (str || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
}

/**
 * Catálogo enriquecido de pistas de Servidor VIP con índice de búsqueda pre-calculado
 */
export const DRIVE_TRACKS = DRIVE_CATALOG_RAW.map((track) => ({
  ...track,
  videoUrl: \`\${BASE_STORAGE_URL}/\${encodeURIComponent(track.filename)}\`,
  badge: '👑 Servidor VIP',
  isDriveHosted: true,
  isServerHosted: false,
  _searchIndex: removeAccents(\`\${track.title} \${track.author} \${track.videoId}\`).toLowerCase(),
}));

// Mapa rápido por videoId para auto-intercepción instantánea
const DRIVE_TRACKS_BY_VIDEO_ID = new Map(
  DRIVE_TRACKS.map((t) => [t.videoId, t])
);

/**
 * Busca canciones en el catálogo de Servidor VIP con búsqueda ultra-rápida y límite
 * @param {string} query
 * @param {number} limit
 * @returns {Array} canciones coincidentes
 */
export function searchDriveCatalog(query, limit = 50) {
  if (!query || typeof query !== 'string') return [];
  const clean = removeAccents(query.trim().toLowerCase());
  if (clean.length < 2) return [];

  const terms = clean.split(/\\s+/).filter(Boolean);
  const results = [];

  for (let i = 0; i < DRIVE_TRACKS.length; i++) {
    const track = DRIVE_TRACKS[i];
    if (terms.every((term) => track._searchIndex.includes(term))) {
      results.push(track);
      if (results.length >= limit) break;
    }
  }

  return results;
}

/**
 * Encuentra una canción de Servidor VIP por su videoId original de YouTube
 * @param {string} videoId
 * @returns {object|null}
 */
export function findDriveTrackByVideoId(videoId) {
  if (!videoId) return null;
  return DRIVE_TRACKS_BY_VIDEO_ID.get(videoId) || null;
}

export function findDriveTrackByFileId(driveFileId) {
  if (!driveFileId) return null;
  return null;
}
`;
  fs.writeFileSync(DRIVE_CATALOG_JS, driveJsContent, 'utf8');

  console.log(`Catálogos sincronizados como "Servidor VIP" en client/src/data/`);
}

sync();
