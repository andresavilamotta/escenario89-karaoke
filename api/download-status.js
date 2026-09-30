import fs from 'fs';

let videoIdToDriveId = null;

function getDriveIdForVideo(videoId) {
  if (!videoId) return null;
  if (!videoIdToDriveId) {
    try {
      const jsonUrl = new URL('./drive_file_ids.min.json', import.meta.url);
      videoIdToDriveId = JSON.parse(fs.readFileSync(jsonUrl, 'utf8'));
    } catch (e) {
      videoIdToDriveId = {};
    }
  }
  return videoIdToDriveId[videoId] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.v || req.query.videoId;

  if (!videoId) {
    return res.status(400).json({ error: 'Parámetro v (videoId) requerido.' });
  }

  // 1. Comprobar si ya está disponible en el catálogo de Google Drive (Servidor VIP)
  const driveId = getDriveIdForVideo(videoId);
  if (driveId) {
    return res.status(200).json({
      status: 'completed',
      isReady: true,
      videoId,
      driveFileId: driveId,
      streamUrl: `/api/stream?id=${driveId}`,
      badge: '👑 Servidor VIP (Google Drive)',
      message: 'La canción ya está descargada y disponible en el Servidor VIP.',
    });
  }

  // 2. Si no está en Google Drive, reportar estado en cola
  return res.status(200).json({
    status: 'queued',
    isReady: false,
    videoId,
    message: 'Canción en cola para descarga en segundo plano a Google Drive.',
  });
}
