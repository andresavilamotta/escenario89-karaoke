const fs = require('fs');
const path = require('path');

/**
 * Script para conectar en vivo con la API de Sentry
 * Paginación automática para traer TODAS las incidencias del proyecto escenario89-karaoke
 * 
 * Uso:
 *   node scripts/fetch_sentry_issues.cjs <SENTRY_AUTH_TOKEN>
 *   o configurando SENTRY_AUTH_TOKEN en el entorno
 */

const TOKEN = process.argv[2] || process.env.SENTRY_AUTH_TOKEN || '';
const ORG_SLUG = process.env.SENTRY_ORG || 'andres-avila';
const PROJECT_SLUG = process.env.SENTRY_PROJECT || 'escenario89-karaoke';

if (!TOKEN) {
  console.log('========================================================================');
  console.log('🔑 FALTA EL TOKEN DE AUTENTICACIÓN DE SENTRY');
  console.log('========================================================================');
  console.log('Para conectarnos en vivo y descargar todos los eventos actualizados de Sentry:');
  console.log('1. Ve a: https://sentry.io/settings/account/api/auth-tokens/');
  console.log('2. Haz clic en "Create New Token" con permisos: event:read, project:read, org:read');
  console.log('3. Ejecuta:');
  console.log('   node scripts/fetch_sentry_issues.cjs <TU_TOKEN_AQUI>');
  console.log('========================================================================\n');
  process.exit(1);
}

const OUT_EXPORT_FILE = path.resolve(__dirname, '..', 'sentry_logs_export.json');
const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');

async function fetchAllIssues() {
  console.log(`\n🌐 Conectando con Sentry API (Organización: ${ORG_SLUG})...`);
  
  let allIssues = [];
  let nextUrl = `https://sentry.io/api/0/organizations/${ORG_SLUG}/issues/?query=&limit=100`;

  let page = 1;
  while (nextUrl && page <= 20) {
    console.log(`   📄 Descargando página ${page}...`);
    const res = await fetch(nextUrl, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ Error en Sentry API (${res.status}): ${errText}`);
      process.exit(1);
    }

    const issues = await res.json();
    if (!Array.isArray(issues) || issues.length === 0) {
      break;
    }

    allIssues.push(...issues);
    console.log(`      ✓ Obtenidos ${issues.length} incidentes (Total acumulado: ${allIssues.length})`);

    // Revisar encabezado Link para paginación de Sentry
    const linkHeader = res.headers.get('link');
    nextUrl = null;
    if (linkHeader) {
      const links = linkHeader.split(',');
      for (const link of links) {
        // Formato: <url>; rel="next"; results="true"
        if (link.includes('rel="next"') && link.includes('results="true"')) {
          const match = link.match(/<([^>]+)>/);
          if (match) {
            nextUrl = match[1];
          }
        }
      }
    }

    page++;
  }

  console.log(`\n✅ Descarga de Sentry completa: ${allIssues.length} incidentes obtenidos en total.`);
  fs.writeFileSync(OUT_EXPORT_FILE, JSON.stringify(allIssues, null, 2), 'utf8');
  console.log(`💾 Guardado respaldo actualizado en: ${OUT_EXPORT_FILE}\n`);

  // Procesar canciones únicas
  processIssues(allIssues);
}

function processIssues(issues) {
  const songsMap = new Map();

  for (const issue of issues) {
    const texts = [issue.title];
    if (issue.events) {
      for (const ev of issue.events) {
        if (ev.message) texts.push(ev.message);
      }
    }

    for (const text of texts) {
      if (!text) continue;

      let videoId = null;
      let title = null;

      const idMatch = text.match(/\(([a-zA-Z0-9_-]{11})\)/);
      if (idMatch) videoId = idMatch[1];

      const titleQuoteMatch = text.match(/"([^"]+)"/);
      if (titleQuoteMatch) {
        title = titleQuoteMatch[1].trim();
      } else {
        const bMatch = text.match(/\[YouTube Bloqueo \d+\]\s*(.+)$/);
        if (bMatch) title = bMatch[1].trim();
      }

      if (videoId || title) {
        const key = videoId || title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!songsMap.has(key)) {
          songsMap.set(key, {
            videoId,
            title,
            issues: new Set(),
            firstSeen: issue.firstSeen,
            lastSeen: issue.lastSeen,
            count: parseInt(issue.count || '1', 10)
          });
        }
        const item = songsMap.get(key);
        if (videoId && !item.videoId) item.videoId = videoId;
        if (title && !item.title) item.title = title;
        item.issues.add(issue.shortId);
        item.count += parseInt(issue.count || '1', 10);
      }
    }
  }

  const list = Array.from(songsMap.values()).map(x => ({
    ...x,
    issues: Array.from(x.issues)
  }));

  console.log(`🎵 Canciones únicas extraídas de los incidentes de Sentry: ${list.length}`);

  // Revisar cuáles están ya descargadas
  const downloadedFiles = fs.readdirSync(TARGET_DIR);
  const downloadedIds = new Set();
  downloadedFiles.forEach(f => {
    const m = f.match(/\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i);
    if (m) downloadedIds.add(m[1]);
  });

  const missingToDownload = [];
  const alreadyDownloaded = [];

  for (const song of list) {
    if (song.videoId && downloadedIds.has(song.videoId)) {
      alreadyDownloaded.push(song);
    } else if (song.videoId) {
      missingToDownload.push(song);
    }
  }

  console.log(`✅ Ya descargadas en Servidor VIP: ${alreadyDownloaded.length}`);
  console.log(`⏳ Faltantes por descargar: ${missingToDownload.length}`);

  if (missingToDownload.length > 0) {
    console.log('\nListado de canciones pendientes por descargar:');
    missingToDownload.forEach((s, idx) => {
      console.log(`   ${idx + 1}. [${s.videoId}] ${s.title} (${s.count} reportes en Sentry)`);
    });
  } else {
    console.log('🎉 ¡Todas las canciones con ID identificadas en Sentry ya están descargadas en tu disco!');
  }
}

fetchAllIssues().catch(err => {
  console.error('Error general:', err);
});
