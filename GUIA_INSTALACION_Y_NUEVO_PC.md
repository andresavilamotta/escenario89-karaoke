# 🎤 Guía de Instalación, Despliegue y Arquitectura en un Nuevo PC
## Sistema de Karaoke Dual-Screen con Servidor de Streaming Local • Escenario 89

Esta guía está diseñada para que cualquier persona, desarrollador o técnico pueda configurar, entender y ejecutar este sistema de Karaoke en un **nuevo computador desde cero**, comprendiendo a fondo cómo funciona la arquitectura de **streaming local de videos** para evitar bloqueos de YouTube.

---

## 📑 Tabla de Contenidos
1. [¿Qué es este proyecto y qué problema resuelve?](#1-qué-es-este-proyecto-y-qué-problema-resuelve)
2. [Requisitos Previos en el Nuevo PC](#2-requisitos-previos-en-el-nuevo-pc)
3. [Paso a Paso: Instalación y Puesta en Marcha](#3-paso-a-paso-instalación-y-puesta-en-marcha)
4. [Estructura del Proyecto y Dónde van los Archivos](#4-estructura-del-proyecto-y-dónde-van-los-archivos)
5. [Arquitectura Técnica de la Implementación](#5-arquitectura-técnica-de-la-implementación)
   - [A. Dónde se guardan los videos locales](#a-dónde-se-guardan-los-videos-locales)
   - [B. Backend: Servidor de Streaming HTTP 206](#b-backend-servidor-de-streaming-http-206)
   - [C. Catálogo y Búsqueda en el Frontend](#c-catálogo-y-búsqueda-en-el-frontend)
   - [D. Reproductor Dual en Pantalla de Proyección (DisplayView)](#d-reproductor-dual-en-pantalla-de-proyección-displayview)
6. [Cómo Agregar Nuevas Canciones Descargadas en el Futuro](#6-cómo-agregar-nuevas-canciones-descargadas-en-el-futuro)
7. [Configuración de Doble Pantalla en el Evento](#7-configuración-de-doble-pantalla-en-el-evento)
8. [Resolución de Problemas Frecuentes (Troubleshooting)](#8-resolución-de-problemas-frecuentes-troubleshooting)

---

## 1. ¿Qué es este proyecto y qué problema resuelve?

### El Sistema Dual-Screen
Es una aplicación web diseñada para discotecas, bares o eventos donde se requiere:
- **Pantalla 1 (Operador / DJ en `http://localhost:5173/`)**: Consola privada de control donde el operador busca canciones, organiza la cola, salta temas, controla volumen y supervisa el estado.
- **Pantalla 2 (Display / Clientes en `http://localhost:5173/display`)**: Pantalla limpia a pantalla completa conectada a un proyector o televisor para los clientes, sin botones ni menús, con carátulas, tipografía neón y letras de karaoke sincronizadas.
- **Sincronización**: Utiliza la API nativa de JavaScript `BroadcastChannel` (`karaoke_sync_channel`), lo que permite que ambas pestañas se comuniquen en el mismo navegador sin depender de internet ni de servidores WebSocket externos.

### El Problema de YouTube (Errores 150 y 101)
Originalmente, la aplicación reproducía todas las pistas mediante el reproductor embebido de YouTube (`react-youtube`). Sin embargo, muchas discográficas bloquean la inserción de canciones populares en sitios web externos:
- **Error 150 / 101**: *"El propietario del video ha inhabilitado la reproducción en otros sitios web"*.
- Ocurría en temas clásicos infaltables: Juan Gabriel (*"Querida"*), Vicente Fernández (*"Volver Volver"*, *"La Derrota"*), José José (*"El Triste"*), Galy Galiano (*"La Cita"*), Adriana Lucía (*"Cedro"*), etc.

### La Solución Implementada: Streaming Local en Disco SSD
Para no saturar ni pagar almacenamiento en la nube (la capa gratuita de Supabase Storage solo ofrece 1 GB y las 32 canciones descargadas ocupan 1.17 GB), se implementó una **arquitectura híbrida**:
1. Las canciones con restricción se descargan en formato MP4 y se almacenan en el disco físico del equipo.
2. El servidor Express local transmite los videos por streaming con soporte de `HTTP Range Requests (206)`.
3. El frontend identifica estas canciones con la insignia:
   $$\mathbf{✅\ Descargada\ en\ Servidor}$$
4. En la pantalla del cliente (`DisplayView`), el video se reproduce a través de la etiqueta nativa HTML5 `<video>`: **sin anuncios, sin buffering y 100% inmune a bloqueos de YouTube**.

---

## 2. Requisitos Previos en el Nuevo PC

Antes de iniciar, asegúrate de tener instalado en el computador:

1. **Node.js**: Versión LTS recomendada (**v18.x, v20.x o superior**).
   - Descargar desde: [nodejs.org](https://nodejs.org/)
   - Verifica en terminal ejecutando: `node -v` y `npm -v`.
2. **Navegador Web Moderno**: Google Chrome, Microsoft Edge o Brave (recomendados por compatibilidad con pantalla completa y aceleración gráfica por hardware).
3. *(Opcional, solo si vas a descargar más videos en el futuro)*:
   - **Python 3.10+**: [python.org](https://www.python.org/)
   - **yt-dlp**: Instalable mediante `pip install yt-dlp` o descargando el ejecutable `.exe`.
   - **ffmpeg**: Para el empaquetado de video/audio en MP4.

---

## 3. Paso a Paso: Instalación y Puesta en Marcha

### Paso 1: Copiar o Clonar la Carpeta del Proyecto
Copia la carpeta completa del proyecto al disco local del nuevo computador (por ejemplo en `C:\Karaoke` o en tu carpeta de usuario).
> ⚠️ **RECOMENDACIÓN CRÍTICA**: Evita colocar el proyecto dentro de carpetas virtuales de Google Drive para Escritorio o OneDrive que tengan la sincronización activa, ya que el motor de sincronización puede bloquear temporalmente archivos de `node_modules` durante la lectura.

### Paso 2: Ubicar los Videos Descargados (.mp4)
El sistema está configurado para detectar los videos automáticamente en cualquiera de estas dos ubicaciones:

* **Opción A (Recomendada y Predeterminada de Windows):**
  Copia la carpeta de videos a la carpeta estándar de Windows:
  ```
  C:\Users\<Tu_Usuario>\Videos\Canciones_Descargadas\
  ```
* **Opción B (Portátil dentro del proyecto):**
  Coloca la carpeta `Canciones_Descargadas` directamente en la raíz del proyecto:
  ```
  APP Karaoke/Canciones_Descargadas/
  ```

### Paso 3: Instalar Dependencias de Node
Abre una terminal (PowerShell o CMD) y ejecuta la instalación en ambas partes del proyecto:

1. **Dependencias del Servidor Backend**:
   ```bash
   cd server
   npm install
   ```
2. **Dependencias del Cliente Frontend**:
   ```bash
   cd ../client
   npm install
   ```

### Paso 4: Iniciar el Sistema (Un solo Clic)
En la raíz del proyecto encontrarás el archivo:
```cmd
start.bat
```
Haz **doble clic en `start.bat`**. Este script automatiza todo el arranque:
1. Inicia el servidor backend en una ventana de consola en el puerto `3001`.
2. Inicia el servidor frontend Vite en otra ventana de consola en el puerto `5173`.
3. Abre automáticamente tu navegador predeterminado en `http://localhost:5173/`.

---

## 4. Estructura del Proyecto y Dónde van los Archivos

```
APP Karaoke/
├── Canciones_Descargadas/          <-- Carpeta de videos MP4 local (Opción B)
│   ├── Juan Gabriel - Querida (Versión Karaoke) [vNfNjG5Q6FU].mp4
│   ├── VOLVER VOLVER - VICENTE FERNANDEZ KARAOKE [G318F12R6pU].mp4
│   └── ... (32 archivos .mp4)
│
├── server/                         <-- Backend Node.js / Express
│   ├── src/
│   │   └── index.js                # API Proxy yt-search y Streaming /api/videos/:filename
│   └── package.json
│
├── client/                         <-- Frontend React 19 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── data/
│   │   │   ├── serverCatalog.js    # Catálogo exportado en JS con helpers de búsqueda
│   │   │   └── serverCatalog.json  # Base de datos cruda de las 32 canciones descargadas
│   │   ├── views/
│   │   │   ├── OperatorView.jsx    # Búsqueda híbrida, cola y control de transporte
│   │   │   └── DisplayView.jsx     # Reproductor Dual (HTML5 <video> o YouTube IFrame)
│   │   ├── components/
│   │   │   ├── SearchResults.jsx   # Tarjetas con insignia "✅ Descargada en Servidor"
│   │   │   └── QueueManager.jsx    # Indicadores de pista local en cola
│   │   └── hooks/
│   │       └── useKaraokeSync.js   # Sincronización BroadcastChannel entre pestañas
│   ├── vite.config.js              # Proxy /api hacia http://127.0.0.1:3001
│   └── package.json
│
├── start.bat                       # Lanzador general para Windows
└── GUIA_INSTALACION_Y_NUEVO_PC.md  # Este manual
```

---

## 5. Arquitectura Técnica de la Implementación

### A. Dónde se guardan los videos locales
En `server/src/index.js` existe la función `resolveLocalVideoPath(filename)` que evalúa las rutas con la siguiente precedencia:
1. `C:\Users\<Usuario>\Videos\Canciones_Descargadas\<archivo>` (Disco local físico del usuario).
2. `../Canciones_Descargadas/<archivo>` (Ruta relativa desde el servidor).
3. `Canciones_Descargadas/<archivo>` (Ruta relativa desde la raíz).

Si el archivo existe en cualquiera de estas rutas, se entrega inmediatamente.

### B. Backend: Servidor de Streaming HTTP 206
El endpoint en `server/src/index.js`:
```javascript
app.get('/api/videos/:filename', (req, res) => {
  const filePath = resolveLocalVideoPath(req.params.filename);
  if (!filePath) {
    return res.status(404).json({ error: 'Video no encontrado en el almacenamiento local.' });
  }

  // res.sendFile soporta automáticamente HTTP Range Requests (Código 206 Partial Content)
  res.sendFile(filePath, { acceptRanges: true });
});
```
* **¿Por qué HTTP Range (206)?**
  Cuando el usuario hace clic en el segundo 45 de una canción de 5 minutos, el navegador no necesita descargar los 30 MB del video. Solo envía la cabecera `Range: bytes=10485760-...` y el servidor responde únicamente con ese fragmento. Esto garantiza **reproducción instantánea y bajo consumo de memoria RAM**.

### C. Catálogo y Búsqueda en el Frontend
El archivo `client/src/data/serverCatalog.js` contiene los metadatos de cada canción descargada:
```javascript
{
  id: "server_vNfNjG5Q6FU",
  videoId: "vNfNjG5Q6FU",
  filename: "Juan Gabriel - Querida (Versión Karaoke) [vNfNjG5Q6FU].mp4",
  title: "Juan Gabriel - Querida (Versión Karaoke)",
  author: "Juan Gabriel",
  duration: "5:43",
  seconds: 343,
  thumbnail: "https://i.ytimg.com/vi/vNfNjG5Q6FU/hqdefault.jpg",
  isNative: true,
  isServerHosted: true,
  badge: "✅ Descargada en Servidor",
  videoUrl: "/api/videos/Juan%20Gabriel%20-%20Querida..."
}
```

En `OperatorView.jsx`:
1. Cuando el operador escribe en el buscador (ejemplo: *"Querida"*), se ejecuta `searchServerCatalog(query)`.
2. Las pistas coincidentes del servidor se colocan **al inicio de la lista de resultados** con resplandor verde.
3. **Auto-intercepción por ID**: Si el operador pega un link directo de YouTube o hace clic en un resultado de la búsqueda en línea de YouTube cuyo `videoId` ya está descargado en el servidor, el sistema lo sustituye automáticamente por el archivo local.

### D. Reproductor Dual en Pantalla de Proyección (`DisplayView.jsx`)
En `DisplayView.jsx`, cuando la pista actual (`currentTrack`) tiene la bandera `isServerHosted: true`:
```jsx
{currentTrack.isServerHosted ? (
  <div className="relative w-full h-full flex items-center justify-center bg-black">
    {/* Banner estético de Servidor Local */}
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1.5 rounded-full text-emerald-300 text-xs font-semibold backdrop-blur">
      <Server className="w-3.5 h-3.5 animate-pulse" />
      <span>Pista en Servidor Local • Escenario 89</span>
    </div>

    {/* Reproductor HTML5 Nativo con Streaming HTTP 206 */}
    <video
      ref={nativeVideoRef}
      src={currentTrack.videoUrl}
      controls
      autoPlay
      playsInline
      className="w-full h-full max-h-screen object-contain"
      onEnded={handleVideoEnded}
      onTimeUpdate={handleNativeTimeUpdate}
      onError={handleNativeVideoError}
    />
  </div>
) : (
  /* Reproductor estándar IFrame de YouTube */
  <YouTube ... />
)}
```

---

## 6. Cómo Agregar Nuevas Canciones Descargadas en el Futuro

Si en el futuro detectas una nueva canción que tiene restricciones en YouTube (Error 150), puedes incorporarla al catálogo en 3 pasos sencillos:

### Paso 1: Descargar el video en MP4 con `yt-dlp`
Abre tu consola y ejecuta el siguiente comando reemplazando el enlace:
```bash
yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --merge-output-format mp4 -o "%(title)s [%(id)s].%(ext)s" "https://www.youtube.com/watch?v=VIDEO_ID"
```

### Paso 2: Mover el archivo a la carpeta de canciones
Mueve el archivo `.mp4` generado a:
`C:\Users\<Tu_Usuario>\Videos\Canciones_Descargadas\`
*(O dentro de `APP Karaoke/Canciones_Descargadas/`)*.

### Paso 3: Registrar la canción en `client/src/data/serverCatalog.js`
Abre `client/src/data/serverCatalog.js` y agrega un nuevo objeto al array `SERVER_CATALOG_RAW`:
```javascript
{
  "id": "server_VIDEO_ID",
  "videoId": "VIDEO_ID",
  "filename": "Nombre Exacto Del Archivo [VIDEO_ID].mp4",
  "storageKey": "Nombre%20Exacto%20Del%20Archivo%20%5BVIDEO_ID%5D.mp4",
  "title": "Nombre de la Canción - Artista",
  "author": "Nombre del Artista",
  "duration": "3:45",
  "thumbnail": "https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg",
  "isNative": true,
  "isServerHosted": true,
  "badge": "✅ Descargada en Servidor",
  "description": "Pista de video MP4 alojada en servidor de alta velocidad.",
  "seconds": 225
}
```
¡Listo! Al guardar el archivo, la canción aparecerá de inmediato en el buscador con la insignia verde y se reproducirá desde el disco local.

---

## 7. Configuración de Doble Pantalla en el Evento

Para operar en vivo en el bar o evento:

1. Conecta el cable HDMI del televisor o proyector al computador.
2. En Windows, presiona las teclas `Windows + P` y selecciona **"Extender"** (no duplicar).
3. Ejecuta `start.bat`.
4. En la pantalla principal del operador (`http://localhost:5173/`), haz clic en el botón morado:
   **"Abrir Pantalla de Proyección"**.
5. Se abrirá una ventana emergente en `http://localhost:5173/display`.
6. Arrastra esa ventana al monitor del televisor o proyector y presiona la tecla `F11` para pantalla completa.
7. En la pantalla del operador verás el indicador verde: `Display Conectado`.
8. ¡El sistema está listo para cantar!

---

## 8. Resolución de Problemas Frecuentes (Troubleshooting)

### A. Puerto 3001 o 5173 ya está en uso
Si al ejecutar `start.bat` sale un error de puerto ocupado:
- Abre PowerShell y escribe:
  ```powershell
  Get-Process -Name node | Stop-Process -Force
  ```
- Luego vuelve a hacer doble clic en `start.bat`.

### B. El video sale como "Video no encontrado (404)"
- Asegúrate de que el nombre del archivo en el disco coincida **exactamente carácter por carácter** con la propiedad `"filename"` en `serverCatalog.js`.
- Comprueba que el archivo esté en `C:\Users\<Tu_Usuario>\Videos\Canciones_Descargadas` o en la carpeta `Canciones_Descargadas` del proyecto.

### C. La pantalla de proyección no se sincroniza con la del operador
- Asegúrate de abrir ambas vistas en el **mismo navegador** (por ejemplo, ambas en Google Chrome).
- Como la sincronización usa `BroadcastChannel`, funciona entre pestañas o ventanas del mismo navegador en la misma máquina sin necesidad de internet.

---

**Escenario 89 Karaoke Pro** • Sistema optimizado para alto rendimiento, cero buffering y máxima estabilidad en vivo.
