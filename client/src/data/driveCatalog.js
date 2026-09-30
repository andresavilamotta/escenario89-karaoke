// ==============================================================================
// Rama de Prueba: SIN CANCIONES DESCARGADAS (Pure YouTube + Cloud Worker)
// ==============================================================================

export const DRIVE_CATALOG_RAW = [];
export const DRIVE_TRACKS = [];
export const DRIVE_TRACKS_BY_VIDEO_ID = new Map();
export const DRIVE_TRACKS_BY_FILE_ID = new Map();

export function searchDriveCatalog(query, limit = 6) {
  return [];
}

export function findDriveTrackByVideoId(videoId) {
  return null;
}

export function findDriveTrackByFileId(driveFileId) {
  return null;
}
