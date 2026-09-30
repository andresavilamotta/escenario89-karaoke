const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const https = require('https');
const http = require('http');

const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');
const API_URL = process.env.REPORT_API_URL || 'https://escenario89.andresavila.org/api/report-restricted';

function fetchReportedQueue() {
  return new Promise((resolve, reject) => {
    const client = API_URL.startsWith('https') ? https : http;
    client.get(API_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.queue || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadOne(song) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/watch?v=${song.videoId}`;
    const safeTitle = song.title.replace(/[\\/:*?"<>|]/g, '_').trim();
    const outputTemplate = `${safeTitle} [${song.videoId}].%(ext)s`;

    const args = [
      '--no-js-runtimes',
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      '--extractor-args', 'youtube:player_client=android',
      '-f', '18/b',
      '-o', outputTemplate,
      '--no-playlist',
      '--no-overwrites',
      '--retries', '2',
      '--socket-timeout', '20',
      '--no-mtime',
      url
    ];

    execFile('yt-dlp', args, { cwd: TARGET_DIR }, (err, stdout, stderr) => {
      if (!err) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: (stderr || err.message || '').trim() });
      }
    });
  });
}

async function run() {
  console.log(`=======================================================`);
  console.log(`📥 DESCARGADOR DE CANCIONES RESTRINGIDAS A GOOGLE DRIVE`);
  console.log(`📡 Consultando cola en: ${API_URL}`);
  console.log(`📁 Destino: ${TARGET_DIR}`);
  console.log(`=======================================================\n`);

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  try {
    const queue = await fetchReportedQueue();
    console.log(`Canciones pendientes en cola reportadas por el sistema: ${queue.length}\n`);

    if (queue.length === 0) {
      console.log('✅ No hay canciones pendientes de descarga en este momento.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < queue.length; i++) {
      const song = queue[i];
      process.stdout.write(`[${i + 1}/${queue.length}] Descargando [${song.videoId}] "${song.title}"... `);
      const res = await downloadOne(song);
      if (res.success) {
        console.log('✅ OK');
        successCount++;
      } else {
        console.log(`⚠️ Error: ${res.error.slice(0, 80)}`);
        failCount++;
      }
    }

    console.log(`\n=======================================================`);
    console.log(`Descargas exitosas: ${successCount}`);
    console.log(`Descargas con error: ${failCount}`);
    console.log(`=======================================================`);

    if (successCount > 0) {
      console.log(`\n🔄 Sincronizando catálogo VIP de Google Drive...`);
      require('./sync_drive_catalog.cjs');
    }
  } catch (err) {
    console.error('Error al consultar la cola de canciones reportadas:', err.message);
  }
}

run();
