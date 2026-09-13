import React, { useState, useEffect } from 'react';
import { Volume2, Wifi, Star } from 'lucide-react';

export default function StandbyScreen({ onUnlockAudio, isAudioUnlocked = true }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#040404] text-white flex flex-col items-center justify-center overflow-hidden select-none cursor-default font-['Outfit',sans-serif]">
      {/* Reflectores de Escenario (Luces cálidas doradas) */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-amber-500/15 rounded-full blur-[140px] pointer-events-none animate-pulse-slow"></div>
      <div className="absolute -bottom-32 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Trama sutil de fondo */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      ></div>

      {/* Reloj y Estado Superior */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between text-slate-400 z-20">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-emerald-400 font-semibold">En Vivo</span>
          <span className="text-[#332C22]">|</span>
          <span className="flex items-center gap-1.5 text-amber-200/80">
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
            Escenario 89 • Proyección
          </span>
        </div>

        <div className="font-mono text-xl tracking-widest text-amber-100/90 font-bold drop-shadow">
          {time}
        </div>
      </div>

      {/* Contenido Central: Imagotipo Oficial de Marca */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
        {/* Contenedor del Logo con Resplandor Dorado */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-amber-600/30 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-[3px] bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
            <div className="w-full h-full rounded-full overflow-hidden bg-black flex items-center justify-center border-2 border-black">
              <img 
                src="/logo-escenario89.jpg" 
                alt="Escenario 89 Karaoke Bar" 
                className="w-full h-full object-cover scale-105"
              />
            </div>
          </div>
        </div>

        {/* Insignia de Turno */}
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-widest mb-6 shadow-sm">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>¡Escenario Abierto! Pide tu Turno</span>
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        </div>

        <p className="text-xl md:text-2xl font-light text-slate-200 leading-relaxed max-w-lg mb-8 font-['Space_Grotesk',sans-serif]">
          Acércate a la cabina o pídele tu canción favorita al <span className="text-amber-300 font-semibold underline decoration-amber-500 decoration-2 underline-offset-4">DJ / Operador</span> para subir al escenario.
        </p>

        {/* Ecualizador de Audio Estilizado en Oro Metálico */}
        <div className="flex items-end justify-center gap-1.5 h-11 mb-8">
          {[35, 65, 90, 55, 80, 100, 45, 85, 70, 40, 95, 75, 50, 85, 60, 40].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-[#8C6314] via-[#D4AF37] to-[#FDE047]"
              style={{
                height: `${h}%`,
                animation: `eqAnim 1.2s ease-in-out infinite alternate`,
                animationDelay: `${(i % 6) * 0.18}s`
              }}
            ></span>
          ))}
        </div>

        {/* Botón de desbloqueo de audio para políticas de autoplay del navegador */}
        {!isAudioUnlocked && (
          <button
            type="button"
            onClick={onUnlockAudio}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 border border-amber-400 text-amber-300 text-sm font-bold tracking-wide transition-all duration-200 animate-pulse hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            <Volume2 className="w-4 h-4" />
            Haz clic aquí para activar el audio del escenario
          </button>
        )}
      </div>

      {/* Footer minimalista */}
      <div className="absolute bottom-6 text-center text-xs text-[#8C6314] tracking-widest uppercase font-mono">
        ESCENARIO 89 KARAOKE BAR • SISTEMA DUAL SCREEN
      </div>
    </div>
  );
}
