import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useKaraokeSync, MESSAGE_TYPES } from '../hooks/useKaraokeSync';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import QueueManager from '../components/QueueManager';
import PlayerControls from '../components/PlayerControls';
import NotificationCenter from '../components/NotificationCenter';
import LogViewerModal from '../components/LogViewerModal';
import QueueValidator from '../components/QueueValidator';
import TrackAlertModal from '../components/TrackAlertModal';
import { Mic, Sparkles, LogOut } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import IntroSplash from '../components/IntroSplash';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';


const STORAGE_KEY = 'karaoke_operator_state_v1';

export default function OperatorView() {
  const { logout } = useAuth();

  // Estados principales
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState('karaoke');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);

  // Estado de validación silenciosa Pre-Flight de la cola
  const [validationMap, setValidationMap] = useState({});

  // Estado del Modal de Alerta y Rescate de Canción
  const [alertModalState, setAlertModalState] = useState({
    isOpen: false,
    track: null,
    isCurrentTrack: false,
    reason: '',
  });

  // Estados del Centro de Notificaciones (sin popups invasivos que tapen la pantalla)
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Referencias para evitar stale closures en callbacks del BroadcastChannel
  const currentTrackRef = useRef(currentTrack);
  const queueRef = useRef(queue);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const searchModeRef = useRef(searchMode);
  const fallbackAttemptsRef = useRef(new Set());
  const lastAdvanceTimeRef = useRef(0);
  const isAdvancingRef = useRef(false);

  // Referencia segura al broadcast para evitar ReferenceError de inicialización (TDZ)
  const broadcastRef = useRef(null);
  const broadcast = useCallback((type, payload) => {
    if (broadcastRef.current) {
      broadcastRef.current(type, payload);
    }
  }, []);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    queueRef.current = queue;
    isPlayingRef.current = isPlaying;
    volumeRef.current = volume;
    searchModeRef.current = searchMode;
  }, [currentTrack, queue, isPlaying, volume, searchMode]);

  // Atajo secreto de teclado: Ctrl + L o Ctrl + Shift + L para abrir Diagnóstico y Logs
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setIsLogsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Atajo secreto en pantalla: Triple clic en el logo de Escenario 89
  const logoClicksRef = useRef({ count: 0, lastTime: 0, timer: null });
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - logoClicksRef.current.lastTime > 1000) {
      logoClicksRef.current.count = 1;
    } else {
      logoClicksRef.current.count += 1;
    }
    logoClicksRef.current.lastTime = now;

    if (logoClicksRef.current.timer) {
      clearTimeout(logoClicksRef.current.timer);
    }

    if (logoClicksRef.current.count >= 3) {
      logoClicksRef.current.count = 0;
      setIsLogsOpen((prev) => !prev);
    } else {
      // Si fue solo un clic sencillo, esperar 350ms antes de disparar la intro para permitir triple clic
      logoClicksRef.current.timer = setTimeout(() => {
        if (logoClicksRef.current.count === 1) {
          setShowIntroModal(true);
        }
        logoClicksRef.current.count = 0;
      }, 350);
    }
  };

  // Registro de notificaciones en el Centro de Notificaciones
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    const time = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    setNotifications((prev) => [{ id, message, type, time }, ...prev].slice(0, 50));
    setHasUnread(true);

    // Conexión automática con el Logger central y Sentry
    if (type === 'error') {
      logger.error('Operador', message);
      try {
        Sentry.captureMessage(`[Operador] ${message}`, {
          level: 'error',
          tags: { canal: 'notificacion_operador' },
          extra: { currentTrack: currentTrackRef.current },
        });
      } catch (e) {}
    } else if (type === 'warning') {
      logger.warn('Operador', message);
    } else {
      logger.info('Operador', message);
    }
  }, []);


  // Cargar estado inicial desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.queue && Array.isArray(parsed.queue)) {
          setQueue(parsed.queue);
        }
        if (parsed.currentTrack) {
          setCurrentTrack(parsed.currentTrack);
        }
        if (typeof parsed.volume === 'number') {
          setVolume(parsed.volume);
        }
      }
    } catch (e) {
      console.warn('Error al leer estado de localStorage:', e);
    }
  }, []);

  // Guardar en localStorage ante cambios en queue, currentTrack o volume
  useEffect(() => {
    try {
      const stateToSave = {
        queue,
        currentTrack,
        volume,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Error al guardar estado en localStorage:', e);
    }
  }, [queue, currentTrack, volume]);

  // Avanzar a la siguiente canción en la cola con guardia de cooldown y actualización funcional atómica
  const advanceToNextTrack = useCallback((source = 'auto') => {
    const now = Date.now();
    // Guardia de Cooldown (2.5s) contra saltos en ráfaga
    if (now - lastAdvanceTimeRef.current < 2500) {
      console.warn(`[Operador] Avance bloqueado por Cooldown (${now - lastAdvanceTimeRef.current}ms). Previene salto en cascada.`);
      return;
    }

    if (isAdvancingRef.current) {
      console.warn('[Operador] Transición en curso, ignorando concurrencia.');
      return;
    }

    isAdvancingRef.current = true;
    lastAdvanceTimeRef.current = now;

    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const [nextSong, ...remaining] = prevQueue;
        const nextTitle = remaining[0]?.title || '';

        setCurrentTrack(nextSong);
        setIsPlaying(true);

        broadcast(MESSAGE_TYPES.PLAY_NEXT, {
          videoId: nextSong.videoId,
          title: nextSong.title,
          author: nextSong.author,
          queueId: nextSong.queueId,
          duration: nextSong.duration,
          thumbnail: nextSong.thumbnail,
          nextTrackTitle: nextTitle,
        });

        addNotification(`Reproduciendo: "${nextSong.title}"`, 'success');
        return remaining;
      } else {
        // Cola vacía
        setCurrentTrack(null);
        setIsPlaying(false);
        broadcast(MESSAGE_TYPES.STANDBY);
        addNotification('La cola ha finalizado. Pantalla en espera (Standby).', 'info');
        return [];
      }
    });

    setTimeout(() => {
      isAdvancingRef.current = false;
    }, 1200);
  }, [addNotification, broadcast]);

  // Callback cuando la pantalla reporta que terminó una canción
  const handleTrackEnded = useCallback((payload) => {
    console.log('[Operador] TRACK_ENDED recibido:', payload);
    // Validar que no provenga de una canción ya caducada
    if (payload?.queueId && currentTrackRef.current?.queueId) {
      if (payload.queueId !== currentTrackRef.current.queueId) {
        console.warn('[Operador] Ignorando TRACK_ENDED de canción no activa:', payload.queueId);
        return;
      }
    }
    advanceToNextTrack('ended');
  }, [advanceToNextTrack]);

  // Manejo de Error Restringido: Abre el Modal de Alerta con opciones claras (Reemplazar, YouTube Web, Omitir)
  const handleRestrictedError = useCallback((payload) => {
    console.warn('[Operador] ERROR_RESTRICTED recibido:', payload);
    const failedVideoId = payload?.videoId;
    const songTitle = payload?.title || currentTrackRef.current?.title || '';
    const errorCode = payload?.errorCode || 150;

    // REGISTRO EXPLÍCITO EN TELEMETRÍA Y SENTRY
    logger.error('YouTube', `[Bloqueo Detectado] "${songTitle}" (${failedVideoId}) tiene restricción de derechos (Error ${errorCode}).`, {
      videoId: failedVideoId,
      songTitle,
      payload,
    });

    try {
      Sentry.captureMessage(`[Bloqueo Derechos ${errorCode}] "${songTitle}"`, {
        level: 'error',
        tags: {
          errorCode: String(errorCode),
          videoId: failedVideoId,
          tipo: 'bloqueo_derechos_operador',
        },
        extra: {
          songTitle,
          failedVideoId,
          payload,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {}

    // Validar que el error corresponda a la canción que realmente está al aire
    if (failedVideoId && currentTrackRef.current?.videoId && failedVideoId !== currentTrackRef.current.videoId) {
      console.warn('[Operador] Ignorando error de video obsoleto:', failedVideoId);
      return;
    }

    addNotification(
      `"${songTitle}" tiene restricción de derechos (Error ${errorCode}). Selecciona una alternativa o ábrela en YouTube.`,
      'error'
    );

    // Lanzar Modal de Alerta Interactivo para el Operador
    setAlertModalState({
      isOpen: true,
      track: currentTrackRef.current || {
        videoId: failedVideoId,
        title: songTitle,
        thumbnail: `https://i.ytimg.com/vi/${failedVideoId}/hqdefault.jpg`,
      },
      isCurrentTrack: true,
      reason: `YouTube bloqueó la inserción por derechos de autor (Error ${errorCode} - LatinAutor/UMPG/Sony)`,
    });
  }, [addNotification]);

  // Actualizar estado de validación Pre-Flight desde QueueValidator
  const handleValidationUpdate = useCallback((videoId, info) => {
    setValidationMap((prev) => ({
      ...prev,
      [videoId]: {
        ...(prev[videoId] || {}),
        ...info,
      },
    }));

    if (info.status === 'restricted') {
      const song = queueRef.current.find((t) => t.videoId === videoId);
      const title = song?.title || 'Una pista en la cola';
      addNotification(`⚠️ Pre-Flight: "${title}" tiene restricción de derechos. Pulsa "Resolver" en la lista.`, 'warning');
    }
  }, [addNotification]);

  // Abrir Modal de Alerta para una pista específica
  const handleOpenAlertModal = useCallback((track, isCurrent = false, reason = '') => {
    setAlertModalState({
      isOpen: true,
      track,
      isCurrentTrack: isCurrent,
      reason: reason || 'Restricción de derechos de autor en YouTube',
    });
  }, []);

  // Reemplazar pista en la cola con una versión alternativa compatible conservando el turno
  const handleReplaceQueueTrack = useCallback((newTrack) => {
    if (!alertModalState.track) return;
    const targetQueueId = alertModalState.track.queueId;
    const targetVideoId = alertModalState.track.videoId;

    setQueue((prevQueue) => {
      return prevQueue.map((item) => {
        if ((targetQueueId && item.queueId === targetQueueId) || item.videoId === targetVideoId) {
          return {
            ...newTrack,
            queueId: `${newTrack.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          };
        }
        return item;
      });
    });

    addNotification(`Pista sustituida en la cola: "${newTrack.title}".`, 'success');
    setAlertModalState({ isOpen: false, track: null, isCurrentTrack: false, reason: '' });
  }, [alertModalState.track, addNotification]);

  // Reemplazar pista al aire en el escenario con una versión alternativa compatible
  const handleReplaceCurrentTrack = useCallback((newTrack) => {
    const replacement = {
      ...newTrack,
      queueId: `${newTrack.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setCurrentTrack(replacement);
    setIsPlaying(true);

    broadcast(MESSAGE_TYPES.PLAY_NEXT, {
      videoId: replacement.videoId,
      title: replacement.title,
      author: replacement.author,
      queueId: replacement.queueId,
      duration: replacement.duration,
      thumbnail: replacement.thumbnail,
      nextTrackTitle: queueRef.current[0]?.title || '',
    });

    addNotification(`Versión compatible activada en escenario: "${replacement.title}".`, 'success');
    setAlertModalState({ isOpen: false, track: null, isCurrentTrack: false, reason: '' });
  }, [broadcast, addNotification]);

  // Callback cuando el display se reconecta
  const handlePongOperator = useCallback(() => {
    if (currentTrackRef.current) {
      broadcast(MESSAGE_TYPES.SYNC_STATE, {
        currentTrack: currentTrackRef.current,
        isPlaying: isPlayingRef.current,
        volume: volumeRef.current,
        nextTrackTitle: queueRef.current[0]?.title || '',
      });
    }
  }, []);

  // Hook de sincronización
  const { broadcast: realBroadcast, isDisplayConnected } = useKaraokeSync('operator', {
    [MESSAGE_TYPES.TRACK_ENDED]: handleTrackEnded,
    [MESSAGE_TYPES.ERROR_RESTRICTED]: handleRestrictedError,
    [MESSAGE_TYPES.PONG_OPERATOR]: handlePongOperator,
  });

  useEffect(() => {
    broadcastRef.current = realBroadcast;
  }, [realBroadcast]);

  // Búsqueda en el backend Express con filtro anti-restricción y modos
  const handleSearch = useCallback(async (query, mode = searchModeRef.current) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchMode(mode);
    setIsSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${mode}`);
      if (!res.ok) {
        throw new Error(`Error en el servidor (${res.status})`);
      }
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Error al consultar API de búsqueda:', err);
      addNotification('No se pudo completar la búsqueda en YouTube. Verifica el servidor.', 'error');
    } finally {
      setIsSearching(false);
    }
  }, [addNotification]);

  // Añadir tema a la cola
  const handleAddToQueue = (video) => {
    const newTrack = {
      ...video,
      queueId: `${video.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    if (!currentTrack) {
      setCurrentTrack(newTrack);
      setIsPlaying(true);
      broadcast(MESSAGE_TYPES.PLAY_NEXT, {
        videoId: newTrack.videoId,
        title: newTrack.title,
        author: newTrack.author,
        queueId: newTrack.queueId,
        duration: newTrack.duration,
        thumbnail: newTrack.thumbnail,
        nextTrackTitle: '',
      });
      addNotification(`Iniciando reproducción: "${newTrack.title}"`, 'success');
    } else {
      setQueue((prev) => [...prev, newTrack]);
      addNotification(`Añadido a la cola: "${newTrack.title}"`, 'info');
    }
  };

  // Acciones de transporte
  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (queue.length > 0) {
        advanceToNextTrack();
      }
      return;
    }

    const nextState = !isPlaying;
    setIsPlaying(nextState);
    broadcast(MESSAGE_TYPES.PLAYER_STATE, { isPlaying: nextState });
  };

  const handleRemoveCurrentTrack = () => {
    if (!currentTrack) return;
    const removedTitle = currentTrack.title;
    setCurrentTrack(null);
    setIsPlaying(false);
    broadcast(MESSAGE_TYPES.STANDBY);
    addNotification(`Canción quitada: "${removedTitle}". Pantalla en espera (Home).`, 'info');
  };

  const handleSkip = () => {
    if (queue.length > 0) {
      advanceToNextTrack();
    } else {
      handleRemoveCurrentTrack();
    }
  };

  const handleRestart = () => {
    if (currentTrack) {
      broadcast(MESSAGE_TYPES.RESTART_TRACK);
      setIsPlaying(true);
      addNotification('Reiniciando canción actual (0:00)...', 'info');
    }
  };

  const handleChangeVolume = (newVol) => {
    setVolume(newVol);
    broadcast(MESSAGE_TYPES.SET_VOLUME, { volume: newVol });
  };

  const handleOpenDisplay = () => {
    window.open('/display', 'KaraokeDisplayWindow', 'width=1280,height=720,menubar=no,toolbar=no,location=no');
  };

  const handleOpenDirectYouTube = (videoId) => {
    const id = videoId || currentTrack?.videoId;
    if (id) {
      window.open(
        `https://www.youtube.com/watch?v=${id}&autoplay=1`,
        'KaraokeDirectYouTubeWindow',
        'width=1280,height=720,menubar=no,toolbar=no,location=no'
      );
      addNotification('Lanzando canción en YouTube Web Oficial.', 'info');
    }
  };

  // Operaciones en la cola por ID inmutable (con fallback a index)
  const handleRemoveTrack = (targetId, fallbackIndex) => {
    setQueue((prev) => {
      const filtered = prev.filter((t, i) =>
        targetId ? t.queueId !== targetId : i !== fallbackIndex
      );
      const removed = prev.find((t, i) =>
        targetId ? t.queueId === targetId : i === fallbackIndex
      );
      if (removed) {
        addNotification(`Eliminado de la cola: "${removed.title}"`, 'info');
      }
      return filtered;
    });
  };

  const handleMoveUp = (targetId, fallbackIndex) => {
    setQueue((prev) => {
      const idx = targetId ? prev.findIndex((t) => t.queueId === targetId) : fallbackIndex;
      if (idx <= 0) return prev;
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const handleMoveDown = (targetId, fallbackIndex) => {
    setQueue((prev) => {
      const idx = targetId ? prev.findIndex((t) => t.queueId === targetId) : fallbackIndex;
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const handlePlayNow = (targetId, fallbackIndex) => {
    setQueue((prev) => {
      const idx = targetId ? prev.findIndex((t) => t.queueId === targetId) : fallbackIndex;
      if (idx < 0) return prev;
      const selected = prev[idx];
      const newQueue = prev.filter((_, i) => i !== idx);

      setCurrentTrack(selected);
      setIsPlaying(true);

      broadcast(MESSAGE_TYPES.PLAY_NEXT, {
        videoId: selected.videoId,
        title: selected.title,
        author: selected.author,
        queueId: selected.queueId,
        duration: selected.duration,
        thumbnail: selected.thumbnail,
        nextTrackTitle: newQueue[0]?.title || '',
      });

      addNotification(`Reproduciendo ahora: "${selected.title}"`, 'success');
      return newQueue;
    });
  };

  const handleClearQueue = () => {
    if (window.confirm('¿Seguro que deseas vaciar toda la cola de reproducción?')) {
      setQueue([]);
      addNotification('Cola de reproducción vaciada.', 'info');
    }
  };

  return (
    <div className="min-h-screen bg-[#090807] text-slate-100 flex flex-col font-['Outfit',sans-serif]">
      {/* Header Oficial Escenario 89 */}
      <header className="border-b border-[#332C22] bg-[#14120F]/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div 
            onClick={handleLogoClick} 
            className="flex items-center gap-3.5 cursor-pointer group select-none"
            title="Escenario 89 • Karaoke Bar (Triple clic: Diagnóstico)"
          >

            {/* Logotipo Oficial en miniatura */}
            <div className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-amber-600 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(212,175,55,0.35)] group-hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] group-hover:scale-105 transition-all overflow-hidden flex-shrink-0">
              <img 
                src="/logo-escenario89.jpg" 
                alt="Escenario 89" 
                className="w-full h-full object-cover scale-105"
              />
            </div>

            <div>
              <h1 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent font-['Space_Grotesk',sans-serif] group-hover:brightness-110 transition">
                Escenario 89
              </h1>
              <p className="text-[11px] text-amber-200/60 font-mono tracking-wider uppercase">CONSOLA DE CONTROL • KARAOKE BAR</p>
            </div>
          </div>

          {/* Área Derecha: Badge de Filtro y Botón de Centro de Notificaciones */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-amber-200/80 bg-[#201C16] px-3 py-1.5 rounded-lg border border-[#332C22]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Filtro Anti-Restricción Activo</span>
            </div>

            {/* Centro de Notificaciones (Botón de Campana) */}
            <NotificationCenter
              notifications={notifications}
              isOpen={isNotificationsOpen}
              hasUnread={hasUnread}
              onToggle={() => {
                setIsNotificationsOpen((prev) => !prev);
                setHasUnread(false);
              }}
              onClose={() => setIsNotificationsOpen(false)}
              onClear={() => {
                setNotifications([]);
                setHasUnread(false);
              }}
            />

            {/* Botón Salir / Cerrar Sesión */}
            <button


              onClick={() => {
                if (window.confirm('¿Deseas cerrar la sesión del Administrador?')) {
                  logout();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#332C22] bg-[#201C16] hover:bg-red-950/40 hover:border-red-700/60 text-xs font-semibold text-amber-200/90 hover:text-red-200 transition shadow-sm cursor-pointer"
              title="Cerrar sesión de Administrador"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Barra de Control de Transporte Fija / Superior */}
      <section className="px-4 lg:px-8 py-4 max-w-7xl mx-auto w-full">
        <PlayerControls
          isPlaying={isPlaying}
          volume={volume}
          isDisplayConnected={isDisplayConnected}
          hasCurrentTrack={!!currentTrack}
          onTogglePlay={handleTogglePlay}
          onSkip={handleSkip}
          onRestart={handleRestart}
          onStopToHome={handleRemoveCurrentTrack}
          onChangeVolume={handleChangeVolume}
          onOpenDisplay={handleOpenDisplay}
          onOpenDirectYouTube={handleOpenDirectYouTube}
        />
      </section>

      {/* Layout de 2 Columnas Principal */}
      <main className="flex-1 px-4 lg:px-8 pb-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Buscador y Catálogo (7 columnas en LG) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-[#14120F]/90 rounded-2xl border border-[#332C22] p-4 shadow-xl">
            <h2 className="text-sm font-bold text-amber-300/90 mb-3 flex items-center gap-2 uppercase tracking-wider font-['Space_Grotesk',sans-serif]">
              <Mic className="w-4 h-4 text-amber-400" />
              Búsqueda de Canciones
            </h2>

            <SearchBar
              onSearch={handleSearch}
              isLoading={isSearching}
              initialMode={searchMode}
            />
          </div>

          {/* Resultados de búsqueda */}
          <div className="min-h-[400px]">
            <SearchResults
              results={searchResults}
              onAddToQueue={handleAddToQueue}
              onSelectSuggestion={(sug) => handleSearch(sug, searchMode)}
              searchMode={searchMode}
            />
          </div>
        </section>

        {/* Columna Derecha: Cola de Reproducción y Monitor (5 columnas en LG) */}
        <section className="lg:col-span-5 sticky top-24">
          <QueueManager
            currentTrack={currentTrack}
            queue={queue}
            isPlaying={isPlaying}
            validationMap={validationMap}
            onRemoveTrack={handleRemoveTrack}
            onRemoveCurrentTrack={handleRemoveCurrentTrack}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onPlayNow={handlePlayNow}
            onClearQueue={handleClearQueue}
            onOpenDirectYouTube={handleOpenDirectYouTube}
            onOpenAlertModal={handleOpenAlertModal}
          />
        </section>
      </main>

      {/* Validador Silencioso en Segundo Plano (Queue Pre-Flight Tester) */}
      <QueueValidator
        queue={queue}
        onValidationUpdate={handleValidationUpdate}
      />

      {/* Modal Interactivo de Alerta y Rescate de Canción */}
      <TrackAlertModal
        isOpen={alertModalState.isOpen}
        track={alertModalState.track}
        isCurrentTrack={alertModalState.isCurrentTrack}
        reason={alertModalState.reason}
        onClose={() => setAlertModalState({ isOpen: false, track: null, isCurrentTrack: false, reason: '' })}
        onReplaceTrack={alertModalState.isCurrentTrack ? handleReplaceCurrentTrack : handleReplaceQueueTrack}
        onOpenDirectYouTube={handleOpenDirectYouTube}
        onSkipTrack={alertModalState.isCurrentTrack ? handleSkip : () => {
          if (alertModalState.track) {
            handleRemoveTrack(alertModalState.track.queueId);
            setAlertModalState({ isOpen: false, track: null, isCurrentTrack: false, reason: '' });
          }
        }}
      />

      {/* Modal / Reproductor de la animación oficial de Escenario 89 */}
      {showIntroModal && (
        <IntroSplash onComplete={() => setShowIntroModal(false)} />
      )}

      {/* Visor de Diagnóstico, Telemetría y Sentry */}
      <LogViewerModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
      />
    </div>
  );
}

