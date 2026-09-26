const fs = require('fs');
const path = require('path');

const TOKEN = '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';
const issuesFile = path.resolve(__dirname, '..', 'sentry_logs_export.json');
const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf8'));

console.log(`Analizando ${issues.length} incidentes de Sentry...`);

// Concurrency helper
async function mapConcurrent(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        results[i] = null;
      }
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function run() {
  const needsFetch = [];
  const songsMap = new Map();

  for (const issue of issues) {
    const text = issue.title || '';
    const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
    const titleQuote = text.match(/"([^"]+)"/);
    const titleBlock = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
    const rawTitle = titleQuote ? titleQuote[1].trim() : (titleBlock ? titleBlock[1].trim() : text);

    if (idMatch) {
      const videoId = idMatch[1];
      if (!songsMap.has(videoId)) {
        songsMap.set(videoId, {
          videoId,
          title: rawTitle,
          count: 0,
          issueIds: [],
          lastSeen: issue.lastSeen
        });
      }
      const entry = songsMap.get(videoId);
      entry.count += parseInt(issue.count || '1', 10);
      entry.issueIds.push(issue.id);
      if (new Date(issue.lastSeen) > new Date(entry.lastSeen)) entry.lastSeen = issue.lastSeen;
    } else {
      needsFetch.push({ issue, rawTitle });
    }
  }

  console.log(`Canciones identificadas directamente por título: ${songsMap.size}`);
  console.log(`Incidentes pendientes de consulta detallada a la API de Sentry: ${needsFetch.length}`);

  let fetchedCount = 0;
  await mapConcurrent(needsFetch, 8, async (item) => {
    const issueId = item.issue.id;
    try {
      const res = await fetch(`https://sentry.io/api/0/issues/${issueId}/events/latest/`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      let videoId = null;
      let title = item.rawTitle;

      // Buscar en extra / context
      if (data.context && data.context.videoId) videoId = data.context.videoId;
      if (!videoId && data.extra && data.extra.videoId) videoId = data.extra.videoId;
      if (data.context && data.context.songTitle) title = data.context.songTitle;
      if (data.extra && data.extra.songTitle) title = data.extra.songTitle;

      // Buscar en tags
      if (!videoId && data.tags) {
        const vTag = data.tags.find(t => t.key === 'videoId');
        if (vTag) videoId = vTag.value;
      }

      // Si aún no, buscar en entries de breadcrumbs o message
      if (!videoId && data.entries) {
        for (const entry of data.entries) {
          if (entry.type === 'breadcrumbs' && entry.data?.values) {
            for (const b of entry.data.values) {
              const bMsg = b.message || '';
              const m = bMsg.match(/([a-zA-Z0-9_-]{11})/);
              if (m && (bMsg.includes('youtube') || bMsg.includes('video') || bMsg.includes('Reproduciendo'))) {
                videoId = m[1];
                break;
              }
            }
          }
        }
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        if (!songsMap.has(videoId)) {
          songsMap.set(videoId, {
            videoId,
            title,
            count: 0,
            issueIds: [],
            lastSeen: item.issue.lastSeen
          });
        }
        const entry = songsMap.get(videoId);
        entry.count += parseInt(item.issue.count || '1', 10);
        entry.issueIds.push(item.issue.id);
        if (new Date(item.issue.lastSeen) > new Date(entry.lastSeen)) entry.lastSeen = item.issue.lastSeen;
      }
    } catch (e) {
    } finally {
      fetchedCount++;
      if (fetchedCount % 30 === 0 || fetchedCount === needsFetch.length) {
        process.stdout.write(`   Procesados ${fetchedCount}/${needsFetch.length}...\r`);
      }
    }
  });

  console.log(`\n\n🎉 ¡Total de canciones únicas con Video ID identificadas en Sentry: ${songsMap.size}!`);

  const list = Array.from(songsMap.values());
  list.sort((a, b) => b.count - a.count);

  // Comprobar con la carpeta Canciones_Descargadas
  const targetDir = path.resolve(__dirname, '..', 'Canciones_Descargadas');
  const files = fs.readdirSync(targetDir);
  const downloadedIds = new Set();
  files.forEach(f => {
    const m = f.match(/\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i);
    if (m) downloadedIds.add(m[1]);
  });

  const alreadyDownloaded = [];
  const missing = [];

  for (const song of list) {
    if (downloadedIds.has(song.videoId)) {
      alreadyDownloaded.push(song);
    } else {
      missing.push(song);
    }
  }

  console.log(`=======================================================`);
  console.log(`✅ YA DESCARGADAS EN LOCAL / VIP: ${alreadyDownloaded.length}`);
  console.log(`⏳ PENDIENTES POR DESCARGAR:     ${missing.length}`);
  console.log(`=======================================================\n`);

  // Guardar lista consolidada actualizada
  const consFile = path.resolve(__dirname, '..', 'canciones_problemas_consolidadas.json');
  fs.writeFileSync(consFile, JSON.stringify(list, null, 2), 'utf8');

  // Guardar archivo específico de pendientes por descargar
  const missingFile = path.resolve(__dirname, '..', 'canciones_sentry_pendientes.json');
  fs.writeFileSync(missingFile, JSON.stringify(missing, null, 2), 'utf8');

  console.log(`Top 25 canciones pendientes por descargar:`);
  missing.slice(0, 25).forEach((s, idx) => {
    console.log(`  ${idx + 1}. [${s.videoId}] ${s.title} (${s.count} reportes)`);
  });

  console.log(`\nArchivo de pendientes generado en: ${missingFile}`);
}

run();
