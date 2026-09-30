export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const videoId = req.query.v || req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId es requerido' });
  }

  return res.status(200).json({
    status: 'fallback_needed',
    videoId,
    message: 'Para reproducir videos restringidos en la nube sin PC, selecciona una versión con ✓ OK o despliega el worker Docker en Render.',
  });
}
