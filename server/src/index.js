import express from 'express';
import cors from 'cors';
import ytSearch from 'yt-search';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper para extraer ID de video de una URL de YouTube si el usuario pega un enlace directo
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Si ya es un ID de 11 caracteres válido
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URLs estándar: https://www.youtube.com/watch?v=XXXXX
  const watchMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (watchMatch && watchMatch[1]) {
    return watchMatch[1];
  }

  return null;
}

// Helper para verificar con oEmbed oficial de YouTube si el video tiene la inserción permitida (Error 150 prevention)
async function isVideoEmbeddable(videoId) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    // 200 = Inserción permitida
    // 401 / 403 = Inserción deshabilitada por el creador (Error 150/101)
    return response.status === 200;
  } catch (err) {
    // Si hay timeout o error de red, asumimos true para no bloquear falsamente
    return true;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'karaoke-search-proxy', timestamp: new Date().toISOString() });
});

// Endpoint de búsqueda inteligente con modos (karaoke, lyrics, original, directo) y filtro de inserción
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const mode = req.query.mode || 'karaoke'; // 'karaoke' | 'lyrics' | 'original' | 'direct'

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido.' });
  }

  const cleanQuery = query.trim();

  // Caso 1: El usuario pegó una URL directa o un ID de video
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) {
    try {
      const isEmbeddable = await isVideoEmbeddable(directId);
      const searchDirect = await ytSearch({ videoId: directId });

      if (searchDirect) {
        return res.json({
          query: cleanQuery,
          mode: 'direct',
          count: 1,
          results: [
            {
              videoId: searchDirect.videoId,
              title: searchDirect.title,
              author: searchDirect.author?.name || 'YouTube',
              duration: searchDirect.timestamp || '0:00',
              seconds: searchDirect.seconds || 0,
              thumbnail: searchDirect.thumbnail || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
              views: searchDirect.views ? searchDirect.views.toLocaleString('es-CO') : null,
              ago: searchDirect.ago || '',
              embeddable: isEmbeddable,
            },
          ],
        });
      }
    } catch (e) {
      console.warn('Error al buscar video por ID directo:', e);
    }
  }

  // Caso 2: Búsqueda por texto según el modo seleccionado
  let searchQuery = cleanQuery;
  const lowerQ = cleanQuery.toLowerCase();

  if (mode === 'karaoke') {
    if (!lowerQ.includes('karaoke') && !lowerQ.includes('instrumental')) {
      searchQuery = `${cleanQuery} karaoke instrumental`;
    }
  } else if (mode === 'lyrics') {
    if (!lowerQ.includes('lyrics') && !lowerQ.includes('letra')) {
      searchQuery = `${cleanQuery} lyrics letra`;
    }
  } else if (mode === 'original') {
    if (!lowerQ.includes('official') && !lowerQ.includes('video')) {
      searchQuery = `${cleanQuery} official music video`;
    }
  }
  // Si mode === 'direct' o 'all', usa cleanQuery directamente

  try {
    const results = await ytSearch(searchQuery);

    if (!results || !Array.isArray(results.videos)) {
      return res.json({ results: [] });
    }

    // Tomar los primeros 18 videos válidos
    const candidateVideos = results.videos
      .filter((v) => v.videoId && v.type === 'video')
      .slice(0, 18);

    // Validar en paralelo cuáles permiten inserción externa vía oEmbed
    const validationPromises = candidateVideos.map(async (v) => {
      const embeddable = await isVideoEmbeddable(v.videoId);
      return {
        videoId: v.videoId,
        title: v.title,
        author: v.author?.name || 'Desconocido',
        duration: v.timestamp || '0:00',
        seconds: v.seconds || 0,
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        views: v.views ? v.views.toLocaleString('es-CO') : null,
        ago: v.ago || '',
        embeddable,
      };
    });

    const allValidated = await Promise.all(validationPromises);

    // Filtramos para garantizar que solo mostramos videos con inserción permitida
    // (o si todos fallaron, mantenemos la lista marcando embeddable)
    const playableVideos = allValidated.filter((v) => v.embeddable);
    const finalResults = playableVideos.length > 0 ? playableVideos : allValidated;

    return res.json({
      query: searchQuery,
      mode,
      count: finalResults.length,
      filteredOutCount: candidateVideos.length - finalResults.length,
      results: finalResults,
    });
  } catch (error) {
    console.error('Error al realizar búsqueda en yt-search:', error);
    return res.status(500).json({
      error: 'Error al buscar en YouTube. Intenta con otro término.',
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Karaoke Backend] Servidor proxy activo con filtro oEmbed en http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('[Karaoke Backend] Error no capturado (uncaughtException):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Karaoke Backend] Promesa rechazada no capturada (unhandledRejection):', reason);
});
