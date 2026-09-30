# 🚀 Despliegue del Backend Worker 24/7 en la Nube (Sin PC Local)

Este backend worker se encarga de:
1. **Evadir el bloqueo de YouTube (Error 150/403/Bot Detection)** usando la rotación automática de proxies residenciales/datacenter con la API de Webshare.
2. **Descargar canciones en segundo plano** directamente a la nube.
3. **Extraer streams directos en ~3 segundos** (`/api/stream-direct`) para que el Display pueda reproducir canciones restringidas de YouTube sin esperas.
4. **Funcionar 24/7** sin necesidad de tener encendida la computadora en el bar ni ejecutar `start.bat`.

---

## Opción 1: Despliegue Gratuito en Render.com (Recomendado - 2 minutos)

1. Ve a **[render.com](https://render.com/)** e inicia sesión con tu cuenta de **GitHub**.
2. Haz clic en el botón azul **"New +"** y selecciona **"Web Service"**.
3. Elige tu repositorio: `anders2D/escenario89-karaoke`.
4. Render detectará automáticamente el archivo `Dockerfile`. Configura únicamente:
   - **Name**: `escenario89-karaoke-backend`
   - **Region**: Oregon (US West) o Frankfurt (EU Central)
   - **Instance Type**: **Free**
   - **Environment Variables**:
     - `WEBSHARE_API_KEY`: `bn8qg3zywbviivriuh2mulbmh1h1ng4468xk6t54`
     - `PORT`: `3001`
5. Haz clic en **"Create Web Service"**.
6. En 2 minutos tendrás una URL pública HTTPS, por ejemplo:
   `https://escenario89-karaoke-backend.onrender.com`

---

## Conexión con tu Frontend en Vercel

Una vez que Render te dé tu URL:
1. Abre tu panel de **Vercel** (`escenario89.andresavila.org`).
2. Ve a **Settings** > **Environment Variables**.
3. Agrega la variable:
   - **Key**: `VITE_BACKEND_URL`
   - **Value**: `https://escenario89-karaoke-backend.onrender.com` (la URL de tu Render sin barra al final).
4. Haz clic en **Redeploy** en Vercel.

¡Listo! A partir de ese momento, tanto la pantalla Display como la pantalla Operador se comunicarán directamente con tu Worker en la nube 24/7, sin importar si tu PC está prendida o apagada.

---

## Endpoints Disponibles en el Backend

- `GET /api/health` -> Chequeo de salud del servicio.
- `GET /api/proxies/status` -> Lista los proxies activos cargados desde Webshare y sus países.
- `GET /api/stream-direct?v=VIDEO_ID&redirect=true` -> Extrae la URL directa de video MP4 de YouTube en ~3 segundos y redirige para reproducción nativa inmediata.
- `POST /api/download-restricted` -> Inicia descarga en segundo plano hacia el servidor usando proxy rotativo.
- `GET /api/download-status?v=VIDEO_ID` -> Consulta si una canción ya terminó de descargarse.
