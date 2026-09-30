import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { useKaraokeSync, MESSAGE_TYPES } from '../hooks/useKaraokeSync';
import StandbyScreen from '../components/StandbyScreen';
import { Music, Radio, ExternalLink, AlertTriangle, Film, Server, Cloud, Crown, Volume2 } from 'lucide-react';
import { logger } from '../utils/logger';
import { findDriveTrackByVideoId, findDriveTrackByFileId } from '../data/driveCatalog';


export default function DisplayView() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrackTitle, setNextTrackTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [hasError, setHasError] = useState(null);

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const trackStartTimeRef = useRef(0);
  const hasEndedDispatchedRef = useRef(false);
  const hasStartedPlayingRef = useRef(false);
  const unstartedWatchdogRef = useRef(null);
  const bufferWatchdogRef = useRef(null);
  const outroCheckIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Manejador del banner inferior con fade-out a los 12 segundos (10 a 15s según preferencia del usuario)
  const triggerOverlay = useCallback((durationMs = 12000) => {
    setShowOverlay(true);
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }
    overlayTimerRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, durationMs);
  }, []);

  // BroadcastChannel callbacks para Display
  const handlePlayNext = useCallback((payload) => {
    console.log('[Display] PLAY_NEXT recibido:', payload);
    setHasError(null);
    hasEndedDispatchedRef.current = false;
    hasStartedPlayingRef.current = false;
    trackStartTimeRef.current = Date.now();

    // Respetar tipo de pista: si viene configurada como Servidor VIP, enriquecer con datos de Drive
    let track = { ...payload };
    if ((track.isNative || track.isDriveHosted || track.driveFileId) && track.type !== 'native') {
      const driveMatch = (track.driveFileId ? findDriveTrackByFileId(track.driveFileId) : null) || 
                         (track.videoId ? findDriveTrackByVideoId(track.videoId) : null);
      if (driveMatch) {
        track = {
          ...track,
          ...driveMatch,
          isNative: true,
          isDriveHosted: true,
          badge: '👑 Servidor VIP',
        };
      }
    }

    currentTrackRef.current = track;
    setCurrentTrack(track);
    setNextTrackTitle(track.nextTrackTitle || '');
    setIsPlaying(true);
    triggerOverlay();

    if (track.isNative || track.isDriveHosted || track.driveFileId) {
      // Si es video de Servidor VIP o cortinilla nativa, garantizar reproducción directa
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
        unstartedWatchdogRef.current = null;
      }
      setTimeout(() => {
        if (nativeVideoRef.current) {
          try {
            if (nativeVideoRef.current.currentTime > 0) {
              nativeVideoRef.current.currentTime = 0;
            }
            nativeVideoRef.current.volume = volume / 100;
            const p = nativeVideoRef.current.play();
            if (p !== undefined) {
              p.catch((err) => {
                console.warn('[Display] Autoplay bloqueado por navegador. Iniciando en silencio:', err);
                nativeVideoRef.current.muted = true;
                nativeVideoRef.current.play().catch(() => {});
                setIsAudioUnlocked(false);
              });
            }
          } catch (e) {}
        }
      }, 50);
    } else {
      // Watchdog de arranque YouTube: Si en 12s el video no comienza a reproducir
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
      }
      unstartedWatchdogRef.current = setTimeout(() => {
        if (!hasStartedPlayingRef.current && currentTrackRef.current) {
          console.warn('[Display] El video no arrancó en 12s (bloqueo por derechos o error de carga). Activando fallback...');
          onPlayerError({ data: 150 });
        }
      }, 12000);

      if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch (err) {
          console.warn('[Display] Error al intentar reproducir inmediatamente:', err);
        }
      }
    }
  }, [triggerOverlay, volume]);


  const handlePlayerState = useCallback((payload) => {
    console.log('[Display] PLAYER_STATE recibido:', payload);
    setIsPlaying(payload.isPlaying);
    if ((currentTrackRef.current?.isNative || currentTrackRef.current?.isDriveHosted || currentTrackRef.current?.driveFileId) && nativeVideoRef.current) {
      if (payload.isPlaying) {
        nativeVideoRef.current.play().catch(() => {});
      } else {
        nativeVideoRef.current.pause();
      }
    } else if (playerRef.current) {
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
    if (nativeVideoRef.current) {
      try {
        nativeVideoRef.current.pause();
        nativeVideoRef.current.currentTime = 0;
      } catch (e) {}
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
    if (nativeVideoRef.current) {
      try {
        nativeVideoRef.current.pause();
        nativeVideoRef.current.currentTime = 0;
      } catch (e) {}
    }
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
    if ((currentTrackRef.current?.isNative || currentTrackRef.current?.isDriveHosted || currentTrackRef.current?.driveFileId) && nativeVideoRef.current) {
      try {
        nativeVideoRef.current.currentTime = 0;
        nativeVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
        triggerOverlay();
      } catch (e) {}
    } else if (playerRef.current) {
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
    if (nativeVideoRef.current) {
      nativeVideoRef.current.volume = newVol / 100;
    }
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
    }
  }, []);

  const handleSyncState = useCallback((payload) => {
    if (payload && payload.currentTrack) {
      let track = { ...payload.currentTrack };
      if (track.isNative || track.isDriveHosted || track.driveFileId) {
        const driveMatch = (track.driveFileId ? findDriveTrackByFileId(track.driveFileId) : null) || 
                           (track.videoId ? findDriveTrackByVideoId(track.videoId) : null);
        if (driveMatch) {
          track = {
            ...track,
            ...driveMatch,
            isNative: true,
            isDriveHosted: true,
            badge: '👑 Servidor VIP',
          };
        }
      }

      const isNewTrack = !currentTrackRef.current || currentTrackRef.current.queueId !== track.queueId;
      currentTrackRef.current = track;
      setCurrentTrack(track);
      setNextTrackTitle(payload.nextTrackTitle || '');
      setIsPlaying(payload.isPlaying);
      if (typeof payload.volume === 'number') {
        setVolume(payload.volume);
      }
      if (isNewTrack) {
        triggerOverlay(12000);
      }
      if (track.isNative || track.isDriveHosted || track.driveFileId) {
        setTimeout(() => {
          if (nativeVideoRef.current) {
            nativeVideoRef.current.volume = (typeof payload.volume === 'number' ? payload.volume : volume) / 100;
            if (payload.isPlaying) {
              const p = nativeVideoRef.current.play();
              if (p !== undefined) {
                p.catch((err) => {
                  console.warn('[Display] Autoplay bloqueado en sync. Iniciando en silencio:', err);
                  nativeVideoRef.current.muted = true;
                  nativeVideoRef.current.play().catch(() => {});
                  setIsAudioUnlocked(false);
                });
              }
            } else {
              nativeVideoRef.current.pause();
            }
          }
        }, 100);
      }
    } else {
      handleStandby();
    }
  }, [handleStandby, triggerOverlay, volume]);

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
      hasStartedPlayingRef.current = true;
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
        unstartedWatchdogRef.current = null;
      }
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
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
        unstartedWatchdogRef.current = null;
      }
      onPlayerEnd();
    }
  }, [onPlayerEnd]);

  const onPlayerError = (event) => {
    const errorCode = event.data;
    const currentVid = currentTrackRef.current?.videoId || currentTrack?.videoId || 'desconocido';
    const currentTit = currentTrackRef.current?.title || currentTrack?.title || 'Pista de Video';

    console.error('[Display] Error en YouTube IFrame Player:', errorCode, currentVid, currentTit);

    if (unstartedWatchdogRef.current) {
      clearTimeout(unstartedWatchdogRef.current);
      unstartedWatchdogRef.current = null;
    }
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

    // REGISTRO INMEDIATO E INCONDICIONAL EN LOGGER Y SENTRY
    const logEntry = logger.error('YouTube', `[Bloqueo YouTube ${errorCode}] "${currentTit}" (${currentVid}): ${errorMessage}`, {
      videoId: currentVid,
      title: currentTit,
      errorCode,
      errorMessage,
    });

    try {
      Sentry.captureMessage(`[YouTube Bloqueo ${errorCode}] ${currentTit}`, {
        level: 'error',
        tags: {
          errorCode: String(errorCode),
          videoId: currentVid,
          pantalla: 'display_proyector',
          tipo: 'bloqueo_derechos_autor',
        },
        extra: {
          title: currentTit,
          videoId: currentVid,
          author: currentTrackRef.current?.author,
          errorMessage,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {}

    // Notificar al operador vía canal para auto-fallback y registro sincronizado
    broadcast(MESSAGE_TYPES.ERROR_RESTRICTED, {
      videoId: currentVid,
      title: currentTit,
      queueId: currentTrackRef.current?.queueId || currentTrack?.queueId,
      errorCode,
      message: errorMessage,
    });

    // Enviar también el log para que aparezca en la consola del operador
    broadcast(MESSAGE_TYPES.LOG_REMOTE, logEntry);

    hasEndedDispatchedRef.current = true;

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
    if (nativeVideoRef.current) {
      try {
        nativeVideoRef.current.muted = false;
        nativeVideoRef.current.volume = volume / 100;
      } catch (e) {}
    }
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
          {currentTrack.isNative || currentTrack.isDriveHosted || currentTrack.driveFileId ? (() => {
            const streamSrc = currentTrack.driveFileId
              ? `/api/stream?id=${currentTrack.driveFileId}`
              : (currentTrack.videoUrl 
                  ? currentTrack.videoUrl 
                  : (currentTrack.videoId ? `/api/stream?v=${currentTrack.videoId}` : ''));

            return (
              /* Contenedor Video Nativo HTML5 para Servidor VIP y Cortinillas */
              <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
                <video
                  ref={nativeVideoRef}
                  key={currentTrack.driveFileId || currentTrack.videoId || currentTrack.videoUrl}
                  src={streamSrc}
                  autoPlay
                  playsInline
                  muted={!isAudioUnlocked}
                  preload="auto"
                  className="w-full h-full object-contain bg-black"
                  onCanPlay={(e) => {
                    e.target.volume = volume / 100;
                    const p = e.target.play();
                    if (p !== undefined) {
                      p.then(() => {
                        hasStartedPlayingRef.current = true;
                        setIsPlaying(true);
                      }).catch((err) => {
                        console.warn('[Display] Autoplay con audio bloqueado en canPlay. Reproduciendo en silencio:', err);
                        e.target.muted = true;
                        e.target.play().catch(() => {});
                        setIsAudioUnlocked(false);
                      });
                    }
                  }}
                  onPlaying={() => {
                    hasStartedPlayingRef.current = true;
                    setIsPlaying(true);
                  }}
                  onEnded={onPlayerEnd}
                  onError={(err) => {
                    console.warn('[Display] Video VIP / Cortinilla error de carga:', err);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  <source src={streamSrc} type="video/mp4" />
                  {currentTrack.videoUrl && currentTrack.videoUrl !== streamSrc && (
                    <source src={currentTrack.videoUrl} type="video/mp4" />
                  )}
                  {currentTrack.driveStreamUrl && currentTrack.driveStreamUrl !== streamSrc && (
                    <source src={currentTrack.driveStreamUrl} type="video/mp4" />
                  )}
                  {currentTrack.filename && (
                    <source src={`/api/videos/${encodeURIComponent(currentTrack.filename)}`} type="video/mp4" />
                  )}
                </video>
              </div>
            );
          })() : (
            /* Contenedor IFrame YouTube calibrado a 100vw / 100vh sin pointer-events */
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
          )}

          {/* Banner para activar audio si el navegador aplicó política de autoplay silenciado */}
          {!isAudioUnlocked && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleUnlockAudio();
              }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-extrabold text-sm shadow-[0_0_35px_rgba(245,158,11,0.7)] flex items-center gap-3 cursor-pointer animate-pulse hover:scale-105 transition active:scale-95 border-2 border-yellow-200 pointer-events-auto"
            >
              <Volume2 className="w-5 h-5 animate-bounce text-black flex-shrink-0" />
              <span>Haz clic aquí o en la pantalla para activar el audio del escenario</span>
            </div>
          )}

          {/* Notificación de Error Restringido en pantalla con botón de rescate directo */}
          {hasError && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-[#14120F]/95 border border-red-500/70 text-red-200 text-sm font-bold shadow-2xl flex items-center gap-4 backdrop-blur-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span>{hasError}</span>
                <span className="block text-xs text-slate-400 font-normal mt-0.5">El operador está seleccionando una versión compatible...</span>
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

          {/* Overlay Inferior de Marca Escenario 89 con Fade-Out automático a los 12s (10-15s) */}
          <div
            className={`absolute bottom-8 left-8 right-8 z-40 transition-all duration-1000 ease-out transform ${
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
                    {currentTrack.type === 'native' || currentTrack.category?.includes('Cortinilla') || currentTrack.badge?.includes('Cortinilla') ? (
                      <Film className="w-6 h-6 text-purple-400" />
                    ) : currentTrack.isNative ? (
                      currentTrack.isDriveHosted || currentTrack.isServerHosted || (currentTrack.badge && currentTrack.badge.includes('VIP')) ? (
                        <Crown className="w-6 h-6 text-amber-400" />
                      ) : (
                        <Film className="w-6 h-6 text-purple-400" />
                      )
                    ) : (
                      <Music className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {currentTrack.type === 'native' || currentTrack.category?.includes('Cortinilla') || currentTrack.badge?.includes('Cortinilla') ? (
                      <>
                        <Film className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-purple-300">Cortinilla en Vivo • Escenario 89</span>
                      </>
                    ) : currentTrack.isNative ? (
                      currentTrack.isDriveHosted || currentTrack.isServerHosted || (currentTrack.badge && currentTrack.badge.includes('VIP')) ? (
                        <>
                          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-amber-300">👑 Servidor VIP • Escenario 89</span>
                        </>
                      ) : (
                        <>
                          <Film className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-purple-300">Cortinilla en Vivo • Escenario 89</span>
                        </>
                      )
                    ) : (
                      <>
                        <Radio className="w-3 h-3 text-emerald-400" />
                        <span>Reproduciendo Ahora • Escenario 89</span>
                      </>
                    )}
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
