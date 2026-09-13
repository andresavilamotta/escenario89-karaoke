import React, { useRef, useState, useEffect } from 'react';
import { ArrowRight, Volume2, VolumeX } from 'lucide-react';

export default function IntroSplash({ onComplete }) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch((e) => console.warn('Autoplay bloqueado:', e));
        }
      });
    }

    // Temporizador de seguridad (10 segundos) por si el video se detiene
    const safetyTimer = setTimeout(() => {
      onComplete?.();
    }, 9500);

    return () => clearTimeout(safetyTimer);
  }, [onComplete]);

  const toggleSound = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      const next = !isMuted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden font-['Outfit',sans-serif] animate-fade-in">
      {/* Video que se funde perfectamente con el fondo negro total sin bordes ni marcos */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          src="/intro-escenario89.mp4"
          autoPlay
          playsInline
          muted={isMuted}
          onEnded={onComplete}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>

      {/* Botones de control discretos en la esquina superior derecha */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
        <button
          type="button"
          onClick={toggleSound}
          className="p-2.5 rounded-full bg-black/60 hover:bg-black/90 border border-amber-500/30 text-amber-300 transition backdrop-blur-md shadow-lg cursor-pointer"
          title={isMuted ? 'Activar Sonido' : 'Silenciar'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onComplete}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FDE047] hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.4)] active:scale-95 transition cursor-pointer backdrop-blur-md"
        >
          <span>Entrar a Consola</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
