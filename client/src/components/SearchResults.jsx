import React, { useState } from 'react';
import { Plus, Check, Clock, Eye, Music, Disc3, Sparkles, ExternalLink, Zap, Crown, Video, ShieldAlert } from 'lucide-react';
import { searchDriveCatalog } from '../data/driveCatalog';

export default function SearchResults({ results = [], onAddToQueue, onSelectSuggestion, searchMode = 'karaoke' }) {
  const [addedIds, setAddedIds] = useState({});

  const handleAdd = (video, options = {}) => {
    const key = video.videoId || video.id || video.driveFileId;
    onAddToQueue(video, options);
    setAddedIds((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = { ...prev };
        delete next[key];
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
            : 'Videos Originales Oficiales (Para Bailar) • Escenario 89'}
        </h3>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {searchMode === 'original'
            ? 'Busca videoclips oficiales con audio y video original para que la gente salga a bailar.'
            : 'Escribe el nombre de un artista o canción. Las pistas de Servidor VIP se priorizan con máxima calidad y reproducción instantánea.'}
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
        {searchMode === 'original' ? (
          <span className="flex items-center gap-1 text-sky-400 text-[11px] font-medium">
            <Video className="w-3.5 h-3.5 text-sky-400" />
            Modo Video Original (Baile)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-400 text-[11px] font-medium">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Prioridad Servidor VIP
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {results.map((video) => {
          const itemKey = video.videoId || video.id || video.driveFileId;
          const isAdded = !!addedIds[itemKey];
          const isDrive = !!video.isDriveHosted;
          const isServer = !!video.isServerHosted;
          const isVip = isDrive || isServer || (video.badge && video.badge.includes('VIP'));
          const isOriginal = (video.badge && video.badge.includes('Original')) || searchMode === 'original';

          // Comprobar si existe versión alternativa en el catálogo VIP de Drive (para videos de YouTube)
          const vipAlternative = !isVip && video.title ? searchDriveCatalog(video.title)[0] : null;

          return (
            <div
              key={itemKey}
              className={`group relative flex gap-3 p-2.5 rounded-xl border transition-all duration-200 shadow-lg hover:shadow-xl ${
                isVip
                  ? 'bg-[#141009]/95 hover:bg-[#1d170d]/95 border-amber-500/60 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.18)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  : isOriginal
                  ? 'bg-[#0b1322]/95 hover:bg-[#111e33]/95 border-sky-500/50 hover:border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.15)] hover:shadow-[0_0_25px_rgba(14,165,233,0.25)]'
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
                    if (video.videoId) {
                      e.target.src = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
                    }
                  }}
                />
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono text-amber-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {video.duration}
                </span>

                {isVip ? (
                  <span className="absolute top-1 left-1 px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black text-[10px] font-extrabold tracking-wider flex items-center gap-1 shadow-md">
                    <Crown className="w-2.5 h-2.5 text-black fill-black" />
                    Karaoke VIP
                  </span>
                ) : isOriginal ? (
                  <span className="absolute top-1 left-1 px-2 py-0.5 rounded bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[10px] font-extrabold tracking-wider flex items-center gap-1 shadow-md">
                    <Video className="w-2.5 h-2.5 text-white" />
                    Video Original
                  </span>
                ) : video.embeddable ? (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 shadow">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    OK
                  </span>
                ) : video.embeddable === false ? (
                  <span 
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-0.5 shadow"
                    title="YouTube restringe inserción externa. La app aplicará auto-rescate instantáneo al reproducir."
                  >
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Auto-Rescate
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
                        : isOriginal
                        ? 'text-sky-200 group-hover:text-sky-300'
                        : 'text-slate-100 group-hover:text-amber-300'
                    }`}
                    title={video.title}
                  >
                    {video.title}
                  </h4>
                  <p className={`text-xs mt-1 truncate flex items-center gap-1 ${
                    isVip 
                      ? 'text-amber-300/90 font-medium' 
                      : isOriginal 
                      ? 'text-sky-300/80' 
                      : 'text-amber-200/70'
                  }`}>
                    {isVip ? (
                      <Crown className="w-3 h-3 text-amber-400" />
                    ) : isOriginal ? (
                      <Video className="w-3 h-3 text-sky-400" />
                    ) : (
                      <Music className="w-3 h-3 text-amber-400" />
                    )}
                    {video.author}
                  </p>

                  {isVip ? (
                    <p className="text-[10px] text-amber-400/90 mt-0.5 flex items-center gap-1 font-medium">
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      👑 Servidor VIP • Pista Instrumental de Karaoke
                    </p>
                  ) : isOriginal ? (
                    <p className="text-[10px] text-sky-400/90 mt-0.5 flex items-center gap-1 font-medium">
                      <Video className="w-2.5 h-2.5 text-sky-400" />
                      🎬 Video Oficial con Voz • Ideal para Bailar
                    </p>
                  ) : video.views ? (
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.views} vistas
                    </p>
                  ) : null}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                  {/* Enlace a YouTube directo disponible para todas las pistas con videoId */}
                  {video.videoId && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://www.youtube.com/watch?v=${video.videoId}&autoplay=1`, '_blank')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-[#332C22] hover:border-red-500/30 transition flex items-center gap-1"
                      title="Abrir en YouTube Web"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[10px] hidden sm:inline">YouTube</span>
                    </button>
                  )}

                  {/* Acciones para Pista Servidor VIP */}
                  {isVip ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectSuggestion && onSelectSuggestion(video.title.replace(/\(.*?\)/g, '').replace(/karaoke|instrumental/gi, '').trim(), 'original')}
                        className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-sky-300 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-700/50 flex items-center gap-1 transition cursor-pointer"
                        title="Buscar video oficial para bailar"
                      >
                        <Video className="w-3 h-3 text-sky-400" />
                        <span className="hidden sm:inline">Buscar Video</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdd(video, { asVip: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 text-black shadow-md shadow-amber-500/30'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Añadido
                          </>
                        ) : (
                          <>
                            <Crown className="w-3.5 h-3.5 text-black fill-black" />
                            Añadir Karaoke VIP
                          </>
                        )}
                      </button>
                    </>
                  ) : isOriginal ? (
                    /* Acciones para Video Original (Baile) */
                    <>
                      {vipAlternative && (
                        <button
                          type="button"
                          onClick={() => handleAdd(vipAlternative, { asVip: true })}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/50 flex items-center gap-1 transition cursor-pointer"
                          title="Añadir versión Karaoke VIP de Servidor (para cantar)"
                        >
                          <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Karaoke VIP</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAdd(video, { asOriginal: true })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:brightness-110 text-white shadow-md shadow-sky-500/30'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Añadido
                          </>
                        ) : (
                          <>
                            <Video className="w-3.5 h-3.5 text-white" />
                            Añadir Video Original
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    /* Acciones para Video de YouTube estándar / con letra */
                    <>
                      {vipAlternative && (
                        <button
                          type="button"
                          onClick={() => handleAdd(vipAlternative, { asVip: true })}
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-amber-300 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/50 flex items-center gap-1 transition cursor-pointer"
                          title="Añadir versión Karaoke VIP de Servidor"
                        >
                          <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>Karaoke VIP</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAdd(video)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
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
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
