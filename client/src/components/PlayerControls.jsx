import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Square,
  Volume2, 
  VolumeX, 
  ExternalLink, 
  Monitor, 
  Wifi, 
  WifiOff 
} from 'lucide-react';

export default function PlayerControls({
  isPlaying = false,
  volume = 80,
  isDisplayConnected = false,
  hasCurrentTrack = false,
  onTogglePlay,
  onSkip,
  onRestart,
  onStopToHome,
  onChangeVolume,
  onOpenDisplay,
  onOpenDirectYouTube
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      onChangeVolume(prevVolume || 80);
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
      onChangeVolume(0);
    }
  };

  const handleVolumeSlider = (e) => {
    const newVol = parseInt(e.target.value, 10);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
    }
    onChangeVolume(newVol);
  };

  return (
    <div className="bg-[#14120F]/90 border border-[#332C22] rounded-2xl p-4 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Indicador de Estado y Botones de Pantalla */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
          <button
            type="button"
            onClick={onOpenDisplay}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-transparent hover:from-amber-500/25 hover:to-amber-500/10 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-semibold text-xs transition-all duration-200 shadow-md active:scale-95"
            title="Abrir ventana de proyección para el proyector o segundo monitor"
          >
            <Monitor className="w-4 h-4 text-amber-400" />
            <span>Abrir Pantalla de Proyección</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </button>

          {hasCurrentTrack && (
            <button
              type="button"
              onClick={onOpenDirectYouTube}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 hover:text-red-300 border border-red-800/50 font-semibold text-xs transition-all duration-200 shadow-sm active:scale-95"
              title="Lanzar en YouTube Web nativo si el video está bloqueado para inserción"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>YouTube Web</span>
            </button>
          )}

          {/* Badge de Conexión del Proyector */}
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              isDisplayConnected
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-950/30 text-amber-400 border-amber-500/30'
            }`}
          >
            {isDisplayConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <Wifi className="w-3.5 h-3.5" />
                <span>Proyector Conectado</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Proyector Desconectado</span>
              </>
            )}
          </div>
        </div>

        {/* Controles de Transporte Principales */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!hasCurrentTrack}
            onClick={onRestart}
            className="p-2.5 rounded-xl bg-[#201C16] hover:bg-[#332C22] disabled:opacity-25 text-slate-300 hover:text-amber-300 border border-[#332C22] transition active:scale-95"
            title="Reiniciar canción actual (0:00)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Botón Play/Pause Oro Metálico */}
          <button
            type="button"
            disabled={!hasCurrentTrack}
            onClick={onTogglePlay}
            className={`px-7 py-3 rounded-xl font-bold flex items-center gap-2.5 text-sm transition-all duration-200 shadow-xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
              isPlaying
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-black shadow-[0_0_20px_rgba(212,175,55,0.4)]'
                : 'bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B8860B] hover:brightness-110 text-black shadow-[0_0_25px_rgba(212,175,55,0.5)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span className="tracking-wide uppercase font-extrabold text-xs">Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span className="tracking-wide uppercase font-extrabold text-xs">{hasCurrentTrack ? 'Reanudar' : 'Reproducir'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={!hasCurrentTrack}
            onClick={onSkip}
            className="p-2.5 rounded-xl bg-[#201C16] hover:bg-[#332C22] disabled:opacity-25 text-slate-300 hover:text-amber-300 border border-[#332C22] transition active:scale-95"
            title="Saltar a la siguiente canción"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Botón Quitar / Detener y volver al Home */}
          <button
            type="button"
            disabled={!hasCurrentTrack}
            onClick={onStopToHome}
            className="p-2.5 rounded-xl bg-[#201C16] hover:bg-red-950/50 disabled:opacity-25 text-slate-300 hover:text-red-400 border border-[#332C22] hover:border-red-800/50 transition active:scale-95"
            title="Quitar canción actual y volver al Home de proyección"
          >
            <Square className="w-4 h-4 text-amber-400/90" />
          </button>
        </div>

        {/* Control de Volumen */}
        <div className="flex items-center gap-2.5 w-full md:w-48 justify-end">
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#201C16] transition"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeSlider}
            className="w-24 md:w-28 h-1.5 bg-[#332C22] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
            title={`Volumen: ${isMuted ? 0 : volume}%`}
          />

          <span className="text-xs font-mono text-amber-200/80 w-8 text-right">
            {isMuted ? '0%' : `${volume}%`}
          </span>
        </div>

      </div>
    </div>
  );
}
