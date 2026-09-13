import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Mic, FileText, Video, Link2 } from 'lucide-react';

export const SEARCH_MODES = [
  { id: 'karaoke', label: 'Karaoke', icon: Mic, description: 'Pistas instrumentales sin voz' },
  { id: 'lyrics', label: 'Con Letra (Lyrics)', icon: FileText, description: 'Videos con letra y voz original' },
  { id: 'original', label: 'Original Oficial', icon: Video, description: 'Videoclips musicales oficiales' },
];

export default function SearchBar({ onSearch, isLoading = false, initialMode = 'karaoke' }) {
  const [inputValue, setInputValue] = useState('');
  const [selectedMode, setSelectedMode] = useState(initialMode);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = inputValue.trim();

    // Si es una URL de YouTube o ID directo, disparar de inmediato sin esperar
    const isUrl = trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

    if (isUrl) {
      onSearch(trimmed, selectedMode);
      return;
    }

    if (trimmed.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        onSearch(trimmed, selectedMode);
      }, 450);
    } else if (trimmed.length === 0) {
      onSearch('', selectedMode);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, selectedMode, onSearch]);

  const handleClear = () => {
    setInputValue('');
    onSearch('', selectedMode);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (inputValue.trim().length >= 2) {
        onSearch(inputValue.trim(), selectedMode);
      }
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const handleModeChange = (modeId) => {
    setSelectedMode(modeId);
    if (inputValue.trim().length >= 2) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      onSearch(inputValue.trim(), modeId);
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Selector de Modos de Búsqueda */}
      <div className="flex flex-wrap items-center gap-2">
        {SEARCH_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = selectedMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B8860B] text-black font-extrabold shadow-md shadow-amber-500/25'
                  : 'bg-[#201C16] text-slate-300 hover:text-amber-300 hover:bg-[#332C22] border border-[#332C22]'
              }`}
              title={mode.description}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}

        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[11px] text-amber-200/70">
          <Link2 className="w-3.5 h-3.5 text-amber-400" />
          <span>O pega enlace de YouTube</span>
        </div>
      </div>

      {/* Input de Búsqueda Principal */}
      <div className="relative w-full">
        <div className="relative flex items-center">
          <div className="absolute left-4 pointer-events-none text-slate-400 flex items-center gap-1.5">
            <Search className="w-5 h-5 text-amber-400" />
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedMode === 'karaoke'
                ? "Busca pista de karaoke o pega URL... (ej. Luis Miguel, Queen)"
                : selectedMode === 'lyrics'
                ? "Busca video con letra (Lyrics) o pega URL..."
                : "Busca video oficial original o pega URL..."
            }
            className="w-full bg-[#14120F] border border-[#332C22] rounded-xl pl-12 pr-28 py-3.5 text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all duration-200 shadow-inner"
          />

          <div className="absolute right-3 flex items-center gap-2">
            {isLoading ? (
              <div className="p-1.5 text-amber-400 animate-spin">
                <Loader2 className="w-5 h-5" />
              </div>
            ) : inputValue ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#332C22] transition"
                title="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}

            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-[#201C16] border border-[#332C22] text-[11px] text-amber-300 font-mono font-medium uppercase tracking-wider">
              {selectedMode === 'karaoke' ? 'Filtro Anti-Bloqueo ✓' : selectedMode}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
