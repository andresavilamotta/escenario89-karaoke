# ==============================================================================
# Escenario 89 Karaoke - Backend Worker & YouTube Proxy (Server Root)
# ==============================================================================

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p /app/Canciones_Descargadas

ENV PORT=3001
ENV NODE_ENV=production
ENV WEBSHARE_API_KEY=bn8qg3zywbviivriuh2mulbmh1h1ng4468xk6t54

EXPOSE 3001

CMD ["node", "src/index.js"]
