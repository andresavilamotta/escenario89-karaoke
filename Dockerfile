# ==============================================================================
# Escenario 89 Karaoke - Backend Worker & YouTube Proxy
# Compatible con Render.com, Railway.app, Koyeb, Docker y servidores VPS
# ==============================================================================

FROM node:20-bookworm-slim

# Instalar dependencias esenciales del sistema: Python 3, FFmpeg, Curl, certificados
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias e instalar
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copiar código del backend
COPY server/ ./server/

# Crear carpeta para almacenamiento de canciones descargadas
RUN mkdir -p /app/Canciones_Descargadas

# Variables de entorno por defecto
ENV PORT=3001
ENV NODE_ENV=production
ENV WEBSHARE_API_KEY=bn8qg3zywbviivriuh2mulbmh1h1ng4468xk6t54

EXPOSE 3001

# Iniciar servidor proxy
CMD ["node", "server/src/index.js"]
