import https from 'https';
import fs from 'fs';

// Cargar mapa minificado de 3,440 IDs
let videoIdToDriveId = null;

function getDriveIdForVideo(videoId) {
  if (!videoId) return null;
  if (!videoIdToDriveId) {
    try {
      const jsonUrl = new URL('./drive_file_ids.min.json', import.meta.url);
      videoIdToDriveId = JSON.parse(fs.readFileSync(jsonUrl, 'utf8'));
    } catch (e) {
      console.warn('[Stream API] Error al cargar drive_file_ids.min.json:', e.message);
      videoIdToDriveId = {};
    }
  }
  return videoIdToDriveId[videoId] || null;
}

// Función principal de streaming con seguimiento de redirecciones y HTTP 206
function streamFromDrive(driveUrl, clientReq, clientRes, maxRedirects = 3) {
  if (maxRedirects <= 0) {
    clientRes.status(502).json({ error: 'Demasiadas redirecciones al consultar Google Drive.' });
    return;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Escenario89/1.0',
    'Accept': '*/*',
  };

  const range = clientReq.headers.range;
  const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5 MB por segmento para streaming ultra-fluido

  if (range) {
    const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const endStr = rangeMatch[2];
      if (!endStr) {
        headers['Range'] = `bytes=${start}-${start + CHUNK_SIZE - 1}`;
      } else {
        const end = parseInt(endStr, 10);
        if (end - start > CHUNK_SIZE) {
          headers['Range'] = `bytes=${start}-${start + CHUNK_SIZE - 1}`;
        } else {
          headers['Range'] = range;
        }
      }
    } else {
      headers['Range'] = range;
    }
  }

  const req = https.get(driveUrl, { headers }, (driveRes) => {
    // Seguir redirecciones
    if (driveRes.statusCode >= 300 && driveRes.statusCode < 400 && driveRes.headers.location) {
      return streamFromDrive(driveRes.headers.location, clientReq, clientRes, maxRedirects - 1);
    }

    clientRes.status(driveRes.statusCode || 200);

    const forwardHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'content-disposition',
    ];

    forwardHeaders.forEach((h) => {
      if (driveRes.headers[h]) {
        clientRes.setHeader(h, driveRes.headers[h]);
      }
    });

    if (!driveRes.headers['content-type']) {
      clientRes.setHeader('content-type', 'video/mp4');
    }
    clientRes.setHeader('accept-ranges', 'bytes');
    clientRes.setHeader('Access-Control-Allow-Origin', '*');
    clientRes.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    clientRes.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    clientRes.setHeader('Cache-Control', 'public, max-age=3600');

    driveRes.pipe(clientRes);
  });

  req.on('error', (err) => {
    console.error('[Stream API] Error en conexión con Google Drive:', err.message);
    if (!clientRes.headersSent) {
      clientRes.status(502).json({ error: 'Error de conexión con Google Drive.' });
    }
  });

  clientReq.on('close', () => {
    req.destroy();
  });
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let fileId = req.query.id;
  const videoId = req.query.v;

  if (!fileId && videoId) {
    fileId = getDriveIdForVideo(videoId);
    if (!fileId) {
      return res.status(404).json({
        error: 'Video no encontrado en el Servidor VIP de Google Drive.',
        videoId,
        needsDownload: true,
      });
    }
  }

  if (!fileId || typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(fileId)) {
    return res.status(400).json({ error: 'Parámetro id (Google Drive) o v (Video ID) requerido y válido.' });
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
  streamFromDrive(driveUrl, req, res);
}
