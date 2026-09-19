const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Directorio exclusivo en Google Drive (Servidor VIP)
const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');
const STATE_FILE = path.resolve(__dirname, 'party_tyme_download_state.json');

// Parámetros de línea de comandos: --file <archivo.json> --limit <N>
const args = process.argv.slice(2);
let inputFile = path.resolve(__dirname, '..', 'lote_medio.json');
let limit = Infinity;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    inputFile = path.resolve(process.cwd(), args[i + 1]);
    i++;
  } else if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[i + 1], 10);
    i++;
  }
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: No existe el archivo de entrada: ${inputFile}`);
  process.exit(1);
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Cargar canciones del lote
const songs = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Cargar o inicializar estado
let state = { completed: {}, failed: {} };
if (fs.existsSync(STATE_FILE)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {}
}

// Identificar archivos ya existentes exclusivamente en Google Drive para máxima idempotencia
const existingIds = new Set();
fs.readdirSync(TARGET_DIR).forEach((file) => {
  const m = file.match(/\[([a-zA-Z0-9_-]{11})\]\.(mp4|webm|mkv)$/i);
  if (m) existingIds.add(m[1]);
});

console.log('====================================================');
console.log('👑 MOTOR DE DESCARGA: SERVIDOR VIP (GOOGLE DRIVE)');
console.log(`📁 Destino: ${TARGET_DIR}`);
console.log(`📄 Lote de entrada: ${path.basename(inputFile)}`);
console.log(`🎵 Total canciones en lista: ${songs.length}`);
console.log(`💾 Archivos ya existentes en Google Drive: ${existingIds.size}`);
if (limit < Infinity) console.log(`⏱️ Límite para esta sesión: ${limit} canciones`);
console.log('====================================================\n');

let processedCount = 0;
let downloadedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (let i = 0; i < songs.length; i++) {
  if (processedCount >= limit) {
    console.log(`\n🛑 Límite de ${limit} canciones alcanzado para esta sesión.`);
    break;
  }

  const song = songs[i];
  const videoId = song.id;
  const title = song.title;

  // Si ya existe en disco, omitir inmediatamente
  if (existingIds.has(videoId)) {
    state.completed[videoId] = { title, completedAt: new Date().toISOString() };
    skippedCount++;
    continue;
  }

  // Si falló repetidamente (2 o más intentos), omitir para no demorar la cola
  if (state.failed && state.failed[videoId] && (state.failed[videoId].attempts || 1) >= 2) {
    skippedCount++;
    continue;
  }

  processedCount++;
  console.log(`\n[${processedCount}/${Math.min(limit, songs.length)}] 📥 Descargando: "${title}" (${videoId})...`);

  const outputTemplate = path.join(TARGET_DIR, '%(title)s [%(id)s].%(ext)s');
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const ytdlpArgs = [
    '--no-playlist',
    '--js-runtimes', 'node',
    '--extractor-args', 'youtube:player_client=android',
    '-f', '22/18/best[ext=mp4]/best',
    '--output', outputTemplate,
    '--no-warnings',
    '--quiet',
    '--no-progress',
    '--retries', '3',
    '--socket-timeout', '30',
    url,
  ];

  const startTime = Date.now();
  const res = spawnSync('yt-dlp', ytdlpArgs, {
    stdio: 'inherit',
    windowsHide: true,
  });

  const durationMs = Date.now() - startTime;

  if (res.status === 0) {
    // Comprobar si el archivo efectivamente se creó
    const files = fs.readdirSync(TARGET_DIR);
    const downloadedFile = files.find((f) => f.includes(`[${videoId}]`));
    if (downloadedFile) {
      console.log(`✅ Completado en ${(durationMs / 1000).toFixed(1)}s: "${title}"`);
      existingIds.add(videoId);
      state.completed[videoId] = { title, completedAt: new Date().toISOString() };
      delete state.failed[videoId];
      downloadedCount++;
    } else {
      console.warn(`⚠️ Advertencia: yt-dlp finalizó con código 0 pero no se encontró el archivo con ID [${videoId}]`);
    }
  } else {
    console.error(`❌ Error al descargar (${videoId}): Código ${res.status}`);
    const prevAttempts = (state.failed[videoId] && state.failed[videoId].attempts) || 0;
    state.failed[videoId] = {
      title,
      failedAt: new Date().toISOString(),
      errorCode: res.status,
      attempts: prevAttempts + 1,
    };
    errorCount++;
  }

  // Guardar estado
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');

  // Sincronizar catálogo cada 25 canciones descargadas
  if (downloadedCount > 0 && downloadedCount % 25 === 0) {
    console.log(`\n🔄 [Auto-Sync] Sincronizando catálogo en Google Drive (${downloadedCount} temas nuevos)...`);
    spawnSync('node', [path.resolve(__dirname, 'sync_drive_catalog.cjs')], { stdio: 'ignore' });
  }

  // Pausa de cortesía entre descargas (1.5s - 2.5s) para evitar bloqueo de IP
  const pauseMs = 1500 + Math.floor(Math.random() * 1000);
  spawnSync('node', ['-e', `setTimeout(()=>{}, ${pauseMs})`]);
}

// Sincronización final del catálogo
console.log('\n🔄 Ejecutando sincronización final del catálogo en Google Drive...');
spawnSync('node', [path.resolve(__dirname, 'sync_drive_catalog.cjs')], { stdio: 'inherit' });

console.log('\n====================================================');
console.log('🏁 RESUMEN DE LA SESIÓN:');
console.log(`✨ Descargadas exitosamente: ${downloadedCount}`);
console.log(`⏩ Omitidas (ya existían): ${skippedCount}`);
console.log(`❌ Con error: ${errorCount}`);
console.log(`📂 Total en Canciones_Descargadas: ${existingIds.size}`);
console.log('====================================================');
