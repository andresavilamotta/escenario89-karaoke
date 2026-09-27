import React, { useState } from 'react';
import { NATIVE_VIDEOS } from '../data/nativeVideos';
import { Film, PlayCircle, Plus, Sparkles, Check, Clock, Radio, Shuffle } from 'lucide-react';

export default function AnimationSelector({
  onAddToQueue,
  onPlayNow,
  onInterleave,
  queueLength = 0,
}) {
  const [addedIds, setAddedIds] = useState({});
  const [activePreview, setActivePreview] = useState(null);

  const handleAdd = (video) => {
    onAddToQueue(video);
    setAddedIds((prev) => ({ ...prev, [video.videoId]: true }));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = { ...prev };
        delete next[video.videoId];
        return next;
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4 font-['Outfit',sans-serif]">
      {/* Banner Superior con Botón de Intercalado Inteligente */}
      <div className="bg-gradient-to-r from-purple-950/40 via-[#14120F] to-amber-950/30 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2 font-['Space_Grotesk',sans-serif]">
              Cortinillas & Visuales de Escenario
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {NATIVE_VIDEOS.length} Videos Nativos
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Proyección directa HTML5 en pantalla completa a 60 fps (100% libre de restricciones de YouTube).
            </p>
          </div>
        </div>

        {/* Botón para intercalar animación en la cola */}
        <button
          type="button"
          onClick={onInterleave}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-500 hover:to-amber-500 text-white text-xs font-bold transition shadow-lg hover:shadow-purple-500/25 active:scale-95 cursor-pointer flex-shrink-0"
          title="Inserta automáticamente una cortinilla entre canciones de la cola para animar el cambio de turno"
        >
          <Shuffle className="w-4 h-4" />
          <span>Intercalar en la Cola</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Videos Nativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {NATIVE_VIDEOS.map((video) => {
          const isAdded = !!addedIds[video.videoId];

          return (
            <div
              key={video.videoId}
              className="group relative flex flex-col justify-between p-3.5 rounded-2xl bg-[#14120F]/90 hover:bg-[#1a1714] border border-[#332C22] hover:border-purple-500/50 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <div>
                {/* Header de la tarjeta con Badge y Duración */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    {video.badge}
                  </span>
                  <span className="text-[11px] font-mono text-amber-300/80 bg-[#090807] px-2 py-0.5 rounded-md border border-[#332C22] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {video.duration}
                  </span>
                </div>

                {/* Vista previa de video interactiva */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden bg-black border border-[#332C22] mb-3">
                  <video
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(e) => {
                      try { e.target.play(); } catch (err) {}
                    }}
                    onMouseLeave={(e) => {
                      try { e.target.pause(); e.target.currentTime = 0; } catch (err) {}
                    }}
                  >
                    <source src={video.videoUrl} type="video/mp4" />
                    {video.driveStreamUrl && <source src={video.driveStreamUrl} type="video/mp4" />}
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none flex items-end p-2.5">
                    <span className="text-[10px] text-slate-300 font-mono flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                      Pasa el cursor para vista previa
                    </span>
                  </div>
                </div>

                {/* Título y Descripción */}
                <h4 className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors font-['Space_Grotesk',sans-serif]">
                  {video.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {video.description}
                </p>
              </div>

              {/* Botones de Acción */}
              <div className="mt-3.5 pt-3 border-t border-[#332C22] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onPlayNow && onPlayNow(video)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#201C16] hover:bg-[#332C22] text-amber-300 hover:text-white text-xs font-semibold border border-[#332C22] hover:border-amber-500/40 transition active:scale-95 cursor-pointer shadow-sm"
                  title="Poner en pantalla inmediatamente"
                >
                  <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Proyectar Ahora</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAdd(video)}
                  disabled={isAdded}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 shadow-md cursor-pointer ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white'
                  }`}
                  title="Añadir esta cortinilla al siguiente turno de la cola"
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡En Cola!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Añadir a la Cola</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
