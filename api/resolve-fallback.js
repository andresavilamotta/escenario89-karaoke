import fs from 'fs';
import ytSearch from 'yt-search';

// Cargar mapa de IDs de Google Drive
let videoIdToDriveId = null;

function getDriveIdForVideo(videoId) {
  if (!videoId) return null;
  if (!videoIdToDriveId) {
    try {
      const jsonUrl = new URL('./drive_file_ids.min.json', import.meta.url);
      videoIdToDriveId = JSON.parse(fs.readFileSync(jsonUrl, 'utf8'));
    } catch (e) {
      console.warn('[Resolve API] Error al cargar drive_file_ids.min.json:', e.message);
      videoIdToDriveId = {};
    }
  }
  return videoIdToDriveId[videoId] || null;
}

// Helper para verificar inserción oEmbed
async function isVideoEmbeddable(videoId) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    return response.status === 200;
  } catch (err) {
    return true;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.v;
  const rawQuery = req.query.q || '';

  // Paso 1: Comprobar si el video original ya está en Google Drive (Servidor VIP)
  if (videoId) {
    const driveId = getDriveIdForVideo(videoId);
    if (driveId) {
      return res.status(200).json({
        resolved: true,
        source: 'drive_exact',
        driveFileId: driveId,
        streamUrl: `/api/stream?id=${driveId}`,
        message: 'Canción encontrada exactamente en Google Drive (Servidor VIP).',
      });
    }
  }

  // Paso 2: Si hay título/búsqueda, buscar alternativas libres de restricción en YouTube (Lyrics / Comunidad)
  if (rawQuery.trim().length > 1) {
    try {
      const cleanTitle = rawQuery
        .replace(/\(Karaoke.*?\)/gi, '')
        .replace(/\[Karaoke.*?\]/gi, '')
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\(Lyrics.*?\)/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .trim();

      const searchTerms = `${cleanTitle} lyrics letra`;
      const searchRes = await ytSearch(searchTerms);

      if (searchRes && Array.isArray(searchRes.videos)) {
        const candidates = searchRes.videos
          .filter((v) => v.videoId && v.videoId !== videoId && v.type === 'video')
          .slice(0, 5);

        for (const candidate of candidates) {
          const embeddable = await isVideoEmbeddable(candidate.videoId);
          if (embeddable) {
            return res.status(200).json({
              resolved: true,
              source: 'youtube_lyrics',
              alternative: {
                videoId: candidate.videoId,
                title: candidate.title,
                author: candidate.author?.name || 'Comunidad',
                duration: candidate.timestamp || '0:00',
                seconds: candidate.seconds || 0,
                thumbnail: candidate.thumbnail || `https://i.ytimg.com/vi/${candidate.videoId}/hqdefault.jpg`,
                embeddable: true,
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn('[Resolve API] Error al consultar alternativas en YouTube:', e.message);
    }
  }

  return res.status(200).json({
    resolved: false,
    message: 'No se encontró alternativa automática inmediata.',
  });
}
