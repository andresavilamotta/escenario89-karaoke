const fs = require('fs');
const path = require('path');

const sentryExportPath = path.resolve(__dirname, '..', 'sentry_logs_export.json');
const data = JSON.parse(fs.readFileSync(sentryExportPath, 'utf8'));

// Mapa para agrupar
const grouped = new Map();

for (const issue of data) {
  const texts = [issue.title];
  if (issue.events) {
    for (const ev of issue.events) {
      if (ev.message) texts.push(ev.message);
    }
  }

  let foundVideoId = null;
  let foundTitle = null;

  for (const text of texts) {
    if (!text) continue;
    const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
    if (idMatch && !foundVideoId) foundVideoId = idMatch[1];

    const titleQuoteMatch = text.match(/"([^"]+)"/);
    if (titleQuoteMatch && !foundTitle) {
      foundTitle = titleQuoteMatch[1].trim();
    } else if (!foundTitle) {
      const bMatch = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
      if (bMatch) foundTitle = bMatch[1].trim();
    }
  }

  // Si encontramos título o ID
  if (foundTitle || foundVideoId) {
    // Clave de normalización
    const normKey = (foundTitle || foundVideoId).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!grouped.has(normKey)) {
      grouped.set(normKey, {
        title: foundTitle,
        videoId: foundVideoId,
        issues: new Set(),
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        errorCodes: new Set(),
        totalCount: 0
      });
    }
    const item = grouped.get(normKey);
    if (!item.title && foundTitle) item.title = foundTitle;
    if (!item.videoId && foundVideoId) item.videoId = foundVideoId;
    item.issues.add(issue.shortId);
    item.totalCount += parseInt(issue.count || '1', 10);
    if (new Date(issue.lastSeen) > new Date(item.lastSeen)) item.lastSeen = issue.lastSeen;
    if (new Date(issue.firstSeen) < new Date(item.firstSeen)) item.firstSeen = issue.firstSeen;

    // Detectar codigos de error
    const fullText = texts.join(' ');
    if (fullText.includes('150')) item.errorCodes.add('150 (Derechos)');
    if (fullText.includes('101')) item.errorCodes.add('101 (Inserción no permitida)');
    if (fullText.includes('100')) item.errorCodes.add('100 (Video no encontrado/privado)');
    if (fullText.includes('2')) item.errorCodes.add('2 (Parámetro inválido)');
  }
}

const list = Array.from(grouped.values()).map(x => ({
  ...x,
  issues: Array.from(x.issues),
  errorCodes: Array.from(x.errorCodes)
}));

list.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

console.log('Total canciones unificadas:', list.length);
console.log(JSON.stringify(list, null, 2));
