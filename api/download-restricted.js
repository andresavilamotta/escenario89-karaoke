export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId, title } = req.body || {};

  if (!videoId) {
    return res.status(400).json({ error: 'videoId es requerido' });
  }

  return res.status(200).json({
    status: 'queued',
    videoId,
    title: title || videoId,
    message: 'Solicitud registrada en el backend.',
  });
}
