/**
 * Catálogo de Videos y Cortinillas Nativas de Escenario 89
 * 
 * Videos alojados localmente en client/public/videos/ y respaldados en la nube (Google Drive)
 * para reproducción nativa HTML5 sin dependencia de YouTube, sin buffering externo y 100% libre de restricciones.
 */

export const NATIVE_VIDEOS = [
  {
    videoId: 'native-escenario89-neon',
    type: 'native',
    isNative: true,
    isDriveHosted: true,
    title: 'Escenario 89 • Neon VIP (Cortinilla Principal)',
    author: 'Escenario 89 Visuals',
    duration: '0:35',
    seconds: 35,
    videoUrl: '/videos/animacion-escenario89-neon.mp4',
    driveFileId: '1i7D_X1H5WJOnIc8roePl7HN9IIjF8U4P',
    driveStreamUrl: '/api/stream?id=1i7D_X1H5WJOnIc8roePl7HN9IIjF8U4P',
    filename: 'animacion-escenario89-neon.mp4',
    thumbnail: '/logo-escenario89.jpg',
    category: 'Cortinilla Principal',
    badge: '✨ Escenario 89 VIP',
    description: 'Visuales neon envolventes ideales para abrir seccionales o momentos estelares del bar.',
  },
  {
    videoId: 'native-cantante-show',
    type: 'native',
    isNative: true,
    isDriveHosted: true,
    title: 'Animación • Cantante en Escenario (Show Live)',
    author: 'Escenario 89 Visuals',
    duration: '0:15',
    seconds: 15,
    videoUrl: '/videos/animacion-cantante-show.mp4',
    driveFileId: '1HoNAq7JjOTdB48MbI8Uv2WK3aob8Fbnx',
    driveStreamUrl: '/api/stream?id=1HoNAq7JjOTdB48MbI8Uv2WK3aob8Fbnx',
    filename: 'animacion-cantante-show.mp4',
    thumbnail: '/logo-escenario89.jpg',
    category: 'Show & Tarima',
    badge: '🎤 Show Live',
    description: 'Animación dinámica para presentar e invitar al próximo cantante a subir a tarima.',
  },
  {
    videoId: 'native-bar-fiesta',
    type: 'native',
    isNative: true,
    isDriveHosted: true,
    title: 'Animación • Fiesta & Karaoke Bar (Ambiente)',
    author: 'Escenario 89 Visuals',
    duration: '0:15',
    seconds: 15,
    videoUrl: '/videos/animacion-bar-fiesta.mp4',
    driveFileId: '1ShE3t3ZR8OCfwFSgXReonXxcYsvcqIIS',
    driveStreamUrl: '/api/stream?id=1ShE3t3ZR8OCfwFSgXReonXxcYsvcqIIS',
    filename: 'animacion-bar-fiesta.mp4',
    thumbnail: '/logo-escenario89.jpg',
    category: 'Fiesta & Rumba',
    badge: '🎉 Fiesta & Brindis',
    description: 'Ambiente festivo y energía para prender al público entre tandas de canciones.',
  },
];
