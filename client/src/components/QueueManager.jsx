import React from 'react';
import { Trash2, ChevronUp, ChevronDown, ListMusic, Clock, Disc, PlayCircle, ExternalLink, Square, CheckCircle, AlertTriangle, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

export default function QueueManager({
  currentTrack,
  queue = [],
  isPlaying = false,
  validationMap = {},
  onRemoveTrack,
  onRemoveCurrentTrack,
  onMoveUp,
  onMoveDown,
  onPlayNow,
  onClearQueue,
  onOpenDirectYouTube,
  onOpenAlertModal,
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
            type="button"
            onClick={onClearQueue}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-900/40 transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Vaciar
          </button>
        )}
      </div>

      {/* Tema En Reproducción Actual */}
      <div className="mt-4 mb-4">
        <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-['Space_Grotesk',sans-serif]">
          <Disc className={`w-3.5 h-3.5 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          En Escenario Ahora
        </div>

        {currentTrack ? (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/40 p-3.5 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black border border-[#332C22]">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
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
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isPlaying 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                    {isPlaying ? 'Al Aire' : 'En Pausa'}
                  </span>
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#201C16] hover:bg-red-950/50 text-slate-300 hover:text-red-300 border border-[#332C22] hover:border-red-800/60 text-xs font-semibold transition active:scale-95 shadow-sm"
                title="Quitar esta canción del escenario y volver a la pantalla de bienvenida (Home)"
              >
                <Square className="w-3.5 h-3.5 text-amber-400" />
                <span>Quitar (Volver al Home)</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenDirectYouTube && onOpenDirectYouTube(currentTrack.videoId)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/50 text-xs font-semibold transition active:scale-95 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>YouTube Web</span>
              </button>
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
            const val = validationMap[track.videoId];
            const isRestricted = val?.status === 'restricted';
            const isValid = val?.status === 'valid';
            const isTesting = val?.status === 'testing';

            return (
              <div
                key={track.queueId || `${track.videoId}-${index}`}
                className={`group flex items-center gap-2.5 p-2 rounded-xl border transition-all duration-150 ${
                  isRestricted
                    ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                    : 'bg-[#201C16]/60 hover:bg-[#201C16] border-[#332C22]/60 hover:border-amber-500/40'
                }`}
              >
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
                  {isRestricted && (
                    <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <h5
                      className={`text-xs font-semibold truncate leading-tight transition-colors ${
                        isRestricted ? 'text-red-200' : 'text-slate-200 group-hover:text-amber-300'
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

                    {/* Badges de Validación Pre-Flight */}
                    {isValid && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                        Verificada
                      </span>
                    )}
                    {isTesting && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Loader2 className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                        Comprobando...
                      </span>
                    )}
                    {isRestricted && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-500/25 text-red-300 border border-red-500/50">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                        Restringida
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Botón especial para pistas restringidas: Resolver con 1 clic */}
                  {isRestricted && (
                    <button
                      type="button"
                      onClick={() => onOpenAlertModal && onOpenAlertModal(track, false, val?.reason)}
                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1 shadow active:scale-95 cursor-pointer"
                      title="Resolver problema: Buscar versión alternativa o abrir en YouTube"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Resolver</span>
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
            );
          })
        )}
      </div>
    </div>
  );
}
