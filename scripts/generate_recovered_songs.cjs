const fs = require('fs');
const path = require('path');

const consPath = path.resolve(__dirname, '..', 'canciones_problemas_consolidadas.json');
const catPath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'driveCatalog.json');
const outPath = path.resolve(__dirname, '..', 'client', 'src', 'data', 'recoveredSongs.js');

const cons = JSON.parse(fs.readFileSync(consPath, 'utf8'));
const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));
const catMap = new Map(cat.map(c => [c.videoId, c]));

const recovered = [];
for (const c of cons) {
  if (!c.videoId) continue;
  const inCat = catMap.get(c.videoId);
  recovered.push({
    videoId: c.videoId,
    title: inCat ? inCat.title : c.title,
    author: inCat ? inCat.author : (c.title.includes(' - ') ? c.title.split(' - ')[0].trim() : 'Artista'),
    duration: inCat ? inCat.duration : '3:30',
    seconds: inCat ? inCat.seconds : 210,
    thumbnail: inCat ? inCat.thumbnail : `https://i.ytimg.com/vi/${c.videoId}/hqdefault.jpg`,
    driveFileId: inCat ? inCat.driveFileId : null,
    driveStreamUrl: inCat ? inCat.driveStreamUrl : null,
    videoUrl: inCat ? inCat.videoUrl : null,
    filename: inCat ? inCat.filename : null,
    badge: '👑 Servidor VIP',
    isNative: true,
    isDriveHosted: true,
    totalErrorsSentry: c.totalEvents,
    errorCodes: c.errorCodes || ['150 (Derechos de Autor)']
  });
}

// Ordenar por popularidad/eventos de Sentry descendente
recovered.sort((a, b) => b.totalErrorsSentry - a.totalErrorsSentry);

const jsContent = `// Lista de canciones recuperadas desde incidencias de Sentry y descargadas al Servidor VIP
// Auto-generado para el anuncio especial de Escenario 89 Karaoke

export const RECOVERED_ANNOUNCEMENT_DATE = '2026-09-26';

export const RECOVERED_SONGS = ${JSON.stringify(recovered, null, 2)};
`;

fs.writeFileSync(outPath, jsContent, 'utf8');
console.log(`Guardadas ${recovered.length} canciones en ${outPath}`);
