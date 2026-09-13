# 🎤 Karaoke Pro - Sistema Web Dual-Screen

Aplicación web profesional para gestión de sesiones de Karaoke en modalidad de **Doble Pantalla**:
- **Pantalla de Operador (`/` o `/operator`)**: Consola para el DJ/Operador con buscador inteligente de canciones (consulta directa a YouTube con `yt-search` sin agotar cuotas), gestor interactivo de cola (reordenar, eliminar, reproducir de inmediato), controles de transporte (play, pausa, reinicio, saltar canción, volumen) y monitoreo de estado.
- **Pantalla de Proyección (`/display`)**: Interfaz limpia a pantalla completa para el proyector o segundo monitor, sin menús ni controles visibles (`pointer-events: none`), con pantalla de espera (Standby) con efectos neón cuando no hay canciones, banner animado con fade-out automático a los 5 segundos ("Canción actual" y "A continuación..."), y salto automático ante canciones con restricción de derechos de autor (Errores 101/150).

---

## 🚀 Características Principales

1. **Búsqueda en YouTube sin API Key**:
   - Proxy backend Express que utiliza `yt-search`.
   - Concatena automáticamente el término `"karaoke"` a todas las consultas si no está presente.
   - Debounce automático para optimizar peticiones y sugerencias rápidas.
2. **Sincronización Inter-Ventanas Nativa**:
   - Utiliza la API del navegador `BroadcastChannel` (`karaoke_sync_channel`).
   - Sin dependencias de WebSockets ni servidores externos: latencia cero entre pantallas locales.
   - Heartbeat automático (`PING_DISPLAY` / `PONG_OPERATOR`) para detectar conexión y reconexión en tiempo real.
3. **Manejo Robusto de Casos Borde (Errores 101 / 150)**:
   - Si un video tiene bloqueada la inserción externa en YouTube, la pantalla de proyección notifica al operador y salta automáticamente a la siguiente pista para no interrumpir el evento.
4. **Persistencia Local**:
   - Toda la lista de canciones en cola y el estado de reproducción se guardan en el `localStorage` del navegador.
5. **Estética Dark Neon**:
   - Diseñado con Tailwind CSS, paleta cyberpunk (magenta, violeta, cian, ámbar, verde neón), ecualizador animado y tipografía estilizada.

---

## 🛠️ Estructura del Proyecto

```
APP Karaoke/
├── server/
│   ├── src/
│   │   └── index.js         # Servidor Express proxy con yt-search y /api/health
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SearchBar.jsx        # Input con debounce y auto-karaoke
│   │   │   ├── SearchResults.jsx    # Tarjetas con thumbnails y botón + Añadir
│   │   │   ├── QueueManager.jsx     # Cola reordenable y monitor actual
│   │   │   ├── PlayerControls.jsx   # Play/Pause, Skip, Restart, Volumen y Display
│   │   │   └── StandbyScreen.jsx    # Pantalla estética de espera
│   │   ├── hooks/
│   │   │   └── useKaraokeSync.js    # Hook BroadcastChannel con Heartbeat
│   │   ├── views/
│   │   │   ├── OperatorView.jsx     # Vista de DJ/Operador
│   │   │   └── DisplayView.jsx      # Vista para proyector / monitor 2
│   │   ├── App.jsx                  # Enrutador
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js               # Proxy /api -> localhost:3001
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 💻 Instrucciones de Ejecución

### 1. Iniciar Servidor Backend (Puerto 3001)
```bash
cd server
npm start
```

### 2. Iniciar Cliente Frontend (Puerto 5173)
```bash
cd client
npm run dev
```

### 3. Configuración de Doble Pantalla
1. Abre tu navegador y navega a `http://localhost:5173/`.
2. Haz clic en el botón superior **"Abrir Pantalla de Proyección"**.
3. Se abrirá una nueva ventana en `http://localhost:5173/display`.
4. Arrastra la ventana de `/display` a tu proyector o segundo monitor y presiona `F11` para colocarla en Pantalla Completa.
5. Verifica que en la pantalla del operador aparezca la luz verde de **"Display Conectado"**.
6. ¡Busca tus canciones favoritas y disfruta del karaoke!
