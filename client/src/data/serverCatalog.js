// ==============================================================================
// Rama de Prueba: SIN CANCIONES DESCARGADAS (Pure YouTube + Cloud Worker)
// ==============================================================================

export const SERVER_CATALOG_RAW = [];
export const SERVER_TRACKS = [];
export const SERVER_TRACKS_BY_VIDEO_ID = new Map();
export const SERVER_TRACKS_BY_FILE_ID = new Map();

export function searchServerCatalog(query, limit = 6) {
  return [];
}

export function findServerTrackByVideoId(videoId) {
  return null;
}

export function findServerTrackByFileId(driveFileId) {
  return null;
}

export function findServerTrackByFilename(filename) {
  return null;
}
