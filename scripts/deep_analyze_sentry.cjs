const fs = require('fs');
const path = require('path');

const issues = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'sentry_logs_export.json'), 'utf8'));

// 1. Mapear todos los títulos con videoId
const titleToId = new Map();
for (const issue of issues) {
  const text = issue.title || '';
  const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
  const titleQuote = text.match(/"([^"]+)"/);
  const titleBlock = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
  const rawTitle = titleQuote ? titleQuote[1].trim() : (titleBlock ? titleBlock[1].trim() : null);

  if (idMatch && rawTitle) {
    const norm = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    titleToId.set(norm, { videoId: idMatch[1], originalTitle: rawTitle });
  }
}

console.log(`Títulos con ID directo encontrados: ${titleToId.size}`);

// 2. Revisar los issues sin ID
const unmapped = new Map();
const allSongs = new Map();

for (const issue of issues) {
  const text = issue.title || '';
  const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
  const titleQuote = text.match(/"([^"]+)"/);
  const titleBlock = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
  const rawTitle = titleQuote ? titleQuote[1].trim() : (titleBlock ? titleBlock[1].trim() : text);
  const norm = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');

  let videoId = idMatch ? idMatch[1] : null;
  if (!videoId && titleToId.has(norm)) {
    videoId = titleToId.get(norm).videoId;
  }

  const key = videoId || norm;
  if (!allSongs.has(key)) {
    allSongs.set(key, {
      title: rawTitle,
      videoId,
      count: 0,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      issueIds: []
    });
  }
  const entry = allSongs.get(key);
  entry.count += parseInt(issue.count || '1', 10);
  entry.issueIds.push(issue.id);
  if (videoId && !entry.videoId) entry.videoId = videoId;
}

const withId = [];
const withoutId = [];

for (const [k, v] of allSongs.entries()) {
  if (v.videoId) {
    withId.push(v);
  } else {
    withoutId.push(v);
  }
}

console.log(`Canciones consolidadas CON videoId: ${withId.length}`);
console.log(`Canciones/incidentes SIN videoId asociado: ${withoutId.length}`);

if (withoutId.length > 0) {
  console.log('\nTop 10 incidentes sin ID:');
  withoutId.slice(0, 10).forEach(x => console.log(`   - "${x.title}" (${x.count} veces) [Issue ${x.issueIds[0]}]`));
}

// Comprobar con la carpeta Canciones_Descargadas
const files = fs.readdirSync(path.resolve(__dirname, '..', 'Canciones_Descargadas'));
const downloadedIds = new Set();
files.forEach(f => {
  const m = f.match(/\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i);
  if (m) downloadedIds.add(m[1]);
});

const missing = withId.filter(s => !downloadedIds.has(s.videoId));
console.log(`\n======================================================`);
console.log(`Canciones en Sentry ya en disco: ${withId.length - missing.length}`);
console.log(`Canciones en Sentry FALTANTES en disco: ${missing.length}`);
console.log(`======================================================\n`);

missing.forEach((s, i) => {
  console.log(`${i + 1}. [${s.videoId}] ${s.title} (${s.count} eventos)`);
});
