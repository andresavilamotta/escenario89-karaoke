import ytSearch from 'yt-search';

// Helper para extraer ID de video de una URL de YouTube si el usuario pega un enlace directo
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Si ya es un ID de 11 caracteres válido
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // URLs estándar: https://www.youtube.com/watch?v=XXXXX, youtu.be, embed, etc.
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
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    // 200 = Inserción permitida
    // 401 / 403 = Inserción deshabilitada por el creador / sello (Error 150/101)
    return response.status === 200;
  } catch (err) {
    // Si hay timeout o error transitorio de red, asumimos true para no bloquear falsamente
    return true;
  }
}

export default async function handler(req, res) {
  // Configurar encabezados CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q;
  const mode = req.query.mode || 'karaoke'; // 'karaoke' | 'lyrics' | 'original' | 'direct'

  if (!query || typeof query !== 'string' || query.trim() === '') {
    return res.status(400).json({ error: 'Parámetro de búsqueda "q" requerido.' });
  }

  const cleanQuery = query.trim();

  // Caso 1: El usuario pegó una URL directa o un ID de video de YouTube
  const directId = extractYouTubeVideoId(cleanQuery);
  if (directId) {
    try {
      const isEmbeddable = await isVideoEmbeddable(directId);
      const searchDirect = await ytSearch({ videoId: directId });

      if (searchDirect) {
        return res.status(200).json({
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
    const isExplicitlyOriginal = lowerQ.includes('original') || lowerQ.includes('oficial') || lowerQ.includes('official') || lowerQ.includes('videoclip') || lowerQ.includes('baile');
    if (!isExplicitlyOriginal && !lowerQ.includes('karaoke') && !lowerQ.includes('instrumental')) {
      searchQuery = `${cleanQuery} karaoke instrumental`;
    }
  } else if (mode === 'lyrics') {
    if (!lowerQ.includes('lyrics') && !lowerQ.includes('letra')) {
      searchQuery = `${cleanQuery} lyrics letra`;
    }
  } else if (mode === 'original') {
    if (!lowerQ.includes('official') && !lowerQ.includes('video') && !lowerQ.includes('original')) {
      searchQuery = `${cleanQuery} official music video`;
    }
  }

  try {
    const results = await ytSearch(searchQuery);

    if (!results || !Array.isArray(results.videos)) {
      return res.status(200).json({ results: [] });
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

    // Filtrar para priorizar videos con inserción permitida (evita Error 150)
    const playableVideos = allValidated.filter((v) => v.embeddable);
    const finalResults = playableVideos.length > 0 ? playableVideos : allValidated;

    return res.status(200).json({
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
}
