import React, { useState } from 'react';
import { Plus, Check, Clock, Eye, Music, Disc3, Sparkles, ShieldCheck, ExternalLink, Server, Zap, Cloud, Crown } from 'lucide-react';

export default function SearchResults({ results = [], onAddToQueue, onSelectSuggestion, searchMode = 'karaoke' }) {
  const [addedIds, setAddedIds] = useState({});

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

  const suggestions = [
    'Yeison Jiménez - Aventurero',
    'Darío Gómez - Nadie Es Eterno',
    'Segundo Rosero - Cómo Voy a Olvidarte',
    'Binomio de Oro - Olvídala',
    'Alci Acosta - La Copa Rota',
    'Vicente Fernández - Volver, Volver',
    'Ana Gabriel - Simplemente Amigos',
    'Pastor López - Traicionera',
    'Diomedes Díaz - Tú Eres la Reina',
    'Carin León - Primera Cita',
  ];

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-[#14120F]/60 rounded-2xl border border-[#332C22] mt-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
          <Disc3 className="w-6 h-6 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1 font-['Space_Grotesk',sans-serif]">
          {searchMode === 'karaoke' 
            ? 'Catálogo de Karaoke • Escenario 89' 
            : searchMode === 'lyrics' 
            ? 'Videos con Letra (Lyrics) • Escenario 89' 
            : 'Videos Originales Oficiales • Escenario 89'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Escribe el nombre de un artista o canción. Las pistas de <span className="text-amber-400 font-semibold">Servidor VIP</span> se priorizan con máxima calidad y reproducción instantánea.
        </p>

        <div className="w-full max-w-xl">
          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-300/80 uppercase tracking-wider mb-3 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Sugerencias recomendadas
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((sug) => (
              <button
                key={sug}
                onClick={() => onSelectSuggestion && onSelectSuggestion(sug)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#201C16] hover:bg-[#332C22] hover:text-amber-300 border border-[#332C22] hover:border-amber-500/40 transition text-slate-300"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Mostrando {results.length} temas disponibles</span>
        <span className="flex items-center gap-1 text-amber-400 text-[11px] font-medium">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          Prioridad Servidor VIP
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {results.map((video) => {
          const isAdded = !!addedIds[video.videoId];
          const isDrive = !!video.isDriveHosted;
          const isServer = !!video.isServerHosted;
          const isVip = isDrive || isServer || (video.badge && video.badge.includes('VIP'));

          return (
            <div
              key={video.videoId}
              className={`group relative flex gap-3 p-2.5 rounded-xl border transition-all duration-200 shadow-lg hover:shadow-xl ${
                isVip
                  ? 'bg-[#141009]/95 hover:bg-[#1d170d]/95 border-amber-500/60 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.18)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  : 'bg-[#14120F]/90 hover:bg-[#201C16]/90 border-[#332C22] hover:border-amber-500/50'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-36 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-black border border-[#332C22]">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                  }}
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono text-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {video.duration}
                </span>

                {isVip ? (
                  <span className="absolute top-1 left-1 px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[10px] font-extrabold tracking-wider flex items-center gap-1 shadow-md">
                    <Crown className="w-2.5 h-2.5 text-black fill-black" />
                    Servidor VIP
                  </span>
                ) : video.embeddable ? (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    OK
                  </span>
                ) : null}
              </div>

              {/* Info y Botones */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h4
                    className={`text-sm font-semibold line-clamp-2 leading-snug transition-colors font-['Space_Grotesk',sans-serif] ${
                      isVip
                        ? 'text-amber-200 group-hover:text-amber-300'
                        : 'text-slate-100 group-hover:text-amber-300'
                    }`}
                    title={video.title}
                  >
                    {video.title}
                  </h4>
                  <p className={`text-xs mt-1 truncate flex items-center gap-1 ${
                    isVip ? 'text-amber-300/90 font-medium' : 'text-amber-200/70'
                  }`}>
                    {isVip ? <Crown className="w-3 h-3 text-amber-400" /> : <Music className="w-3 h-3 text-amber-400" />}
                    {video.author}
                  </p>
                  {isVip ? (
                    <p className="text-[10px] text-amber-400/90 mt-0.5 flex items-center gap-1 font-medium">
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      👑 Servidor VIP • Reproducción Directa sin anuncios
                    </p>
                  ) : video.views ? (
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.views} vistas
                    </p>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center justify-end gap-1.5">
                  {/* Enlace a YouTube directo disponible para todas las pistas */}
                  {video.videoId && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}&autoplay=1`, '_blank')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-[#332C22] hover:border-red-500/30 transition flex items-center gap-1"
                      title="Abrir versión original en YouTube Web"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">YouTube</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAdd(video)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isVip
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 text-black shadow-md shadow-amber-500/30'
                        : 'bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B8860B] hover:brightness-110 text-black shadow-sm hover:shadow-amber-500/30'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Añadido
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        Añadir a la Cola
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
