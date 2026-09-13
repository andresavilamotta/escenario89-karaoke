import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { useKaraokeSync, MESSAGE_TYPES } from '../hooks/useKaraokeSync';
import StandbyScreen from '../components/StandbyScreen';
import { Music, Radio, ExternalLink, AlertTriangle } from 'lucide-react';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';


export default function DisplayView() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrackTitle, setNextTrackTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [hasError, setHasError] = useState(null);

  const playerRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const trackStartTimeRef = useRef(0);
  const hasEndedDispatchedRef = useRef(false);
  const bufferWatchdogRef = useRef(null);
  const outroCheckIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Manejador del banner inferior con fade-out a los 5 segundos
  const triggerOverlay = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 5000);
  }, []);

  // BroadcastChannel callbacks para Display
  const handlePlayNext = useCallback((payload) => {
    console.log('[Display] PLAY_NEXT recibido:', payload);
    setHasError(null);
    hasEndedDispatchedRef.current = false;
    trackStartTimeRef.current = Date.now();
    currentTrackRef.current = payload;
    setCurrentTrack(payload);
    setNextTrackTitle(payload.nextTrackTitle || '');
    setIsPlaying(true);
    triggerOverlay();

    // No forzamos loadVideoById de forma imperativa para no colisionar con la prop videoId
    if (playerRef.current) {
      try {
        playerRef.current.playVideo();
      } catch (err) {
        console.warn('[Display] Error al intentar reproducir inmediatamente:', err);
      }
    }
  }, [triggerOverlay]);

  const handlePlayerState = useCallback((payload) => {
    console.log('[Display] PLAYER_STATE recibido:', payload);
    setIsPlaying(payload.isPlaying);
    if (playerRef.current) {
      if (payload.isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, []);

  const handleStandby = useCallback(() => {
    console.log('[Display] STANDBY recibido. Volviendo a pantalla inicial (Home)');
    hasEndedDispatchedRef.current = true;
    if (bufferWatchdogRef.current) {
      clearTimeout(bufferWatchdogRef.current);
      bufferWatchdogRef.current = null;
    }
    if (outroCheckIntervalRef.current) {
      clearInterval(outroCheckIntervalRef.current);
      outroCheckIntervalRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch (e) {}
    }
    currentTrackRef.current = null;
    setCurrentTrack(null);
    setNextTrackTitle('');
    setIsPlaying(false);
    setHasError(null);
    setShowOverlay(false);
  }, []);

  const handleSkipTrack = useCallback((payload) => {
    console.log('[Display] SKIP_TRACK recibido:', payload);
    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch (e) {}
    }
    if (payload && payload.videoId) {
      handlePlayNext(payload);
    } else {
      handleStandby();
    }
  }, [handlePlayNext, handleStandby]);

  const handleRestartTrack = useCallback(() => {
    console.log('[Display] RESTART_TRACK recibido');
    trackStartTimeRef.current = Date.now();
    hasEndedDispatchedRef.current = false;
    if (playerRef.current) {
      try {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        triggerOverlay();
      } catch (e) {}
    }
  }, [triggerOverlay]);

  const handleSetVolume = useCallback((payload) => {
    const newVol = typeof payload.volume === 'number' ? payload.volume : 80;
    setVolume(newVol);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
    }
  }, []);

  const handleSyncState = useCallback((payload) => {
    if (payload && payload.currentTrack) {
      currentTrackRef.current = payload.currentTrack;
      setCurrentTrack(payload.currentTrack);
      setNextTrackTitle(payload.nextTrackTitle || '');
      setIsPlaying(payload.isPlaying);
      if (typeof payload.volume === 'number') {
        setVolume(payload.volume);
      }
    } else {
      handleStandby();
    }
  }, [handleStandby]);

  // Inicializar hook con los callbacks
  const { broadcast } = useKaraokeSync('display', {
    [MESSAGE_TYPES.PLAY_NEXT]: handlePlayNext,
    [MESSAGE_TYPES.PLAYER_STATE]: handlePlayerState,
    [MESSAGE_TYPES.SKIP_TRACK]: handleSkipTrack,
    [MESSAGE_TYPES.RESTART_TRACK]: handleRestartTrack,
    [MESSAGE_TYPES.SET_VOLUME]: handleSetVolume,
    [MESSAGE_TYPES.SYNC_STATE]: handleSyncState,
    [MESSAGE_TYPES.STANDBY]: handleStandby,
  });

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (bufferWatchdogRef.current) clearTimeout(bufferWatchdogRef.current);
      if (outroCheckIntervalRef.current) clearInterval(outroCheckIntervalRef.current);
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
      }
    };
  }, []);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    try {
      playerRef.current.setVolume(volume);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    } catch (e) {}
  };

  const onPlayerEnd = useCallback(() => {
    const elapsed = Date.now() - trackStartTimeRef.current;
    console.log(`[Display] onPlayerEnd recibido tras ${elapsed}ms`);

    // Guardia Quirúrgica: Si el video reporta haber terminado en menos de 4s, es una cancelación o buffer abortado
    if (elapsed < 4000) {
      console.warn('[Display] Fin de video abortado por tiempo menor a 4s (posible carga interrumpida).');
      return;
    }

    if (hasEndedDispatchedRef.current) {
      return;
    }
    hasEndedDispatchedRef.current = true;

    if (bufferWatchdogRef.current) {
      clearTimeout(bufferWatchdogRef.current);
      bufferWatchdogRef.current = null;
    }
    if (outroCheckIntervalRef.current) {
      clearInterval(outroCheckIntervalRef.current);
      outroCheckIntervalRef.current = null;
    }

    console.log('[Display] Video finalizó legítimamente. Notificando al operador.');
    const endedQueueId = currentTrackRef.current?.queueId;
    setCurrentTrack(null);
    setIsPlaying(false);
    setShowOverlay(false);
    broadcast(MESSAGE_TYPES.TRACK_ENDED, { queueId: endedQueueId });
  }, [broadcast]);

  const onStateChange = useCallback((event) => {
    const state = event.data;
    // 1: PLAYING, 2: PAUSED, 3: BUFFERING, 0: ENDED

    if (state === 1) { // PLAYING
      setIsPlaying(true);
      if (bufferWatchdogRef.current) {
        clearTimeout(bufferWatchdogRef.current);
        bufferWatchdogRef.current = null;
      }

      // Activar WakeLock para evitar suspensión de pantalla
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request('screen')
          .then((lock) => { wakeLockRef.current = lock; })
          .catch(() => {});
      }

      // Detector de silencio muerto / outro final
      if (!outroCheckIntervalRef.current) {
        outroCheckIntervalRef.current = setInterval(() => {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function' && typeof playerRef.current.getDuration === 'function') {
            try {
              const current = playerRef.current.getCurrentTime();
              const total = playerRef.current.getDuration();
              if (total > 45 && (total - current) <= 2.5 && !hasEndedDispatchedRef.current) {
                console.log('[Display] Fin de pista por umbral de duración (sin bache de silencio).');
                onPlayerEnd();
              }
            } catch (e) {}
          }
        }, 1000);
      }
    } else if (state === 3) { // BUFFERING
      if (!bufferWatchdogRef.current) {
        bufferWatchdogRef.current = setTimeout(() => {
          console.warn('[Display] Buffer congelado por más de 7s. Reintentando reproducir...');
          if (playerRef.current) {
            try {
              playerRef.current.playVideo();
            } catch (e) {}
          }
        }, 7000);
      }
    } else if (state === 2) { // PAUSED
      if (bufferWatchdogRef.current) {
        clearTimeout(bufferWatchdogRef.current);
        bufferWatchdogRef.current = null;
      }
    } else if (state === 0) { // ENDED
      onPlayerEnd();
    }
  }, [onPlayerEnd]);

  const onPlayerError = (event) => {
    const errorCode = event.data;
    console.error('[Display] Error en YouTube IFrame Player:', errorCode);

    if (hasEndedDispatchedRef.current) return;
    hasEndedDispatchedRef.current = true;

    if (bufferWatchdogRef.current) {
      clearTimeout(bufferWatchdogRef.current);
      bufferWatchdogRef.current = null;
    }
    if (outroCheckIntervalRef.current) {
      clearInterval(outroCheckIntervalRef.current);
      outroCheckIntervalRef.current = null;
    }

    let errorMessage = 'Error al reproducir el video en YouTube.';
    if (errorCode === 101 || errorCode === 150) {
      errorMessage = 'Video con restricción de derechos para inserción externa (Error 150/101).';
    } else if (errorCode === 2) {
      errorMessage = 'El identificador del video no es válido.';
    }

    setHasError(errorMessage);

    logger.error('YouTube', `Error ${errorCode} al reproducir "${currentTrackRef.current?.title || 'Video'}": ${errorMessage}`, {
      videoId: currentTrackRef.current?.videoId,
      errorCode,
    });

    try {
      Sentry.captureMessage(`[YouTube Error ${errorCode}] ${currentTrackRef.current?.title || 'Video Desconocido'}`, {
        level: 'error',
        tags: {
          errorCode: String(errorCode),
          videoId: currentTrackRef.current?.videoId,
          origen: 'display_proyector',
        },
        extra: {
          title: currentTrackRef.current?.title,
          videoId: currentTrackRef.current?.videoId,
          author: currentTrackRef.current?.author,
          errorMessage,
        },
      });
    } catch (e) {}

    broadcast(MESSAGE_TYPES.ERROR_RESTRICTED, {
      videoId: currentTrackRef.current?.videoId,
      title: currentTrackRef.current?.title,
      queueId: currentTrackRef.current?.queueId,
      errorCode,
      message: errorMessage,
    });


    setTimeout(() => {
      setHasError(null);
    }, 4000);
  };

  const youtubeOptions = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      modestbranding: 1,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      disablekb: 1,
      playsinline: 1,
    },
  };

  const handleUnlockAudio = () => {
    setIsAudioUnlocked(true);
    if (playerRef.current) {
      try {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
      } catch (e) {}
    }
  };

  return (
    <div 
      className="relative w-screen h-screen bg-[#040404] overflow-hidden select-none font-['Outfit',sans-serif]"
      onClick={handleUnlockAudio}
    >
      {/* Estado 1: Standby cuando no hay tema sonando */}
      {!currentTrack?.videoId ? (
        <StandbyScreen 
          onUnlockAudio={handleUnlockAudio} 
          isAudioUnlocked={isAudioUnlocked} 
        />
      ) : (
        /* Estado 2: Reproduciendo video en pantalla completa */
        <div className="relative w-full h-full">
          {/* Contenedor IFrame YouTube calibrado a 100vw / 100vh sin pointer-events */}
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden flex items-center justify-center bg-black">
            <div className="w-screen h-screen scale-[1.05] pointer-events-none">
              <YouTube
                videoId={currentTrack.videoId}
                opts={youtubeOptions}
                onReady={onPlayerReady}
                onEnd={onPlayerEnd}
                onError={onPlayerError}
                onStateChange={onStateChange}
                className="w-full h-full"
                iframeClassName="w-full h-full border-0 pointer-events-none"
              />
            </div>
          </div>

          {/* Notificación de Error Restringido en pantalla con botón de rescate directo */}
          {hasError && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-[#14120F]/95 border border-red-500/70 text-red-200 text-sm font-bold shadow-2xl flex items-center gap-4 backdrop-blur-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span>{hasError}</span>
                <span className="block text-xs text-slate-400 font-normal mt-0.5">Buscando alternativa o salta con el operador.</span>
              </div>
              <button
                type="button"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${currentTrack.videoId}&autoplay=1`, '_blank')}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow active:scale-95 pointer-events-auto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir en YouTube
              </button>
            </div>
          )}

          {/* Overlay Inferior de Marca Escenario 89 con Fade-Out automático a los 5s */}
          <div
            className={`absolute bottom-8 left-8 right-8 z-40 transition-all duration-700 ease-out transform ${
              showOverlay
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6 pointer-events-none'
            }`}
          >
            <div className="bg-[#090807]/95 backdrop-blur-md border border-[#D4AF37]/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(212,175,55,0.3)] flex items-center justify-between gap-6 max-w-4xl mx-auto">
              {/* Info Canción Actual */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-[2px] flex-shrink-0 shadow">
                  <div className="w-full h-full bg-[#090807] rounded-[10px] flex items-center justify-center">
                    <Music className="w-6 h-6 text-amber-400" />
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <Radio className="w-3 h-3 text-emerald-400" />
                    Reproduciendo Ahora • Escenario 89
                  </div>
                  <h2 className="text-xl font-bold text-white truncate drop-shadow-sm font-['Space_Grotesk',sans-serif]">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xs text-amber-200/80 truncate">
                    {currentTrack.author}
                  </p>
                </div>
              </div>

              {/* Info Siguiente Canción */}
              <div className="hidden sm:block text-right border-l border-[#332C22] pl-6 flex-shrink-0 max-w-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  A continuación
                </div>
                <p className="text-sm font-semibold text-amber-300 truncate mt-0.5" title={nextTrackTitle || 'Fin de la cola'}>
                  {nextTrackTitle || '¡Pide la siguiente canción!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
