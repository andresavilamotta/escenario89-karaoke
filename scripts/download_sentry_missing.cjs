const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const TARGET_DIR = path.resolve(__dirname, '..', 'Canciones_Descargadas');

const MISSING_SONGS = [
  { videoId: "hv7HYP-We4g", title: "Vicente Fernández - Volver Volver -1 (Karaoke)" },
  { videoId: "DKhlpSk3Sh8", title: "Banda El Recodo, Sebastián Yatra - Consecuencia De Mis Actos (Letra)" },
  { videoId: "S2QwYV_PTg4", title: "Lenin Ramírez - Todo Lo Fue (Versión Karaoke)" },
  { videoId: "YW-NzfEr1Jc", title: "Joan Sebastian - Ahora Si Va En Serio (Letra)" },
  { videoId: "tqkc8luuF24", title: "Yeison Jiménez - Costumbres (Karaoke)" },
  { videoId: "ZW0m7SwMWMk", title: "Yeison Jiménez - Costumbres Karaoke 2" },
  { videoId: "xVWLmTT2mQM", title: "Vicente Fernández - Yo Quiero Ser Tu Marido" },
  { videoId: "qTTaRm6-7LM", title: "Vicente Fernández - Yo Quiero Ser Tu Marido (Letra)" },
  { videoId: "YvAEmg0auyM", title: "Vicente Fernández - Yo Quiero Ser Tu Marido (Letra 2)" },
  { videoId: "7r3JfBjlyLI", title: "Jean Carlos Centeno - Ayer y Hoy (Karaoke)" },
  { videoId: "MQmkvzYJM7U", title: "Elvis Crespo - Suavemente (Letra)" },
  { videoId: "HVpkzx1f2jg", title: "Grupo Firme - Ya Supérame (Letra)" },
  { videoId: "qZJzHnSHJg4", title: "Alzate x Yeison Jiménez - Mi Venganza (Video Oficial)" },
  { videoId: "bnwhPE_jd9A", title: "Karol G - Amargura (Official Video)" },
  { videoId: "QrI0Mnpzi5g", title: "Maelo Ruiz - Si Supieras (Letra/Lyrics)" },
  { videoId: "dt2lyC92ueE", title: "Maelo Ruiz - Si Supieras (Con Letra)" },
  { videoId: "nicdLMeFhT0", title: "Maelo Ruiz - Si Supieras (Video Oficial)" },
  { videoId: "0rBGjrasBhg", title: "Sonido Mazter - Falsa Traición (Con Letra)" },
  { videoId: "5fIhgWPjXuw", title: "Grupo Explosivo - Falsa Traición" },
  { videoId: "5vLN8OmEIUY", title: "Los Ángeles Azules ft. Natalia Lafourcade - Nunca Es Suficiente (Letra)" },
  { videoId: "PpFk34GDqqc", title: "Los Ángeles Azules ft. Natalia Lafourcade - Nunca Es Suficiente 2" },
  { videoId: "8qHky6jPruE", title: "Paola Jara - Lo Que No Sirve Estorba (Pista)" },
  { videoId: "En-B_Lurkyo", title: "Paola Jara x Chiquis - Lo Que No Sirve Estorba (Video Oficial)" },
  { videoId: "oa27LN8Wxh8", title: "Paola Jara ft Chiquis - Lo Que No Sirve Estorba (Karaoke Demo)" },
  { videoId: "UFG97S-928I", title: "Yeison Jiménez - Aventurero (Instrumental Cumbia-Reggaeton)" },
  { videoId: "fRpkZIaVC1w", title: "Ryan Castro, Kapo & Gangsta - La Villa (Lyrics)" },
  { videoId: "Zh-yT20Kec4", title: "Ryan Castro, Kapo - La Villa (Letra)" },
  { videoId: "Q5BI2ycz0Io", title: "Ryan Castro, Kapo - La Villa (Letra Su Mini Mini)" },
  { videoId: "EochZ-iyrqQ", title: "Ryan Castro, Kapo, Gangsta - La Villa (Video Oficial)" },
  { videoId: "_ce1QuVG5nM", title: "Bad Bunny - Tití Me Preguntó (Letra / Video)" },
  { videoId: "qBUKfQRbzuk", title: "Bad Bunny - Tití Me Preguntó (La Letra)" },
  { videoId: "swObP-ES85E", title: "Bad Bunny - Tití Me Preguntó (Karaoke)" },
  { videoId: "bCrghsy-ZV0", title: "Bad Bunny - Tití Me Preguntó (Instrumental)" },
  { videoId: "lEKL6ZIUZ7g", title: "Luis Miguel - La Incondicional (Karaoke)" },
  { videoId: "mKRDAy707VY", title: "Luis Miguel - La Incondicional (Karaoke 4K)" }
];

function downloadOne(song) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/watch?v=${song.videoId}`;
    const outputTemplate = '%(title)s [%(id)s].%(ext)s';

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
  console.log(`📥 DESCARGA DIRECTA DE LAS 35 CANCIONES DE SENTRY (18 AL 26 DE SEPTIEMBRE)`);
  console.log(`📁 Destino: ${TARGET_DIR}`);
  console.log(`=======================================================\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MISSING_SONGS.length; i++) {
    const song = MISSING_SONGS[i];
    process.stdout.write(`[${i + 1}/${MISSING_SONGS.length}] Descargando [${song.videoId}] ${song.title}... `);
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
}

run();
