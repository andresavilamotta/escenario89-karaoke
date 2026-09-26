const fs = require('fs');
const path = require('path');

const issuesFile = path.resolve(__dirname, '..', 'sentry_logs_export.json');
const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

const catFile = path.resolve(__dirname, '..', 'client', 'src', 'data', 'driveCatalog.json');
const cat = JSON.parse(fs.readFileSync(catFile, 'utf8'));
const catMap = new Map(cat.map(c => [c.videoId, c]));

const target18 = new Date('2026-09-18T00:00:00Z');
const songsByVideoId = new Map();

for (const issue of issues) {
  const isRecent = new Date(issue.lastSeen) >= target18 || new Date(issue.firstSeen) >= target18;
  if (!isRecent) continue;

  const text = issue.title || '';
  const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
  const titleQuote = text.match(/"([^"]+)"/);
  const titleBlock = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
  const rawTitle = titleQuote ? titleQuote[1].trim() : (titleBlock ? titleBlock[1].trim() : text);

  if (idMatch) {
    const videoId = idMatch[1];
    if (!songsByVideoId.has(videoId)) {
      songsByVideoId.set(videoId, {
        videoId,
        title: rawTitle,
        count: 0,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen
      });
    }
    const entry = songsByVideoId.get(videoId);
    entry.count += parseInt(issue.count || '1', 10);
    if (new Date(issue.lastSeen) > new Date(entry.lastSeen)) entry.lastSeen = issue.lastSeen;
    if (new Date(issue.firstSeen) < new Date(entry.firstSeen)) entry.firstSeen = issue.firstSeen;
  }
}

const recovered = [];
for (const [videoId, s] of songsByVideoId.entries()) {
  const inCat = catMap.get(videoId);

  let artist = 'Artista';
  let titleOnly = s.title;
  if (inCat && inCat.author) {
    artist = inCat.author;
    titleOnly = inCat.title;
  } else if (s.title.includes(' - ')) {
    const parts = s.title.split(' - ');
    artist = parts[0].trim();
    titleOnly = parts.slice(1).join(' - ').trim();
  }

  recovered.push({
    videoId,
    title: inCat ? inCat.title : s.title,
    author: artist,
    duration: inCat ? inCat.duration : '3:30',
    seconds: inCat ? inCat.seconds : 210,
    thumbnail: inCat ? inCat.thumbnail : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    driveFileId: inCat ? inCat.driveFileId : null,
    driveStreamUrl: inCat ? inCat.driveStreamUrl : `/api/stream?v=${videoId}`,
    videoUrl: inCat ? inCat.videoUrl : `/api/stream?v=${videoId}`,
    filename: inCat ? inCat.filename : `${s.title} [${videoId}].mp4`,
    badge: '👑 Servidor VIP',
    isNative: true,
    isDriveHosted: true,
    totalErrorsSentry: s.count,
    lastReported: s.lastSeen
  });
}

// Ordenar por fecha más reciente primero y luego por conteo
recovered.sort((a, b) => new Date(b.lastReported) - new Date(a.lastReported));

console.log(`Canciones recuperadas del 18 de septiembre en adelante: ${recovered.length}`);

const jsContent = `// Lista de canciones recuperadas desde incidencias de Sentry (18 de septiembre en adelante)
// Auto-generado y descargado al Servidor VIP de Escenario 89 Karaoke

export const RECOVERED_ANNOUNCEMENT_DATE = '2026-09-26';

export const RECOVERED_SONGS = ${JSON.stringify(recovered, null, 2)};
`;

const outPath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'recoveredSongs.js');
fs.writeFileSync(outPath, jsContent, 'utf8');
console.log(`Guardado en: ${outPath}`);
