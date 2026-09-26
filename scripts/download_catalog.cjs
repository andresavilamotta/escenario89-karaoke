const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');
const CATALOG_PATH = path.resolve(__dirname, '..', 'top_500_karaoke_colombia_putumayo.json');
const STATE_PATH = path.resolve(__dirname, 'download_state.json');

// Leer argumentos de línea de comandos (--limit N, --delay MS, --offset N)
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultValue;
}

const LIMIT = parseInt(getArg('--limit', '0'), 10);
const OFFSET = parseInt(getArg('--offset', '0'), 10);
const DELAY_MS = parseInt(getArg('--delay', '1500'), 10);

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

if (!fs.existsSync(CATALOG_PATH)) {
  console.error(`Error: No se encontró el catálogo en ${CATALOG_PATH}`);
  process.exit(1);
}

const songs = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
console.log(`=======================================================`);
console.log(`🎤 SISTEMA DE DESCARGA DE KARAOKE PARA GOOGLE DRIVE`);
console.log(`📁 Directorio destino: ${TARGET_DIR}`);
console.log(`🎶 Canciones en catálogo: ${songs.length}`);
if (LIMIT > 0) console.log(`⏱️ Límite configurado para esta sesión: ${LIMIT} canciones`);
if (OFFSET > 0) console.log(`⏩ Iniciando desde el índice: ${OFFSET}`);
console.log(`=======================================================\n`);

// Mapear archivos ya existentes en la carpeta por videoId
function getExistingVideoIds() {
  const files = fs.readdirSync(TARGET_DIR);
  const map = new Map();
  const idRegex = /\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i;

  for (const file of files) {
    const match = file.match(idRegex);
    if (match) {
      map.set(match[1], file);
    }
  }
  return map;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const { execFile } = require('child_process');

function downloadSong(song) {
  return new Promise((resolve) => {
    const outputTemplate = '%(title)s [%(id)s].%(ext)s';
    const url = `https://www.youtube.com/watch?v=${song.yt_videoId}`;

    // Argumentos optimizados para yt-dlp:
    // Formato 18 (MP4 pre-muxed 360p H.264 + AAC) compatible 100% con HTML5 sin requerir ffmpeg
    const ytDlpArgs = [
      '--no-js-runtimes',
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '--extractor-args', 'youtube:player_client=android',
      '-f', '18/b',
      '-o', outputTemplate,
      '--no-playlist',
      '--no-overwrites',
      '--retries', '3',
      '--socket-timeout', '30',
      '--no-mtime',
      url
    ];

    execFile('yt-dlp', ytDlpArgs, { cwd: TARGET_DIR }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ success: true });
      } else {
        const errDetails = (stderr || error.message || '').trim();
        resolve({ success: false, error: errDetails });
      }
    });
  });
}

async function run() {
  const existingMap = getExistingVideoIds();
  console.log(`Archivos previamente detectados en la carpeta: ${existingMap.size}\n`);

  let targetSongs = songs.slice(OFFSET);
  if (LIMIT > 0) {
    targetSongs = targetSongs.slice(0, LIMIT);
  }

  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  const resultsSummary = [];

  for (let i = 0; i < targetSongs.length; i++) {
    const song = targetSongs[i];
    const globalIdx = OFFSET + i + 1;
    const prefix = `[${globalIdx}/${songs.length}]`;

    // 1. Verificar si ya existe físicamente
    if (existingMap.has(song.yt_videoId)) {
      const existingFile = existingMap.get(song.yt_videoId);
      console.log(`${prefix} ⏩ Ya existe: ${song.artist} - ${song.title} (${existingFile})`);
      skippedCount++;
      resultsSummary.push({ rank: song.rank, id: song.yt_videoId, status: 'already_exists' });
      continue;
    }

    // 2. Descargar canción
    console.log(`${prefix} ⏳ Descargando: "${song.artist} - ${song.title}" (ID: ${song.yt_videoId})...`);
    const res = await downloadSong(song);

    if (res.success) {
      console.log(`${prefix} ✅ Completado exitosamente`);
      downloadedCount++;
      resultsSummary.push({ rank: song.rank, id: song.yt_videoId, status: 'downloaded' });
    } else {
      console.error(`${prefix} ❌ Falló: ${res.error.split('\n')[0]}`);
      failedCount++;
      resultsSummary.push({ rank: song.rank, id: song.yt_videoId, status: 'failed', error: res.error });
    }

    // Guardar estado
    fs.writeFileSync(STATE_PATH, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      downloadedCount,
      skippedCount,
      failedCount,
      totalCatalog: songs.length,
      history: resultsSummary
    }, null, 2));

    // Sincronizar catálogo frontend cada 15 descargas nuevas
    if (downloadedCount > 0 && downloadedCount % 15 === 0) {
      try {
        require('./sync_drive_catalog.cjs');
      } catch (e) {}
    }

    // Pausa de cortesía para no saturar YouTube
    if (i < targetSongs.length - 1) {
      await delay(DELAY_MS);
    }
  }

  // Sincronización final
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/sync_drive_catalog.cjs', { cwd: path.resolve(__dirname, '..') });
  } catch (e) {}

  console.log(`\n=======================================================`);
  console.log(`🏁 RESUMEN DE LA SESIÓN`);
  console.log(`✅ Nuevos descargados: ${downloadedCount}`);
  console.log(`⏩ Omitidos (ya existían): ${skippedCount}`);
  console.log(`❌ Fallidos: ${failedCount}`);
  console.log(`📁 Total en carpeta Canciones_Descargadas: ${getExistingVideoIds().size}`);
  console.log(`=======================================================`);
}

run();
