import React, { useState, useEffect } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw, SkipForward, X, Disc3, ShieldAlert, Sparkles, CheckCircle, Crown, Download, Check } from 'lucide-react';
import { searchDriveCatalog, findDriveTrackByVideoId } from '../data/driveCatalog';
import { buildBackendUrl } from '../utils/backendUrl';

export default function TrackAlertModal({
  isOpen,
  track,
  isCurrentTrack = false,
  reason = '',
  onClose,
  onReplaceTrack,
  onOpenDirectYouTube,
  onSkipTrack,
}) {
  const [alternatives, setAlternatives] = useState([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null); // null | 'queued' | 'downloading'

  useEffect(() => {
    if (!isOpen || !track) {
      setAlternatives([]);
      setIsLoadingAlternatives(false);
      setSearchFailed(false);
      setDownloadStatus(null);
      return;
    }

    setDownloadStatus(null);

    const fetchAlternatives = async () => {
      setIsLoadingAlternatives(true);
      setSearchFailed(false);

      try {
        const cleanTitle = (track.title || '')
          .replace(/\(Karaoke.*?\)/gi, '')
          .replace(/\[Karaoke.*?\]/gi, '')
          .replace(/\(Official.*?\)/gi, '')
          .replace(/\(Lyrics.*?\)/gi, '')
          .replace(/\(Video.*?\)/gi, '')
          .replace(/\[Video.*?\]/gi, '')
          .trim();

        // 1. PRIORIDAD MÁXIMA: Buscar en el catálogo de Servidor VIP (Google Drive)
        const exactDrive = findDriveTrackByVideoId(track.videoId);
        const driveMatches = exactDrive ? [exactDrive] : searchDriveCatalog(cleanTitle, 3);
        const driveAlternatives = driveMatches.map((dm) => ({
          videoId: dm.videoId,
          driveFileId: dm.driveFileId,
          title: dm.title,
          author: dm.author,
          duration: dm.duration,
          seconds: dm.seconds,
          thumbnail: dm.thumbnail,
          isNative: true,
          isDriveHosted: true,
          badge: '👑 Servidor VIP',
          driveStreamUrl: dm.driveStreamUrl || `/api/stream?id=${dm.driveFileId}`,
          videoUrl: dm.driveStreamUrl || `/api/stream?id=${dm.driveFileId}`,
          embeddable: true,
        }));

        // 2. Buscar versiones con letra (Lyrics) o Karaoke alternativo en YouTube
        let ytList = [];
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(cleanTitle)}&mode=lyrics`);
          if (res.ok) {
            const data = await res.json();
            ytList = (data.results || []).filter(
              (v) => v.videoId !== track.videoId && v.embeddable !== false
            );
          }
        } catch (e) {}

        if (ytList.length === 0) {
          try {
            const fallbackRes = await fetch(`/api/search?q=${encodeURIComponent(cleanTitle)}&mode=karaoke`);
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              ytList = (fallbackData.results || []).filter(
                (v) => v.videoId !== track.videoId && v.embeddable !== false
              );
            }
          } catch (e) {}
        }

        // Combinar: primero las opciones de Google Drive VIP, luego las de YouTube
        const combined = [
          ...driveAlternatives,
          ...ytList.filter((yt) => !driveAlternatives.some((d) => d.videoId === yt.videoId)),
        ];

        setAlternatives(combined.slice(0, 5));
      } catch (err) {
        console.warn('Error buscando alternativas:', err);
        setSearchFailed(true);
      } finally {
        setIsLoadingAlternatives(false);
      }
    };

    fetchAlternatives();
  }, [isOpen, track]);

  const handleTriggerDownload = async () => {
    if (!track?.videoId) return;
    setDownloadStatus('queued');
    try {
      // 1. Notificar a Vercel backend
      await fetch('/api/report-restricted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: track.videoId,
          title: track.title,
          errorCode: 150,
          rescued: false,
        }),
      });

      // 2. Intentar notificar al servidor backend (local o en la nube) para descarga inmediata si está activo
      try {
        const localRes = await fetch(buildBackendUrl('/api/download-restricted'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: track.videoId,
            title: track.title,
          }),
        });
        if (localRes.ok) {
          setDownloadStatus('downloading');
          return;
        }
      } catch (e) {}

      setDownloadStatus('queued');
    } catch (e) {
      console.warn('Error al solicitar descarga:', e);
    }
  };

  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none font-['Outfit',sans-serif]">
      <div 
        className="relative w-full max-w-2xl bg-[#14120F] border border-red-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-[#332C22]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk',sans-serif]">
                  Alerta: Pista con Restricción de YouTube
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                  {isCurrentTrack ? 'En Escenario' : 'En la Cola'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {reason || 'YouTube bloqueó la inserción por derechos de autor (LatinAutor / UMPG / Error 150)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#201C16] border border-transparent hover:border-[#332C22] transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ficha de la Canción Afectada */}
        <div className="my-4 p-3.5 rounded-xl bg-[#201C16]/90 border border-[#332C22] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black border border-[#332C22] flex-shrink-0">
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
                }}
              />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-slate-100 truncate font-['Space_Grotesk',sans-serif]" title={track.title}>
                {track.title}
              </h4>
              <p className="text-xs text-amber-200/70 truncate">{track.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Botón para solicitar/iniciar descarga en segundo plano al Servidor VIP */}
            <button
              type="button"
              onClick={handleTriggerDownload}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer ${
                downloadStatus
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/70'
                  : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60'
              }`}
              title="Descargar esta pista al Servidor VIP para reproducirla sin restricciones"
            >
              {downloadStatus === 'downloading' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span>Descargando...</span>
                </>
              ) : downloadStatus === 'queued' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Encolada para Servidor VIP</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Descargar al Servidor VIP</span>
                </>
              )}
            </button>

            {/* Botón directo para abrir en YouTube Oficial */}
            <button
              type="button"
              onClick={() => onOpenDirectYouTube && onOpenDirectYouTube(track.videoId)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Abrir este video original directamente en YouTube Web para escucharlo"
            >
              <ExternalLink className="w-3.5 h-3.5 text-red-400" />
              <span>Abrir en YouTube Web</span>
            </button>
          </div>
        </div>

        {/* Sección de Versiones Alternativas Compatibles */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider font-['Space_Grotesk',sans-serif]">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Versiones Alternativas Compatibles (1-Clic)
            </div>
            {isLoadingAlternatives && (
              <span className="text-xs text-amber-300/80 flex items-center gap-1.5">
                <Disc3 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                Buscando pistas...
              </span>
            )}
          </div>

          {isLoadingAlternatives ? (
            <div className="p-8 rounded-xl bg-[#090807]/50 border border-[#201C16] flex flex-col items-center justify-center text-center">
              <Disc3 className="w-8 h-8 text-amber-400 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-200">Localizando versiones compatibles sin restricción...</p>
              <p className="text-xs text-slate-400 mt-1">Filtrando automáticamente por pistas que permitan inserción externa.</p>
            </div>
          ) : alternatives.length > 0 ? (
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <div
                  key={alt.videoId || alt.driveFileId}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition group ${
                    alt.isDriveHosted
                      ? 'bg-[#1a140a] hover:bg-[#251d0e] border border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                      : 'bg-[#090807]/60 hover:bg-[#201C16] border border-[#332C22] hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-10 rounded overflow-hidden bg-black border border-[#332C22] flex-shrink-0">
                      <img
                        src={alt.thumbnail}
                        alt={alt.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-amber-300 transition-colors" title={alt.title}>
                          {alt.title}
                        </h5>
                        {alt.isDriveHosted && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            Servidor VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="truncate">{alt.author}</span>
                        <span>•</span>
                        <span className="font-mono text-amber-200/80">{alt.duration}</span>
                        {alt.isDriveHosted && (
                          <span className="text-[10px] text-emerald-400 font-medium hidden sm:inline">
                            • Sin anuncios ni bloqueos
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReplaceTrack && onReplaceTrack(alt)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition active:scale-95 shadow flex-shrink-0 ${
                      alt.isDriveHosted
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black'
                    }`}
                  >
                    {alt.isDriveHosted ? <Crown className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    <span>{alt.isDriveHosted ? 'Usar Servidor VIP' : 'Usar Esta Versión'}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#090807]/50 border border-[#201C16] text-center">
              <p className="text-xs text-slate-400">
                {searchFailed
                  ? 'No se pudieron consultar alternativas en este momento.'
                  : 'No se encontraron versiones alternativas automáticas inmediatas.'}
              </p>
              <p className="text-xs text-amber-200/70 mt-1">
                Puedes abrir el video directamente en YouTube Web o pasar al siguiente tema.
              </p>
            </div>
          )}
        </div>

        {/* Acciones del Pie */}
        <div className="pt-4 mt-4 border-t border-[#332C22] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onSkipTrack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#201C16] hover:bg-slate-800 text-slate-300 hover:text-white border border-[#332C22] text-xs font-semibold transition active:scale-95"
          >
            <SkipForward className="w-4 h-4 text-amber-400" />
            <span>{isCurrentTrack ? 'Saltar Canción' : 'Quitar de la Cola'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#201C16] hover:bg-[#332C22] text-slate-300 text-xs font-semibold border border-[#332C22] transition active:scale-95"
          >
            Cerrar Alerta
          </button>
        </div>
      </div>
    </div>
  );
}
