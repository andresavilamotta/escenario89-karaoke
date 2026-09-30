import fs from 'fs';

// En rama test/sin-canciones-descargadas: deshabilitar resolución de catálogo pre-descargado
function getDriveIdForVideo(videoId) {
  return null;
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

  // 1. Comprobar si ya está disponible en el catálogo de Servidor VIP
  const driveId = getDriveIdForVideo(videoId);
  if (driveId) {
    return res.status(200).json({
      status: 'completed',
      isReady: true,
      videoId,
      driveFileId: driveId,
      streamUrl: `/api/stream?id=${driveId}`,
      badge: '👑 Servidor VIP',
      message: 'La canción ya está descargada y disponible en el Servidor VIP.',
    });
  }

  // 2. Si no está en Servidor VIP, reportar estado en cola
  return res.status(200).json({
    status: 'queued',
    isReady: false,
    videoId,
    message: 'Canción en cola para descarga en segundo plano al Servidor VIP.',
  });
}
