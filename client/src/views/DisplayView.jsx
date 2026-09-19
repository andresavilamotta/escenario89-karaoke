import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { useKaraokeSync, MESSAGE_TYPES } from '../hooks/useKaraokeSync';
import StandbyScreen from '../components/StandbyScreen';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import AnimationSelector from '../components/AnimationSelector';
import { searchDriveCatalog, findDriveTrackByVideoId } from '../data/driveCatalog';
import { findServerTrackByVideoId } from '../data/serverCatalog';
import {
  Music, Radio, ExternalLink, AlertTriangle, Film, Crown, Volume2, VolumeX,
  Play, Pause, SkipForward, RotateCcw, Search, ListMusic, Maximize, Minimize,
  X, Sparkles, Trash2, ArrowUp, ArrowDown, Mic, Clock, CheckCircle
} from 'lucide-react';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';

export default function DisplayView() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [nextTrackTitle, setNextTrackTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [hasError, setHasError] = useState(null);

  // Estado para el modo de Pantalla Única (Todo-en-Uno)
  const [queue, setQueue] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('search'); // 'search' | 'queue' | 'animations'
  const [searchMode, setSearchMode] = useState('karaoke');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quickNotice, setQuickNotice] = useState('');

  const playerRef = useRef(null);
  const nativeVideoRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const hudTimerRef = useRef(null);
  const quickNoticeTimerRef = useRef(null);
  const currentTrackRef = useRef(null);
  const queueRef = useRef([]);
  const trackStartTimeRef = useRef(0);
  const hasEndedDispatchedRef = useRef(false);
  const hasStartedPlayingRef = useRef(false);
  const unstartedWatchdogRef = useRef(null);
  const bufferWatchdogRef = useRef(null);
  const outroCheckIntervalRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Mantener referencia sincronizada de la cola
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const showToast = useCallback((msg) => {
    setQuickNotice(msg);
    if (quickNoticeTimerRef.current) clearTimeout(quickNoticeTimerRef.current);
    quickNoticeTimerRef.current = setTimeout(() => {
      setQuickNotice('');
    }, 2800);
  }, []);

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

  // Auto-ocultado inteligente del HUD al no mover el ratón
  const resetHudTimer = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      // Ocultar solo si no está en standby, está reproduciendo y el drawer está cerrado
      if (!isDrawerOpen) {
        setIsHudVisible(false);
      }
    }, 3500);
  }, [isDrawerOpen]);

  useEffect(() => {
    const handleMouseMove = () => resetHudTimer();
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [resetHudTimer]);

  // Manejador para iniciar una pista
  const handlePlayNext = useCallback((payload) => {
    console.log('[Display] handlePlayNext:', payload);
    setHasError(null);
    hasEndedDispatchedRef.current = false;
    hasStartedPlayingRef.current = false;
    trackStartTimeRef.current = Date.now();
    currentTrackRef.current = payload;
    setCurrentTrack(payload);
    setNextTrackTitle(payload.nextTrackTitle || '');
    setIsPlaying(true);
    triggerOverlay();

    if (payload.isNative) {
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
        unstartedWatchdogRef.current = null;
      }
      hasStartedPlayingRef.current = true;
      setTimeout(() => {
        if (nativeVideoRef.current) {
          try {
            nativeVideoRef.current.currentTime = 0;
            nativeVideoRef.current.volume = isMuted ? 0 : volume / 100;
            const p = nativeVideoRef.current.play();
            if (p !== undefined) {
              p.catch((err) => {
                console.warn('[Display] Autoplay with audio was blocked. Starting muted:', err);
                nativeVideoRef.current.muted = true;
                nativeVideoRef.current.play().catch(() => {});
                setIsAudioUnlocked(false);
              });
            }
          } catch (e) {}
        }
      }, 50);
    } else {
      if (unstartedWatchdogRef.current) {
        clearTimeout(unstartedWatchdogRef.current);
      }
      unstartedWatchdogRef.current = setTimeout(() => {
        if (!hasStartedPlayingRef.current && currentTrackRef.current) {
          console.warn('[Display] El video no arrancó en 6.5s. Activando fallback...');
          onPlayerError({ data: 150 });
        }
      }, 6500);

      if (playerRef.current) {
        try {
          playerRef.current.playVideo();
        } catch (err) {
          console.warn('[Display] Error al reproducir video de YouTube:', err);
        }
      }
    }
  }, [triggerOverlay, volume, isMuted]);

  const handleStandby = useCallback(() => {
    console.log('[Display] STANDBY. Volviendo a pantalla inicial (Home)');
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

  const handleSkip = useCallback(() => {
    console.log('[Display] Saltar canción (Skip)');
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const next = prevQueue[0];
        const remaining = prevQueue.slice(1);
        handlePlayNext({
          ...next,
          nextTrackTitle: remaining[0]?.title || '',
        });
        showToast(`Saltando a: "${next.title}"`);
        return remaining;
      } else {
        handleStandby();
        showToast('Fin de la cola. Pantalla de espera activada.');
        return [];
      }
    });
  }, [handlePlayNext, handleStandby, showToast]);

  const handleRestartTrack = useCallback(() => {
    console.log('[Display] Reiniciando canción (0:00)');
    trackStartTimeRef.current = Date.now();
    hasEndedDispatchedRef.current = false;
    if (currentTrackRef.current?.isNative && nativeVideoRef.current) {
      try {
        nativeVideoRef.current.currentTime = 0;
        nativeVideoRef.current.play().catch(() => {});
        setIsPlaying(true);
        triggerOverlay();
        showToast('Reiniciando canción (0:00)');
      } catch (e) {}
    } else if (playerRef.current) {
      try {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        triggerOverlay();
        showToast('Reiniciando canción (0:00)');
      } catch (e) {}
    }
  }, [triggerOverlay, showToast]);

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) {
      if (queue.length > 0) {
        handleSkip();
      } else {
        setIsDrawerOpen(true);
      }
      return;
    }

    const nextPlayState = !isPlaying;
    setIsPlaying(nextPlayState);

    if (currentTrack?.isNative && nativeVideoRef.current) {
      if (nextPlayState) {
        nativeVideoRef.current.play().catch(() => {});
        showToast('Reanudando reproducción');
      } else {
        nativeVideoRef.current.pause();
        showToast('Pausa');
      }
    } else if (playerRef.current) {
      if (nextPlayState) {
        playerRef.current.playVideo();
        showToast('Reanudando reproducción');
      } else {
        playerRef.current.pauseVideo();
        showToast('Pausa');
      }
    }
  }, [currentTrack, isPlaying, queue.length, handleSkip, showToast]);

  const handleChangeVolume = useCallback((newVol) => {
    setVolume(newVol);
    setIsMuted(false);
    if (nativeVideoRef.current) {
      nativeVideoRef.current.muted = false;
      nativeVideoRef.current.volume = newVol / 100;
    }
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      try {
        playerRef.current.unMute();
        playerRef.current.setVolume(newVol);
      } catch (e) {}
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextMute = !prev;
      if (nativeVideoRef.current) {
        nativeVideoRef.current.muted = nextMute;
        if (!nextMute) nativeVideoRef.current.volume = volume / 100;
      }
      if (playerRef.current) {
        try {
          if (nextMute) playerRef.current.mute();
          else {
            playerRef.current.unMute();
            playerRef.current.setVolume(volume);
          }
        } catch (e) {}
      }
      showToast(nextMute ? 'Audio silenciado' : `Audio activado (${volume}%)`);
      return nextMute;
    });
  }, [volume, showToast]);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      showToast('Pantalla completa activada');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
      showToast('Saliendo de pantalla completa');
    }
  }, [showToast]);

  // BroadcastChannel para sincronizar si hay una segunda ventana abierta
  const { broadcast } = useKaraokeSync('display', {
    [MESSAGE_TYPES.PLAY_NEXT]: handlePlayNext,
    [MESSAGE_TYPES.PLAYER_STATE]: (p) => setIsPlaying(p.isPlaying),
    [MESSAGE_TYPES.SKIP_TRACK]: handleSkip,
    [MESSAGE_TYPES.RESTART_TRACK]: handleRestartTrack,
    [MESSAGE_TYPES.SET_VOLUME]: (p) => handleChangeVolume(p.volume),
    [MESSAGE_TYPES.STANDBY]: handleStandby,
  });

  // Limpieza de temporizadores al desmontar
  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      if (bufferWatchdogRef.current) clearTimeout(bufferWatchdogRef.current);
      if (outroCheckIntervalRef.current) clearInterval(outroCheckIntervalRef.current);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      if (quickNoticeTimerRef.current) clearTimeout(quickNoticeTimerRef.current);
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch (e) {}
      }
    };
  }, []);

  // Evento cuando una pista finaliza de forma natural
  const onPlayerEnd = useCallback(() => {
    const elapsed = Date.now() - trackStartTimeRef.current;
    console.log(`[Display] onPlayerEnd recibido tras ${elapsed}ms`);

    if (elapsed < 4000) {
      console.warn('[Display] Fin de video abortado por tiempo menor a 4s.');
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

    console.log('[Display] Video finalizó. Avanzando a la siguiente canción...');
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const nextTrack = prevQueue[0];
        const remainingQueue = prevQueue.slice(1);
        setTimeout(() => {
          handlePlayNext({
            ...nextTrack,
            nextTrackTitle: remainingQueue[0]?.title || '',
          });
        }, 400);
        return remainingQueue;
      } else {
        setTimeout(() => {
          handleStandby();
        }, 400);
        return [];
      }
    });
  }, [handlePlayNext, handleStandby]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    try {
      playerRef.current.setVolume(volume);
      if (isPlaying) {
        playerRef.current.playVideo();
      }
    } catch (e) {}
  };

  const onStateChange = useCallback((event) => {
    const state = event.data;
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

      if ('wakeLock' in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request('screen')
          .then((lock) => { wakeLockRef.current = lock; })
          .catch(() => {});
      }

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
          console.warn('[Display] Buffer congelado. Reintentando reproducir...');
          if (playerRef.current) {
            try { playerRef.current.playVideo(); } catch (e) {}
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

    const logEntry = logger.error('YouTube', `[Bloqueo YouTube ${errorCode}] "${currentTit}" (${currentVid}): ${errorMessage}`, {
      videoId: currentVid,
      title: currentTit,
      errorCode,
      errorMessage,
    });

    try {
      Sentry.captureMessage(`[YouTube Bloqueo ${errorCode}] ${currentTit}`, {
        level: 'error',
        tags: { errorCode: String(errorCode), videoId: currentVid, tipo: 'bloqueo_derechos_autor' },
        extra: { title: currentTit, videoId: currentVid, errorMessage },
      });
    } catch (e) {}

    hasEndedDispatchedRef.current = true;
    setTimeout(() => {
      setHasError(null);
    }, 4000);
  };

  // Métodos de búsqueda y adición a la cola
  const handleSearch = useCallback(async (query, mode = searchMode) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchMode(mode);
    setIsSearching(true);
    try {
      const vipMatches = searchDriveCatalog(query);
      if (vipMatches.length > 0) {
        setSearchResults(vipMatches);
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      if (!res.ok) throw new Error(`Error (${res.status})`);
      const data = await res.json();
      const ytResults = data.results || [];

      const enriched = ytResults.map((ytVid) => {
        const match = findDriveTrackByVideoId(ytVid.videoId) || findServerTrackByVideoId(ytVid.videoId);
        if (match) {
          return { ...ytVid, ...match, isNative: true, isDriveHosted: true, badge: '👑 Servidor VIP' };
        }
        return ytVid;
      });

      const vipIds = new Set(vipMatches.map((s) => s.videoId));
      const filteredYt = enriched.filter((y) => !vipIds.has(y.videoId));
      setSearchResults([...vipMatches, ...filteredYt]);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      const vipMatches = searchDriveCatalog(query);
      if (vipMatches.length > 0) {
        setSearchResults(vipMatches);
      }
    } finally {
      setIsSearching(false);
    }
  }, [searchMode]);

  const handleAddToQueue = useCallback((video) => {
    const driveMatch = findDriveTrackByVideoId(video.videoId);
    const serverMatch = findServerTrackByVideoId(video.videoId);
    const trackToEnqueue = driveMatch
      ? { ...video, ...driveMatch, isNative: true, isDriveHosted: true, badge: '👑 Servidor VIP' }
      : serverMatch
      ? { ...video, ...serverMatch, isNative: true, isDriveHosted: true, badge: '👑 Servidor VIP' }
      : video;

    const newTrack = {
      ...trackToEnqueue,
      queueId: `${trackToEnqueue.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    if (!currentTrack) {
      handlePlayNext({
        ...newTrack,
        nextTrackTitle: '',
      });
      showToast(`Iniciando ahora: "${newTrack.title}"`);
      setIsDrawerOpen(false);
    } else {
      setQueue((prev) => {
        const nextQ = [...prev, newTrack];
        if (prev.length === 0) {
          setNextTrackTitle(newTrack.title);
        }
        return nextQ;
      });
      showToast(`Añadido a la cola (#${queue.length + 1}): "${newTrack.title}"`);
    }
  }, [currentTrack, queue.length, handlePlayNext, showToast]);

  const handlePlayNow = useCallback((track) => {
    setQueue((prev) => prev.filter((t) => t.queueId !== track.queueId));
    handlePlayNext({
      ...track,
      nextTrackTitle: queue.filter((t) => t.queueId !== track.queueId)[0]?.title || '',
    });
    showToast(`Reproduciendo ahora: "${track.title}"`);
    setIsDrawerOpen(false);
  }, [queue, handlePlayNext, showToast]);

  const handleRemoveTrack = useCallback((queueId) => {
    setQueue((prev) => {
      const filtered = prev.filter((t) => t.queueId !== queueId);
      setNextTrackTitle(filtered[0]?.title || '');
      return filtered;
    });
    showToast('Pista eliminada de la cola');
  }, [showToast]);

  const handleMoveUp = useCallback((index) => {
    if (index <= 0) return;
    setQueue((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      setNextTrackTitle(next[0]?.title || '');
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index) => {
    setQueue((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      setNextTrackTitle(next[0]?.title || '');
      return next;
    });
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
    setNextTrackTitle('');
    showToast('Cola de reproducción vaciada');
  }, [showToast]);

  const handlePlayNativeNow = useCallback((animation) => {
    handlePlayNext({
      ...animation,
      queueId: `native-${Date.now()}`,
      isNative: true,
      nextTrackTitle: queue[0]?.title || '',
    });
    showToast(`Iniciando cortinilla: "${animation.title}"`);
    setIsDrawerOpen(false);
  }, [queue, handlePlayNext, showToast]);

  // Atajos de teclado globales para control de pantalla única
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        if (e.key === 'Escape') {
          setIsDrawerOpen(false);
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'n' || e.key === 'N') {
        handleSkip();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRestartTrack();
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen();
      } else if (e.key === '/' || e.key === 's' || e.key === 'S' || e.key === 'Enter') {
        e.preventDefault();
        setIsDrawerOpen(true);
      } else if (e.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleSkip, handleRestartTrack, handleToggleFullscreen]);

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

  return (
    <div
      className="relative w-screen h-screen bg-[#040404] overflow-hidden select-none font-['Outfit',sans-serif]"
      onClick={handleUnlockAudio}
    >
      {/* Toast flotante de notificación rápida */}
      {quickNotice && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-black/85 border border-amber-500/50 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-fadeIn pointer-events-none">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{quickNotice}</span>
        </div>
      )}

      {/* ESTADO 1: Standby cuando no hay tema sonando */}
      {!currentTrack?.videoId ? (
        <StandbyScreen
          onUnlockAudio={handleUnlockAudio}
          isAudioUnlocked={isAudioUnlocked}
          onOpenSearch={() => {
            setActiveDrawerTab('search');
            setIsDrawerOpen(true);
          }}
        />
      ) : (
        /* ESTADO 2: Reproduciendo video en pantalla completa */
        <div className="relative w-full h-full">
          {currentTrack.isNative ? (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
              <video
                ref={nativeVideoRef}
                key={currentTrack.videoUrl || currentTrack.videoId}
                src={currentTrack.videoUrl}
                autoPlay
                playsInline
                preload="auto"
                className="w-full h-full object-cover"
                onLoadedMetadata={(e) => {
                  e.target.volume = isMuted ? 0 : volume / 100;
                  if (isPlaying) {
                    const p = e.target.play();
                    if (p !== undefined) {
                      p.catch((err) => {
                        console.warn('[Display] Autoplay with audio prevented:', err);
                        e.target.muted = true;
                        e.target.play().catch(() => {});
                        setIsAudioUnlocked(false);
                      });
                    }
                  }
                }}
                onEnded={onPlayerEnd}
                onError={(err) => console.error('[Display] Error en video nativo:', err)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          ) : (
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

          {/* Notificación de Error Restringido en pantalla */}
          {hasError && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-[#14120F]/95 border border-red-500/70 text-red-200 text-sm font-bold shadow-2xl flex items-center gap-4 backdrop-blur-xl">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <span>{hasError}</span>
                <span className="block text-xs text-slate-400 font-normal mt-0.5">Avanzando a la siguiente canción o abriendo YouTube...</span>
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
            className={`absolute bottom-24 left-8 right-8 z-40 transition-all duration-700 ease-out transform pointer-events-none ${
              showOverlay
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6 pointer-events-none'
            }`}
          >
            <div className="bg-[#090807]/95 backdrop-blur-md border border-[#D4AF37]/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(212,175,55,0.3)] flex items-center justify-between gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-[2px] flex-shrink-0 shadow">
                  <div className="w-full h-full bg-[#090807] rounded-[10px] flex items-center justify-center">
                    {currentTrack.isNative ? (
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
                    {currentTrack.isNative ? (
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

      {/* =========================================================================
          BARRA DE CONTROL FLOTANTE (HUD) - AUTO-OCULTABLE
          ========================================================================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ease-out transform ${
          isHudVisible || !isPlaying || !currentTrack || isDrawerOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        <div className="bg-[#0A0907]/90 backdrop-blur-2xl border border-amber-500/40 rounded-2xl px-4 py-2.5 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex items-center gap-3 max-w-[95vw]">
          {/* Botón Principal de Búsqueda */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawerTab('search');
              setIsDrawerOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-extrabold text-xs tracking-wide shadow-md shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
            <span>Buscar Canción</span>
            <span className="hidden sm:inline text-[10px] font-mono opacity-75">(/)</span>
          </button>

          {/* Botón de Cola de Reproducción */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawerTab('queue');
              setIsDrawerOpen(true);
            }}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
              queue.length > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <ListMusic className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Cola</span>
            {queue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black font-mono text-[10px] font-extrabold">
                {queue.length}
              </span>
            )}
          </button>

          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          {/* Controles de Transporte: Play/Pausa, Reiniciar, Saltar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
            </button>

            <button
              type="button"
              onClick={handleRestartTrack}
              title="Reiniciar desde 0:00 (R)"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleSkip}
              title="Siguiente pista (N)"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="w-[1px] h-6 bg-white/15 mx-1 hidden sm:block" />

          {/* Control de Volumen */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              className="text-amber-400 hover:text-amber-300 transition cursor-pointer"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleChangeVolume(Number(e.target.value))}
              className="w-16 md:w-20 accent-amber-400 h-1.5 rounded bg-white/20 cursor-pointer"
            />
          </div>

          <div className="w-[1px] h-6 bg-white/15 mx-1" />

          {/* Botón de Pantalla Completa */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL / CAJÓN FLOTANTE INTEGRADO DE BÚSQUEDA Y COLA
          ========================================================================= */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/75 backdrop-blur-xl animate-fadeIn"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#0E0C09] border border-amber-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white font-['Outfit',sans-serif]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Panel */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#332C22] bg-[#14100B]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 p-[1.5px] shadow">
                  <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center overflow-hidden">
                    <img src="/logo-escenario89.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-['Space_Grotesk',sans-serif] tracking-wide">
                    ESCENARIO 89 • PANEL DE CONTROL
                  </h3>
                  <p className="text-[11px] text-amber-400/80 font-medium">
                    Pantalla Única • Búsqueda Instantánea y Gestión de Turnos
                  </p>
                </div>
              </div>

              {/* Selector de Pestañas */}
              <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-[#332C22]">
                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('search')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'search'
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Buscador</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('queue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'queue'
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  <span>Cola</span>
                  {queue.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/60 text-amber-300 font-mono">
                      {queue.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveDrawerTab('animations')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeDrawerTab === 'animations'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Cortinillas</span>
                </button>
              </div>

              {/* Botón de Cerrar */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido según la pestaña activa */}
            <div className="flex-1 overflow-y-auto p-6 min-h-[420px] max-h-[calc(90vh-140px)]">
              {activeDrawerTab === 'search' && (
                <div className="flex flex-col gap-4">
                  <SearchBar
                    onSearch={handleSearch}
                    isLoading={isSearching}
                    initialMode={searchMode}
                  />

                  <div className="mt-2">
                    <SearchResults
                      results={searchResults}
                      onAddToQueue={handleAddToQueue}
                      onSelectSuggestion={(sug) => handleSearch(sug, searchMode)}
                      searchMode={searchMode}
                    />
                  </div>
                </div>
              )}

              {activeDrawerTab === 'queue' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#332C22]">
                    <div>
                      <h4 className="text-base font-bold text-white font-['Space_Grotesk',sans-serif]">
                        Canciones en Espera ({queue.length})
                      </h4>
                      <p className="text-xs text-slate-400">
                        {queue.length === 0
                          ? 'No hay canciones en la lista. Busca temas para agregarlos al turno.'
                          : 'Las canciones sonarán automáticamente en el orden listado.'}
                      </p>
                    </div>

                    {queue.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearQueue}
                        className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Vaciar Cola
                      </button>
                    )}
                  </div>

                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                        <ListMusic className="w-8 h-8 text-amber-400" />
                      </div>
                      <p className="text-base font-bold text-slate-200">La cola está vacía</p>
                      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-5">
                        Elige canciones desde el buscador para mantener el escenario con música continua.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveDrawerTab('search')}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-extrabold shadow hover:brightness-110 transition cursor-pointer"
                      >
                        Ir al Buscador
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {queue.map((track, idx) => (
                        <div
                          key={track.queueId || `${track.videoId}-${idx}`}
                          className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#14120F] border border-[#332C22] hover:border-amber-500/40 transition group"
                        >
                          <span className="w-7 text-center font-mono text-xs font-extrabold text-amber-400">
                            #{idx + 1}
                          </span>

                          <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-[#332C22]">
                            <img
                              src={track.thumbnail}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                            {track.badge && track.badge.includes('VIP') && (
                              <span className="absolute top-0.5 left-0.5 px-1 rounded bg-amber-400 text-black text-[9px] font-black">
                                VIP
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-semibold text-white truncate font-['Space_Grotesk',sans-serif]">
                              {track.title}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                              <span className="truncate max-w-[150px]">{track.author}</span>
                              <span>•</span>
                              <span className="font-mono text-amber-200/70">{track.duration}</span>
                              {track.badge && track.badge.includes('VIP') && (
                                <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                                  <Crown className="w-2.5 h-2.5" /> Servidor VIP
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Acciones de la pista en cola */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePlayNow(track)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Reproducir de inmediato"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span className="hidden sm:inline">Tocar Ya</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveUp(idx)}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              title="Subir turno"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveDown(idx)}
                              disabled={idx === queue.length - 1}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                              title="Bajar turno"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveTrack(track.queueId)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition cursor-pointer"
                              title="Quitar de la cola"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDrawerTab === 'animations' && (
                <div className="flex flex-col gap-4">
                  <div className="pb-2 border-b border-[#332C22]">
                    <h4 className="text-base font-bold text-white font-['Space_Grotesk',sans-serif]">
                      Cortinillas & Visuales Oficiales de Escenario 89
                    </h4>
                    <p className="text-xs text-slate-400">
                      Proyecta animaciones exclusivas del bar entre tandas de karaoke o para animar al público.
                    </p>
                  </div>

                  <AnimationSelector
                    onAddToQueue={handleAddToQueue}
                    onPlayNow={handlePlayNativeNow}
                    onInterleave={(anim) => {
                      setQueue((prev) => [anim, ...prev]);
                      showToast(`Cortinilla interpuesta como siguiente: "${anim.title}"`);
                    }}
                    queueLength={queue.length}
                  />
                </div>
              )}
            </div>

            {/* Footer con atajos de teclado */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[#332C22] bg-[#14100B] text-[11px] text-slate-400">
              <div className="flex items-center gap-3 flex-wrap">
                <span><kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-[#332C22] font-mono text-amber-300">Esc</kbd> Cerrar</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-[#332C22] font-mono text-amber-300">Espacio</kbd> Play/Pausa</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-[#332C22] font-mono text-amber-300">N</kbd> Siguiente</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-[#332C22] font-mono text-amber-300">R</kbd> Reiniciar</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-black/80 border border-[#332C22] font-mono text-amber-300">F</kbd> Pantalla Completa</span>
              </div>
              <span className="text-amber-400/80 font-bold hidden sm:inline">Escenario 89 • Mocoa</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
