import React from 'react';
import { Trash2, ChevronUp, ChevronDown, ListMusic, Clock, Disc, PlayCircle, ExternalLink, Square, CheckCircle, AlertTriangle, Loader2, ShieldAlert, Sparkles, Film, Check, Server, Cloud, Crown, Video, RefreshCw } from 'lucide-react';

export default function QueueManager({
  currentTrack,
  queue = [],
  isPlaying = false,
  volume = 80,
  isDisplayConnected = false,
  validationMap = {},
  downloadProgressMap = {},
  restartCounter = 0,
  onRemoveTrack,
  onRemoveCurrentTrack,
  onMoveUp,
  onMoveDown,
  onPlayNow,
  onClearQueue,
  onOpenDirectYouTube,
  onOpenAlertModal,
  onStartDownload,
  onResolveAlternative,
  onTrackEnded,
}) {
  return (
    <div className="flex flex-col h-full bg-[#14120F]/90 rounded-2xl border border-[#332C22] p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#201C16]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
              Cola del Escenario
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#201C16] text-amber-300 border border-[#332C22]">
                {queue.length} {queue.length === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">Orden de reproducción para el proyector</p>
          </div>
        </div>

        {queue.length > 0 && (
          <button
            onClick={onClearQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#201C16] hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-[#332C22] hover:border-red-800/50 text-xs font-medium transition cursor-pointer"
            title="Vaciar toda la cola"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {/* Track Actual */}
      <div className="my-4">
        <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center justify-between font-['Space_Grotesk',sans-serif]">
          <div className="flex items-center gap-1.5">
            <Disc className={`w-3.5 h-3.5 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            <span>En Escenario Ahora</span>
          </div>
        </div>

        {currentTrack ? (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/40 p-3.5 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-[#332C22]">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = `https://i.ytimg.com/vi/${currentTrack.videoId}/hqdefault.jpg`;
                  }}
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/50 flex items-end justify-center gap-1 p-1">
                    <span className="w-1 bg-amber-400 rounded-t eq-bar-1 h-3/4"></span>
                    <span className="w-1 bg-yellow-300 rounded-t eq-bar-2 h-full"></span>
                    <span className="w-1 bg-amber-500 rounded-t eq-bar-3 h-2/4"></span>
                    <span className="w-1 bg-amber-200 rounded-t eq-bar-4 h-5/6"></span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isPlaying 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {isPlaying ? 'Al Aire' : 'En Pausa'}
                  </span>

                  {currentTrack.isDriveHosted || currentTrack.isServerHosted || (currentTrack.badge && currentTrack.badge.includes('VIP')) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-sm">
                      <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                      👑 Servidor VIP (Karaoke)
                    </span>
                  ) : currentTrack.isNative ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm">
                      <Film className="w-3 h-3 text-purple-400" />
                      Cortinilla Nativa
                    </span>
                  ) : (currentTrack.badge && currentTrack.badge.includes('Original')) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-sky-500/25 text-sky-300 border border-sky-500/40 shadow-sm">
                      <Video className="w-3 h-3 text-sky-400" />
                      🎬 Video Original (Baile)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700 shadow-sm">
                      {currentTrack.badge || '📺 YouTube'}
                    </span>
                  )}

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400/80" />
                    {currentTrack.duration}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100 truncate leading-snug font-['Space_Grotesk',sans-serif]" title={currentTrack.title}>
                  {currentTrack.title}
                </h4>
                <p className="text-xs text-amber-200/70 truncate mt-0.5">
                  {currentTrack.author}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#332C22]/80 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={onRemoveCurrentTrack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201C16] hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-[#332C22] hover:border-red-800/60 text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
                title="Quitar esta canción del escenario y volver a la pantalla de bienvenida (Home)"
              >
                <Square className="w-3.5 h-3.5 text-amber-400" />
                <span>Quitar (Volver al Home)</span>
              </button>

              {currentTrack.videoId && (
                <button
                  type="button"
                  onClick={() => onOpenDirectYouTube ? onOpenDirectYouTube(currentTrack.videoId) : window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}&autoplay=1`, '_blank')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/50 text-xs font-semibold transition active:scale-95 shadow-sm cursor-pointer"
                  title="Abrir video original en YouTube Web"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>YouTube Web</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#090807]/70 border border-dashed border-[#332C22] flex items-center justify-center text-center">
            <div className="text-xs text-slate-400">
              Ninguna canción sonando. Añade temas a la cola para iniciar.
            </div>
          </div>
        )}
      </div>

      {/* Lista de temas en espera */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[220px] max-h-[440px]">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-['Space_Grotesk',sans-serif]">
          Próximos en Lista ({queue.length})
        </div>

        {queue.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-center p-4 rounded-xl bg-[#090807]/40 border border-[#201C16]">
            <p className="text-sm font-medium text-slate-400">La cola está vacía</p>
            <p className="text-xs text-slate-500 mt-1">Busca canciones en el panel izquierdo y haz clic en "+ Añadir a la Cola".</p>
          </div>
        ) : (
          queue.map((track, index) => {
            const isNative = !!track.isNative;
            const val = isNative ? { status: 'valid' } : validationMap[track.videoId];
            const isRestricted = val?.status === 'restricted';
            const isValid = val?.status === 'valid';
            const isTesting = val?.status === 'testing';
            const downloadState = downloadProgressMap[track.videoId];
            const isDownloading = downloadState?.status === 'downloading';
            const isDownloadCompleted = downloadState?.status === 'completed';

            return (
              <div
                key={track.queueId || `${track.videoId}-${index}`}
                className={`group flex flex-col p-2.5 rounded-xl border transition-all duration-150 ${
                  isDownloading
                    ? 'bg-amber-950/25 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : isRestricted
                    ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : isNative
                    ? 'bg-purple-950/20 hover:bg-purple-950/35 border-purple-500/40 hover:border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.12)]'
                    : 'bg-[#201C16]/60 hover:bg-[#201C16] border-[#332C22]/60 hover:border-amber-500/40'
                }`}
              >
                {/* Fila Principal de la Canción */}
                <div className="flex items-center gap-2.5 w-full">
                  <div className="w-6 text-center font-mono text-xs font-bold text-amber-400/90 flex-shrink-0">
                    #{index + 1}
                  </div>

                  <div className="w-14 h-10 rounded overflow-hidden flex-shrink-0 bg-black border border-[#332C22] relative">
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {isDownloading ? (
                      <div className="absolute inset-0 bg-amber-950/80 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      </div>
                    ) : isRestricted ? (
                      <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                    ) : null}
                    {isNative && !isRestricted && (
                      <div className="absolute bottom-0 inset-x-0 bg-purple-950/80 text-[8px] font-bold text-purple-200 text-center py-0.2 tracking-wider uppercase">
                        VIDEO
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <h5
                        className={`text-xs font-semibold truncate leading-tight transition-colors ${
                          isRestricted
                            ? 'text-red-200'
                            : isNative
                            ? 'text-purple-200 group-hover:text-purple-300'
                            : 'text-slate-200 group-hover:text-amber-300'
                        }`}
                        title={track.title}
                      >
                        {track.title}
                      </h5>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                      <span className="truncate max-w-[120px]">{track.author}</span>
                      <span>•</span>
                      <span className="font-mono text-amber-200/60">{track.duration}</span>

                      {track.isDriveHosted || track.isServerHosted || (track.badge && track.badge.includes('VIP')) ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40">
                          <Crown className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                          👑 Servidor VIP
                        </span>
                      ) : isNative ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40">
                          <Film className="w-2.5 h-2.5 text-purple-400" />
                          Cortinilla
                        </span>
                      ) : (track.badge && track.badge.includes('Original')) ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-500/25 text-sky-300 border border-sky-500/40">
                          <Video className="w-2.5 h-2.5 text-sky-400" />
                          🎬 Video Original
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#14120F] text-slate-400 border border-[#332C22]">
                          {track.badge || '📺 YouTube'}
                        </span>
                      )}

                      {isValid && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                          {isNative ? 'Nativo 100%' : 'Verificada'}
                        </span>
                      )}
                      {isTesting && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                          Comprobando...
                        </span>
                      )}
                      {isDownloading && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                          Descargando al Servidor VIP ({downloadState.percent || 15}%)
                        </span>
                      )}
                      {isRestricted && !isDownloading && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/25 text-red-300 border border-red-500/50">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                          Restringida en YouTube
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {track.videoId && (
                      <button
                        type="button"
                        onClick={() => window.open(`https://www.youtube.com/watch?v=${track.videoId}&autoplay=1`, '_blank')}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition"
                        title="Abrir video en YouTube"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onPlayNow && onPlayNow(track.queueId, index)}
                      className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-[#332C22] transition"
                      title="Reproducir este tema ahora"
                    >
                      <PlayCircle className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onMoveUp && onMoveUp(track.queueId, index)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#332C22] disabled:opacity-25 transition"
                      title="Subir de posición"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === queue.length - 1}
                      onClick={() => onMoveDown && onMoveDown(track.queueId, index)}
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#332C22] disabled:opacity-25 transition"
                      title="Bajar de posición"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveTrack && onRemoveTrack(track.queueId, index)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition"
                      title="Eliminar de la cola"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Fila Secundaria: Barra de Progreso de Descarga en Vivo */}
                {isDownloading && (
                  <div className="w-full mt-2 pt-2 border-t border-amber-500/25 bg-amber-950/30 -mx-1 px-3 py-2 rounded-lg">
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="text-amber-300 font-semibold flex items-center gap-2 truncate">
                        <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin flex-shrink-0" />
                        <span className="truncate">{downloadState.stage || 'Descargando al Servidor VIP...'}</span>
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => onResolveAlternative && onResolveAlternative(track)}
                          className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1 cursor-pointer shadow"
                          title="Evitar la espera y usar de inmediato una versión alternativa libre de restricción"
                        >
                          <Sparkles className="w-3 h-3" />
                          Usar Inmediata
                        </button>
                        <span className="font-mono text-amber-200 font-bold">{downloadState.percent || 15}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-[#14120F] rounded-full h-2 overflow-hidden border border-amber-500/40">
                      <div
                        className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                        style={{ width: `${downloadState.percent || 15}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Fila Secundaria: Banner Interactivo de Oferta para Añadir al Servidor VIP */}
                {isRestricted && !isDownloading && !isDownloadCompleted && (
                  <div className="w-full mt-2 pt-2 border-t border-red-500/25 bg-red-950/30 -mx-1 px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-2 text-xs text-red-200 font-medium">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>¿Deseas añadirla al Servidor VIP?</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onStartDownload && onStartDownload(track)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer"
                        title="Descargar esta canción para tenerla disponible siempre en el Servidor VIP sin restricciones"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Sí, Añadir al Servidor VIP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAlertModal && onOpenAlertModal(track, false, val?.reason)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#201C16] hover:bg-[#332C22] text-slate-300 text-xs font-medium border border-[#332C22] transition flex items-center gap-1 cursor-pointer"
                        title="Buscar otras versiones en YouTube"
                      >
                        <RefreshCw className="w-3 h-3 text-amber-400" />
                        <span>Alternativas</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Fila Secundaria: Confirmación de Descarga Completada */}
                {isDownloadCompleted && (
                  <div className="w-full mt-2 pt-1.5 border-t border-emerald-500/20 bg-emerald-950/20 -mx-1 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>¡Canción añadida y descargada con éxito en el Servidor VIP!</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
