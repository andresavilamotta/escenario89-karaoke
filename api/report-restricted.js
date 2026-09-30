import fs from 'fs';

// Cargar mapa de IDs de Google Drive existentes
let videoIdToDriveId = null;

function getDriveIdForVideo(videoId) {
  if (!videoId) return null;
  if (!videoIdToDriveId) {
    try {
      const jsonUrl = new URL('./drive_file_ids.min.json', import.meta.url);
      videoIdToDriveId = JSON.parse(fs.readFileSync(jsonUrl, 'utf8'));
    } catch (e) {
      console.warn('[Report API] Error al cargar drive_file_ids.min.json:', e.message);
      videoIdToDriveId = {};
    }
  }
  return videoIdToDriveId[videoId] || null;
}

// Registro en memoria de pistas restringidas reportadas por el frontend
// Permite que la PC del establecimiento o un worker descargue en segundo plano a Google Drive
let restrictedQueue = [];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Consultar la lista de canciones restringidas pendientes de descarga a Google Drive
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      count: restrictedQueue.length,
      queue: restrictedQueue,
      timestamp: new Date().toISOString(),
    });
  }

  // DELETE: Limpiar la cola una vez descargadas
  if (req.method === 'DELETE') {
    const previousCount = restrictedQueue.length;
    restrictedQueue = [];
    return res.status(200).json({
      success: true,
      message: `Cola de canciones restringidas vaciada. Se eliminaron ${previousCount} registros.`,
    });
  }

  // POST: Reportar una canción con restricción de derechos (Error 150/101, etc.)
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { videoId, title, errorCode, author, rescued, rescueType } = body;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: 'El parámetro videoId es obligatorio.' });
      }

      const existingDriveId = getDriveIdForVideo(videoId);

      // Si ya está en Google Drive, responder de inmediato con los datos de streaming
      if (existingDriveId) {
        return res.status(200).json({
          success: true,
          alreadyInDrive: true,
          videoId,
          title: title || 'Canción VIP',
          driveFileId: existingDriveId,
          streamUrl: `/api/stream?id=${existingDriveId}`,
          message: 'La canción ya se encuentra disponible en Google Drive (Servidor VIP).',
        });
      }

      // Si no está en Google Drive, registrar en la cola de descarga en segundo plano
      const existingEntry = restrictedQueue.find((t) => t.videoId === videoId);
      if (existingEntry) {
        existingEntry.reportsCount = (existingEntry.reportsCount || 1) + 1;
        existingEntry.lastReportedAt = new Date().toISOString();
        if (title) existingEntry.title = title;
        if (errorCode) existingEntry.errorCode = errorCode;
      } else {
        restrictedQueue.unshift({
          videoId,
          title: title || `YouTube ID: ${videoId}`,
          author: author || 'Desconocido',
          errorCode: errorCode || 150,
          rescued: !!rescued,
          rescueType: rescueType || 'none',
          reportsCount: 1,
          firstReportedAt: new Date().toISOString(),
          lastReportedAt: new Date().toISOString(),
          status: 'pending_download',
        });

        // Mantener un máximo de 300 canciones en cola
        if (restrictedQueue.length > 300) {
          restrictedQueue = restrictedQueue.slice(0, 300);
        }
      }

      return res.status(200).json({
        success: true,
        alreadyInDrive: false,
        queuedForDownload: true,
        videoId,
        title: title || videoId,
        message: 'Restricción registrada. Canción agregada a la cola de descarga a Google Drive.',
        queueLength: restrictedQueue.length,
      });
    } catch (err) {
      console.error('[Report API] Error al procesar reporte:', err);
      return res.status(500).json({ error: 'Error interno al procesar el reporte de restricción.' });
    }
  }

  return res.status(405).json({ error: 'Método HTTP no permitido.' });
}
