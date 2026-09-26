import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  X, 
  Play, 
  Plus, 
  Check, 
  Search, 
  ExternalLink, 
  Music, 
  HardDrive, 
  Disc3,
  CheckCircle2
} from 'lucide-react';
import { RECOVERED_SONGS, RECOVERED_ANNOUNCEMENT_DATE } from '../data/recoveredSongs';

export default function DailyAnnouncementModal({
  isOpen,
  onClose,
  onAddToQueue,
  onPlayNow,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [addedIds, setAddedIds] = useState({});
  const [dontShowAgainToday, setDontShowAgainToday] = useState(false);

  // Filtrar canciones por término de búsqueda
  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return RECOVERED_SONGS;
    const term = searchTerm.toLowerCase();
    return RECOVERED_SONGS.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.author.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const handleAdd = (song) => {
    if (onAddToQueue) {
      onAddToQueue(song);
      setAddedIds((prev) => ({ ...prev, [song.videoId]: true }));
      setTimeout(() => {
        setAddedIds((prev) => {
          const next = { ...prev };
          delete next[song.videoId];
          return next;
        });
      }, 1800);
    }
  };

  const handlePlayDirect = (song) => {
    if (onPlayNow) {
      onPlayNow(song);
      handleClose();
    }
  };

  const handleClose = () => {
    if (dontShowAgainToday) {
      const today = new Date().toISOString().slice(0, 10);
      try {
        localStorage.setItem(`escenario89_daily_announcement_${today}`, 'true');
      } catch (e) {}
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-['Outfit',sans-serif]">
      {/* Contenedor Modal */}
      <div 
        className="w-full max-w-4xl bg-gradient-to-b from-[#181511] via-[#12100D] to-[#0A0908] border border-amber-500/40 rounded-3xl shadow-[0_0_60px_rgba(212,175,55,0.25)] flex flex-col max-h-[90vh] overflow-hidden relative text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Resplandores dorados de fondo */}
        <div className="absolute top-0 right-1/4 w-96 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-48 bg-yellow-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="relative p-5 sm:p-7 border-b border-[#332C22] bg-[#14120F]/90 flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#201C16] hover:bg-[#332C22] border border-[#332C22] hover:border-amber-500/50 flex items-center justify-center text-slate-400 hover:text-amber-200 transition cursor-pointer"
            aria-label="Cerrar anuncio"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Solo por hoy • Novedades
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Catálogo Actualizado
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-['Space_Grotesk',sans-serif] flex items-center gap-2.5">
            <span>🎉 ¡Catálogo Actualizado: {RECOVERED_SONGS.length} Nuevas Canciones Disponibles!</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
            Hemos actualizado nuestra biblioteca con <strong>{RECOVERED_SONGS.length} nuevas canciones</strong> en alta calidad de audio y video. ¡Ya se encuentran listas en el sistema para que las busques y cantes sin esperas ni interrupciones!
          </p>

          {/* Chips de Métricas Clave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            <div className="bg-[#1C1813] border border-[#332C22] rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Music className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight">{RECOVERED_SONGS.length} Pistas</div>
                <div className="text-[10px] text-slate-400 truncate">Nuevas en catálogo</div>
              </div>
            </div>

            <div className="bg-[#1C1813] border border-[#332C22] rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight">100% Listas</div>
                <div className="text-[10px] text-slate-400 truncate">Descargadas en local</div>
              </div>
            </div>

            <div className="bg-[#1C1813] border border-[#332C22] rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight">Sin Anuncios</div>
                <div className="text-[10px] text-slate-400 truncate">Reproducción directa</div>
              </div>
            </div>

            <div className="bg-[#1C1813] border border-[#332C22] rounded-xl p-2.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                <Disc3 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white leading-tight">Para Cantar Hoy</div>
                <div className="text-[10px] text-slate-400 truncate">Disponibles ahora</div>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Filtro Rápido */}
        <div className="p-3 sm:px-7 sm:py-3 border-b border-[#262018] bg-[#0E0C0A] flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar artista o canción..."
              className="w-full bg-[#181511] border border-[#332C22] focus:border-amber-500/50 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition"
            />
          </div>
          <span className="text-[11px] text-slate-400 self-end sm:self-auto font-mono">
            Mostrando {filteredSongs.length} de {RECOVERED_SONGS.length} canciones
          </span>
        </div>

        {/* Lista de Canciones con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 custom-scrollbar">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No se encontraron coincidencias para "{searchTerm}".
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isAdded = !!addedIds[song.videoId];

              return (
                <div
                  key={song.videoId}
                  className="group bg-[#15120E] hover:bg-[#1C1813] border border-[#2B241B] hover:border-amber-500/40 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-sm"
                >
                  {/* Info izquierda: Miniatura + Títulos */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black/60 border border-[#332C22] flex-shrink-0">
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-1 right-1 text-[9px] font-mono text-amber-200 bg-black/80 px-1 rounded">
                        {song.duration}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Nueva en Catálogo
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate group-hover:text-amber-200 transition">
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {song.author}
                      </p>
                    </div>
                  </div>

                  {/* Acciones derecha */}
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <a
                      href={`https://www.youtube.com/watch?v=${song.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#201C16] hover:bg-[#2B251D] border border-[#332C22] text-slate-400 hover:text-amber-300 transition"
                      title="Ver original"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {onPlayNow && (
                      <button
                        onClick={() => handlePlayDirect(song)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#201C16] hover:bg-amber-600/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-300 text-xs font-semibold transition cursor-pointer"
                        title="Poner al aire en pantalla"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden md:inline">Al Aire</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleAdd(song)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-600 text-white border border-emerald-500'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black border border-amber-400'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡En Cola!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Encolar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 sm:p-5 border-t border-[#332C22] bg-[#14120F]/95 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgainToday}
              onChange={(e) => setDontShowAgainToday(e.target.checked)}
              className="rounded bg-[#1A1612] border-[#332C22] text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>No volver a mostrar automáticamente hoy</span>
          </label>

          <button
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-extrabold text-xs sm:text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.4)] transition cursor-pointer font-['Space_Grotesk',sans-serif]"
          >
            ¡Entendido, a cantar! 🎤
          </button>
        </div>
      </div>
    </div>
  );
}
