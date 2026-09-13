import React, { useState } from 'react';
import { Plus, Check, Clock, Eye, Music, Disc3, Sparkles, ShieldCheck, ExternalLink } from 'lucide-react';

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
    'Luis Miguel - La Incondicional',
    'Queen - Bohemian Rhapsody',
    'Juan Gabriel - Querida',
    'Dua Lipa - Levitating',
    'Shakira - Antología',
    'Carin Leon - Primera Cita',
    'ABBA - Dancing Queen',
    'Mana - Oye Mi Amor',
    'Coldplay - Viva La Vida',
    'Carlos Vives - La Bicicleta'
  ];

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#14120F]/60 border border-[#332C22] rounded-2xl">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(212,175,55,0.2)]">
          <Disc3 className="w-8 h-8 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-1 font-['Space_Grotesk',sans-serif]">
          {searchMode === 'karaoke' 
            ? 'Catálogo de Karaoke • Escenario 89' 
            : searchMode === 'lyrics' 
            ? 'Videos con Letra (Lyrics) • Escenario 89' 
            : 'Videos Originales Oficiales • Escenario 89'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Escribe el nombre de un artista o canción. Los resultados se verifican en tiempo real contra restricciones de inserción.
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
        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          Filtro Anti-Restricción Activo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {results.map((video) => {
          const isAdded = !!addedIds[video.videoId];

          return (
            <div
              key={video.videoId}
              className="group relative flex gap-3 p-2.5 rounded-xl bg-[#14120F]/90 hover:bg-[#201C16]/90 border border-[#332C22] hover:border-amber-500/50 transition-all duration-200 shadow-lg hover:shadow-xl"
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

                {video.embeddable && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    OK
                  </span>
                )}
              </div>

              {/* Info y Botones */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h4
                    className="text-sm font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors font-['Space_Grotesk',sans-serif]"
                    title={video.title}
                  >
                    {video.title}
                  </h4>
                  <p className="text-xs text-amber-200/70 mt-1 truncate flex items-center gap-1">
                    <Music className="w-3 h-3 text-amber-400" />
                    {video.author}
                  </p>
                  {video.views && (
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.views} vistas
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}&autoplay=1`, '_blank')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#332C22] transition"
                    title="Abrir directamente en YouTube Web (Sin restricciones)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAdd(video)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ${
                      isAdded
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
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
