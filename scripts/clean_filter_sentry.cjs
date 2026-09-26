const fs = require('fs');
const path = require('path');

const issuesFile = path.resolve(__dirname, '..', 'sentry_logs_export.json');
const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

// Mapa para agrupar todas las canciones
const songsByVideoId = new Map();

function isValidVideoId(id) {
  if (!id || typeof id !== 'string') return false;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return false;
  // Descartar palabras falsas detectadas por substrings
  const invalidWords = ['reproducien', 'object-cont', 'transaction', 'interfaz_dj', 'application'];
  if (invalidWords.includes(id.toLowerCase())) return false;
  return true;
}

// 1. Extraer directo de los títulos de los 449 issues
for (const issue of issues) {
  const text = issue.title || '';
  const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
  const titleQuote = text.match(/"([^"]+)"/);
  const titleBlock = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
  const rawTitle = titleQuote ? titleQuote[1].trim() : (titleBlock ? titleBlock[1].trim() : text);

  if (idMatch && isValidVideoId(idMatch[1])) {
    const videoId = idMatch[1];
    if (!songsByVideoId.has(videoId)) {
      songsByVideoId.set(videoId, {
        videoId,
        title: rawTitle,
        count: 0,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        issueIds: new Set()
      });
    }
    const entry = songsByVideoId.get(videoId);
    entry.count += parseInt(issue.count || '1', 10);
    entry.issueIds.add(issue.id);
    if (new Date(issue.lastSeen) > new Date(entry.lastSeen)) entry.lastSeen = issue.lastSeen;
    if (new Date(issue.firstSeen) < new Date(entry.firstSeen)) entry.firstSeen = issue.firstSeen;
  }
}

console.log(`Canciones encontradas directamente en títulos: ${songsByVideoId.size}`);

// Verificar fechas
const target18 = new Date('2026-09-18T00:00:00Z');
const list = Array.from(songsByVideoId.values());
const from18th = list.filter(s => new Date(s.lastSeen) >= target18 || new Date(s.firstSeen) >= target18);

console.log(`Canciones totales: ${list.length}`);
console.log(`Canciones con incidentes del 18 en adelante: ${from18th.length}`);

// Comprobar con Canciones_Descargadas
const files = fs.readdirSync(path.resolve(__dirname, '..', 'Canciones_Descargadas'));
const downloadedIds = new Set();
files.forEach(f => {
  const m = f.match(/\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i);
  if (m) downloadedIds.add(m[1]);
});

const missing = from18th.filter(s => !downloadedIds.has(s.videoId));
const downloaded = from18th.filter(s => downloadedIds.has(s.videoId));

console.log(`\n======================================================`);
console.log(`Canciones del 18 en adelante YA DESCARGADAS: ${downloaded.length}`);
console.log(`Canciones del 18 en adelante FALTANTES:      ${missing.length}`);
console.log(`======================================================\n`);

console.log('Listado de canciones FALTANTES por descargar:');
missing.forEach((s, idx) => {
  console.log(`${idx + 1}. [${s.videoId}] ${s.title} (Reportado: ${s.lastSeen})`);
});
