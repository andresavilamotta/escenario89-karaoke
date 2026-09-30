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
import AnimationSelector from '../components/AnimationSelector';
import { NATIVE_VIDEOS } from '../data/nativeVideos';
import { searchDriveCatalog, findDriveTrackByVideoId } from '../data/driveCatalog';
import { searchServerCatalog, findServerTrackByVideoId } from '../data/serverCatalog';
import DailyAnnouncementModal from '../components/DailyAnnouncementModal';
import { RECOVERED_ANNOUNCEMENT_DATE, RECOVERED_SONGS } from '../data/recoveredSongs';
import { Mic, Sparkles, LogOut, Film } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'animations'
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [restartCounter, setRestartCounter] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);

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

  // Estado del Anuncio Especial: Canciones de Sentry recuperadas (Solo por hoy)
  const [showDailyAnnouncement, setShowDailyAnnouncement] = useState(false);

  // Auto-mostrar anuncio especial "Solo por hoy" al entrar a la app
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const dismissed = localStorage.getItem(`escenario89_daily_announcement_${today}`);
      if (today === RECOVERED_ANNOUNCEMENT_DATE && !dismissed) {
        setShowDailyAnnouncement(true);
      }
    } catch (e) {
      console.warn('Error al verificar anuncio del día:', e);
    }
  }, []);

  // Referencias para evitar stale closures en callbacks del BroadcastChannel
  const currentTrackRef = useRef(currentTrack);
  const queueRef = useRef(queue);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const searchModeRef = useRef(searchMode);
  const fallbackAttemptsRef = useRef(new Set());
  const lastAdvanceTimeRef = useRef(0);
  const isAdvancingRef = useRef(false);
  const searchIdRef = useRef(0);
  const searchAbortControllerRef = useRef(null);

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
    // Guardia de Cooldown: 600ms para clic manual del operador, 2500ms para automáticos
    const cooldownMs = source === 'manual' ? 600 : 2500;
    if (now - lastAdvanceTimeRef.current < cooldownMs) {
      console.warn(`[Operador] Avance bloqueado por Cooldown (${now - lastAdvanceTimeRef.current}ms).`);
      return;
    }

    if (isAdvancingRef.current) {
      console.warn('[Operador] Transición en curso, ignorando concurrencia.');
      return;
    }

    isAdvancingRef.current = true;
    lastAdvanceTimeRef.current = now;
    if (source === 'manual') {
      setIsSkipping(true);
    }

    const currentQ = queueRef.current;
    if (currentQ.length > 0) {
      const [nextSong, ...remaining] = currentQ;
      const nextTitle = remaining[0]?.title || '';

      // Actualizar estados
      setQueue(remaining);
      setCurrentTrack(nextSong);
      setIsPlaying(true);

      // Emitir broadcast directo e inmediato
      broadcast(MESSAGE_TYPES.PLAY_NEXT, {
        videoId: nextSong.videoId,
        title: nextSong.title,
        author: nextSong.author,
        queueId: nextSong.queueId,
        duration: nextSong.duration,
        thumbnail: nextSong.thumbnail,
        isNative: !!nextSong.isNative,
        isServerHosted: !!nextSong.isServerHosted,
        isDriveHosted: !!nextSong.isDriveHosted,
        videoUrl: nextSong.videoUrl || null,
        driveFileId: nextSong.driveFileId || null,
        driveStreamUrl: nextSong.driveStreamUrl || null,
        filename: nextSong.filename || null,
        nextTrackTitle: nextTitle,
        badge: nextSong.badge || null,
      });

      addNotification(
        nextSong.isDriveHosted || (nextSong.badge && nextSong.badge.includes('VIP'))
          ? `Reproduciendo pista [Servidor VIP 👑]: "${nextSong.title}"`
          : nextSong.badge && nextSong.badge.includes('Original')
          ? `Reproduciendo video original [Para Bailar 🎬]: "${nextSong.title}"`
          : `Reproduciendo: "${nextSong.title}"`,
        'success'
      );
    } else {
      // Cola vacía
      setCurrentTrack(null);
      setIsPlaying(false);
      broadcast(MESSAGE_TYPES.STANDBY);
      addNotification('La cola ha finalizado. Pantalla en espera (Standby).', 'info');
    }

    const unlockTimeMs = source === 'manual' ? 500 : 1200;
    setTimeout(() => {
      isAdvancingRef.current = false;
      setIsSkipping(false);
    }, unlockTimeMs);
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

      // 1. AUTO-RESCATE INMEDIATO CON GOOGLE DRIVE (Servidor VIP)
      // Si la canción (o versión del artista) ya existe en Google Drive, sustituirla automáticamente en la cola
      const cleanTitle = (song?.title || '')
        .replace(/\(Karaoke.*?\)/gi, '')
        .replace(/\[Karaoke.*?\]/gi, '')
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\(Lyrics.*?\)/gi, '')
        .replace(/\(Video.*?\)/gi, '')
        .replace(/\[Video.*?\]/gi, '')
        .trim();

      const directDrive = findDriveTrackByVideoId(videoId);
      const driveMatches = !directDrive ? searchDriveCatalog(cleanTitle, 1) : [];
      const driveRescueTrack = directDrive || (driveMatches.length > 0 ? driveMatches[0] : null);

      if (driveRescueTrack) {
        const streamUrl = driveRescueTrack.driveStreamUrl || `/api/stream?id=${driveRescueTrack.driveFileId}`;
        const replacement = {
          ...song,
          ...driveRescueTrack,
          isNative: true,
          isDriveHosted: true,
          badge: '👑 Servidor VIP (Rescate Drive)',
          driveStreamUrl: streamUrl,
          videoUrl: streamUrl,
        };

        setQueue((prevQueue) => {
          return prevQueue.map((item) => {
            if ((song?.queueId && item.queueId === song.queueId) || item.videoId === videoId) {
              return replacement;
            }
            return item;
          });
        });

        // Limpiar estado de restricción
        setValidationMap((prev) => {
          const next = { ...prev };
          delete next[videoId];
          next[replacement.videoId] = { status: 'valid', reason: 'Auto-rescatado con Servidor VIP Drive' };
          return next;
        });

        addNotification(
          `👑 Auto-Rescate VIP: "${title}" tenía restricción en YouTube y fue sustituida automáticamente por la versión Servidor VIP de Google Drive.`,
          'success'
        );

        logger.info('Auto-Rescue', `[Auto-Rescate Cola] "${title}" reemplazada automáticamente por versión VIP de Google Drive: "${driveRescueTrack.title}".`);
        return;
      }

      // 2. Si no está en Google Drive:
      // Encolar reporte en Vercel
      try {
        fetch('/api/report-restricted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            title,
            errorCode: 150,
            rescued: false,
          }),
        }).catch(() => {});
      } catch (e) {}

      // Intentar también iniciar descarga en servidor local si está activo en la máquina
      try {
        fetch('http://localhost:3001/api/download-restricted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId, title }),
        }).catch(() => {});
      } catch (e) {}

      addNotification(`⚠️ Pre-Flight: "${title}" tiene restricción de derechos. Pulsa "Resolver" para elegir otra versión o descargarla.`, 'warning');
    }
  }, [addNotification]);

  // Poller reactivo: comprueba si alguna pista restringida/encolada ya terminó de descargarse
  useEffect(() => {
    const restrictedTracks = queue.filter((t) => {
      const val = validationMap[t.videoId];
      return val?.status === 'restricted';
    });

    if (restrictedTracks.length === 0) return;

    const interval = setInterval(async () => {
      for (const t of restrictedTracks) {
        try {
          let data = null;
          // 1. Consultar endpoint de Vercel
          try {
            const res = await fetch(`/api/download-status?v=${t.videoId}`);
            if (res.ok) data = await res.json();
          } catch (e) {}

          // 2. Si no está en Vercel, consultar backend local si está activo
          if (!data?.isReady) {
            try {
              const localRes = await fetch(`http://localhost:3001/api/download-status?v=${t.videoId}`);
              if (localRes.ok) data = await localRes.json();
            } catch (e) {}
          }

          if (data && data.isReady) {
            // ¡Descarga completada! Auto-transformar la canción en la cola
            const upgradedTrack = {
              ...t,
              isNative: true,
              isDriveHosted: true,
              videoUrl: data.streamUrl || data.videoUrl,
              driveStreamUrl: data.streamUrl || data.videoUrl,
              driveFileId: data.driveFileId || null,
              filename: data.filename || null,
              badge: data.badge || '👑 Servidor VIP (Descargada)',
            };

            setQueue((prevQueue) => {
              return prevQueue.map((item) => (item.videoId === t.videoId ? upgradedTrack : item));
            });

            setValidationMap((prev) => {
              const next = { ...prev };
              delete next[t.videoId];
              next[upgradedTrack.videoId] = { status: 'valid', reason: 'Descarga completada exitosamente' };
              return next;
            });

            addNotification(
              `🎉 ¡Descarga completada! "${t.title}" ya está lista en el Servidor VIP para cantar.`,
              'success'
            );
          }
        } catch (e) {}
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [queue, validationMap, addNotification]);

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
      isNative: !!replacement.isNative,
      isServerHosted: !!replacement.isServerHosted,
      isDriveHosted: !!replacement.isDriveHosted,
      driveFileId: replacement.driveFileId || null,
      driveStreamUrl: replacement.driveStreamUrl || null,
      videoUrl: replacement.videoUrl || null,
      filename: replacement.filename || null,
      storageKey: replacement.storageKey || null,
      nextTrackTitle: queueRef.current[0]?.title || '',
    });

    addNotification(`Versión compatible activada en escenario: "${replacement.title}".`, 'success');
    setAlertModalState({ isOpen: false, track: null, isCurrentTrack: false, reason: '' });
  }, [broadcast, addNotification]);

  // Sincronizar estado cuando el display se conecta por primera vez o tras reconexión
  const hasSyncedDisplayRef = useRef(false);
  const handlePongOperator = useCallback(() => {
    if (!hasSyncedDisplayRef.current && currentTrackRef.current) {
      hasSyncedDisplayRef.current = true;
      broadcast(MESSAGE_TYPES.SYNC_STATE, {
        currentTrack: currentTrackRef.current,
        isPlaying: isPlayingRef.current,
        volume: volumeRef.current,
        nextTrackTitle: queueRef.current[0]?.title || '',
      });
    }
  }, [broadcast]);

  // Hook de sincronización
  const { broadcast: realBroadcast, isDisplayConnected } = useKaraokeSync('operator', {
    [MESSAGE_TYPES.TRACK_ENDED]: handleTrackEnded,
    [MESSAGE_TYPES.ERROR_RESTRICTED]: handleRestrictedError,
    [MESSAGE_TYPES.PONG_OPERATOR]: handlePongOperator,
  });

  useEffect(() => {
    broadcastRef.current = realBroadcast;
  }, [realBroadcast]);

  useEffect(() => {
    if (!isDisplayConnected) {
      hasSyncedDisplayRef.current = false;
    }
  }, [isDisplayConnected]);

  // Búsqueda en el backend Express con filtro anti-restricción y modos
  const handleSearch = useCallback(async (query, mode = searchModeRef.current) => {
    if (!query || query.trim().length < 2) {
      if (searchAbortControllerRef.current) {
        searchAbortControllerRef.current.abort();
      }
      setSearchResults([]);
      return;
    }

    const currentSearchId = ++searchIdRef.current;
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    searchAbortControllerRef.current = abortController;

    setSearchMode(mode);
    setIsSearching(true);
    try {
      // 1. En modo karaoke, buscar coincidencias instantáneas y estrictas en el catálogo VIP
      const driveMatches = mode === 'karaoke' ? searchDriveCatalog(query, 6) : [];
      if (currentSearchId === searchIdRef.current && driveMatches.length > 0) {
        setSearchResults(driveMatches);
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&mode=${mode}`, {
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Error en el servidor (${res.status})`);
      }
      const data = await res.json();
      if (currentSearchId !== searchIdRef.current) return;

      const ytResults = data.results || [];

      // 2. Enriquecer los resultados de YouTube según el modo seleccionado
      const enrichedYtResults = ytResults.map((ytVid) => {
        if (mode === 'original') {
          return {
            ...ytVid,
            isNative: false,
            isDriveHosted: false,
            badge: '🎬 Video Original',
          };
        }
        if (mode === 'lyrics') {
          return {
            ...ytVid,
            isNative: false,
            isDriveHosted: false,
            badge: '📝 Con Letra',
          };
        }

        // Modo karaoke: solo si coincide exactamente el videoId con una pista descargada en Drive
        const matchingDrive = findDriveTrackByVideoId(ytVid.videoId);
        if (matchingDrive) {
          return {
            ...ytVid,
            ...matchingDrive,
            isNative: true,
            isDriveHosted: true,
            badge: '👑 Servidor VIP',
          };
        }
        return {
          ...ytVid,
          isNative: false,
          isDriveHosted: false,
          badge: '🎤 YouTube',
        };
      });

      // 3. Si el modo es "original", los videos musicales de YouTube van de primeros para bailar
      if (mode === 'original') {
        setSearchResults(enrichedYtResults);
      } else {
        // En modo karaoke o lyrics, pistas de Servidor VIP primero, seguidas de resultados de YouTube
        const driveVideoIds = new Set(driveMatches.map((s) => s.videoId));
        const filteredYt = enrichedYtResults.filter((y) => !driveVideoIds.has(y.videoId));
        setSearchResults([...driveMatches, ...filteredYt]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (currentSearchId !== searchIdRef.current) return;
      console.error('Error al consultar API de búsqueda:', err);
      // Fallback: si falla YouTube o no hay internet, mostrar las coincidencias de Servidor VIP
      const driveMatches = searchDriveCatalog(query, 6);
      if (driveMatches.length > 0) {
        setSearchResults(driveMatches);
      } else {
        addNotification('No se pudo completar la búsqueda en YouTube. Verifica el servidor.', 'error');
      }
    } finally {
      if (currentSearchId === searchIdRef.current) {
        setIsSearching(false);
      }
    }
  }, [addNotification]);

  // Añadir tema a la cola respetando la elección del usuario (Karaoke VIP vs Video Original YouTube)
  const handleAddToQueue = (video, options = {}) => {
    let trackToEnqueue;

    if (options.asOriginal) {
      // Forzado explícitamente como Video Original (YouTube para bailar)
      trackToEnqueue = {
        ...video,
        isNative: false,
        isDriveHosted: false,
        isServerHosted: false,
        driveFileId: null,
        badge: '🎬 Video Original',
      };
    } else if (video.type === 'native' || video.isNative) {
      // Cortinilla o animación nativa de escenario
      trackToEnqueue = {
        ...video,
        isNative: true,
        isDriveHosted: !!video.isDriveHosted,
        badge: video.badge || '✨ Cortinilla',
      };
    } else if (options.asVip || video.isDriveHosted || video.isServerHosted) {
      // Pista explícita de Servidor VIP (Google Drive)
      trackToEnqueue = {
        ...video,
        isNative: true,
        isDriveHosted: true,
        badge: '👑 Servidor VIP',
      };
    } else if (searchModeRef.current === 'original' || (video.badge && video.badge.includes('Original'))) {
      // Modo original o tarjeta explícita de Video Original
      trackToEnqueue = {
        ...video,
        isNative: false,
        isDriveHosted: false,
        badge: '🎬 Video Original',
      };
    } else {
      // Por defecto para videos de YouTube en otros modos:
      // Solo asociar a Drive si coincide exactamente el videoId
      const exactDriveMatch = findDriveTrackByVideoId(video.videoId);
      if (exactDriveMatch) {
        trackToEnqueue = {
          ...video,
          ...exactDriveMatch,
          isNative: true,
          isDriveHosted: true,
          badge: '👑 Servidor VIP',
        };
      } else {
        trackToEnqueue = {
          ...video,
          isNative: false,
          isDriveHosted: false,
          badge: video.badge || (searchModeRef.current === 'lyrics' ? '📝 Con Letra' : '🎤 YouTube'),
        };
      }
    }

    const newTrack = {
      ...trackToEnqueue,
      queueId: `${trackToEnqueue.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
        isNative: !!newTrack.isNative,
        isServerHosted: !!newTrack.isServerHosted,
        isDriveHosted: !!newTrack.isDriveHosted,
        videoUrl: newTrack.videoUrl || null,
        driveFileId: newTrack.driveFileId || null,
        driveStreamUrl: newTrack.driveStreamUrl || null,
        filename: newTrack.filename || null,
        storageKey: newTrack.storageKey || null,
        nextTrackTitle: '',
        badge: newTrack.badge || null,
      });
      addNotification(
        newTrack.isDriveHosted || (newTrack.badge && newTrack.badge.includes('VIP'))
          ? `Iniciando pista [Servidor VIP 👑]: "${newTrack.title}"`
          : newTrack.badge && newTrack.badge.includes('Original')
          ? `Iniciando video original [Para Bailar 🎬]: "${newTrack.title}"`
          : `Iniciando reproducción: "${newTrack.title}"`,
        'success'
      );
    } else {
      setQueue((prev) => [...prev, newTrack]);
      addNotification(
        newTrack.isDriveHosted || (newTrack.badge && newTrack.badge.includes('VIP'))
          ? `Añadido a la cola [Servidor VIP 👑]: "${newTrack.title}"`
          : newTrack.badge && newTrack.badge.includes('Original')
          ? `Video original [Para Bailar 🎬] añadido a la cola: "${newTrack.title}"`
          : `Añadido a la cola: "${newTrack.title}"`,
        'success'
      );
    }
  };

  // Reproducir directamente una pista VIP desde el anuncio especial
  const handlePlayDirectVip = (song) => {
    const newTrack = {
      ...song,
      isNative: true,
      isDriveHosted: true,
      badge: '👑 Servidor VIP',
      queueId: `${song.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setCurrentTrack(newTrack);
    setIsPlaying(true);

    broadcast(MESSAGE_TYPES.PLAY_NEXT, {
      videoId: newTrack.videoId,
      title: newTrack.title,
      author: newTrack.author,
      queueId: newTrack.queueId,
      duration: newTrack.duration,
      thumbnail: newTrack.thumbnail,
      isNative: true,
      isServerHosted: false,
      isDriveHosted: true,
      videoUrl: newTrack.videoUrl || null,
      driveFileId: newTrack.driveFileId || null,
      driveStreamUrl: newTrack.driveStreamUrl || null,
      filename: newTrack.filename || null,
      storageKey: newTrack.storageKey || null,
      nextTrackTitle: queueRef.current[0]?.title || '',
      badge: '👑 Servidor VIP',
    });

    addNotification(`Pista VIP al aire de inmediato: "${newTrack.title}".`, 'success');
  };

  // Acciones de transporte
  const handleTogglePlay = () => {
    if (!currentTrack) {
      if (queueRef.current.length > 0) {
        advanceToNextTrack('manual');
      } else {
        addNotification('No hay canciones en la cola para reproducir.', 'info');
      }
      return;
    }

    const nextState = !isPlaying;
    setIsPlaying(nextState);
    broadcast(MESSAGE_TYPES.PLAYER_STATE, { isPlaying: nextState });
    addNotification(nextState ? 'Reanudando reproducción en pantalla.' : 'Reproducción en pausa.', 'info');
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
    if (queueRef.current.length > 0) {
      advanceToNextTrack('manual');
    } else {
      addNotification('No hay más canciones pendientes en la cola para saltar.', 'info');
    }
  };

  const handleRestart = () => {
    if (currentTrack) {
      setRestartCounter((prev) => prev + 1);
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
        isNative: !!selected.isNative,
        isServerHosted: !!selected.isServerHosted,
        isDriveHosted: !!selected.isDriveHosted,
        driveFileId: selected.driveFileId || null,
        driveStreamUrl: selected.driveStreamUrl || null,
        videoUrl: selected.videoUrl || null,
        filename: selected.filename || null,
        storageKey: selected.storageKey || null,
        nextTrackTitle: newQueue[0]?.title || '',
      });

      addNotification(`Reproduciendo ahora: "${selected.title}"`, 'success');
      return newQueue;
    });
  };

  // Proyectar de inmediato una animación o cortinilla nativa en pantalla
  const handlePlayNativeNow = useCallback((video) => {
    const newTrack = {
      ...video,
      queueId: `${video.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };

    setCurrentTrack(newTrack);
    setIsPlaying(true);

    broadcast(MESSAGE_TYPES.PLAY_NEXT, {
      videoId: newTrack.videoId,
      title: newTrack.title,
      author: newTrack.author,
      queueId: newTrack.queueId,
      duration: newTrack.duration,
      thumbnail: newTrack.thumbnail,
      type: newTrack.type || 'native',
      category: newTrack.category || 'Cortinilla Principal',
      isNative: true,
      isDriveHosted: !!newTrack.isDriveHosted,
      driveFileId: newTrack.driveFileId || null,
      driveStreamUrl: newTrack.driveStreamUrl || null,
      videoUrl: newTrack.videoUrl || null,
      filename: newTrack.filename || null,
      badge: newTrack.badge || '✨ Cortinilla',
      nextTrackTitle: queueRef.current[0]?.title || '',
    });

    addNotification(`Proyectando cortinilla en vivo: "${newTrack.title}".`, 'success');
  }, [broadcast, addNotification]);

  // Intercalar automáticamente cortinillas entre temas de la cola o animar la seccional
  const handleInterleaveAnimation = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        const defaultAnim = {
          ...NATIVE_VIDEOS[0],
          queueId: `${NATIVE_VIDEOS[0].videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        };
        addNotification(`Cortinilla añadida a la cola: "${defaultAnim.title}".`, 'success');
        return [defaultAnim];
      }

      const newQueue = [];
      let animIdx = 0;

      for (let i = 0; i < prevQueue.length; i++) {
        newQueue.push(prevQueue[i]);
        // Intercalar si el siguiente existe y ninguno de los dos es ya una cortinilla nativa
        if (i < prevQueue.length - 1 && !prevQueue[i].isNative && !prevQueue[i + 1].isNative) {
          const anim = NATIVE_VIDEOS[animIdx % NATIVE_VIDEOS.length];
          animIdx++;
          newQueue.push({
            ...anim,
            queueId: `${anim.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          });
        }
      }

      // Si no se intercaló entre canciones (por ejemplo, había solo 1 tema en cola), añadir al final
      if (newQueue.length === prevQueue.length) {
        const anim = NATIVE_VIDEOS[animIdx % NATIVE_VIDEOS.length];
        newQueue.push({
          ...anim,
          queueId: `${anim.videoId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        });
        addNotification(`Cortinilla añadida al final de la seccional: "${anim.title}".`, 'success');
      } else {
        addNotification('Cortinillas intercaladas exitosamente entre los turnos de la cola.', 'success');
      }

      return newQueue;
    });
  }, [addNotification]);

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
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Botón de Novedades Especiales (Solo por hoy: Canciones nuevas en catálogo) */}
            <button
              onClick={() => setShowDailyAnnouncement(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-yellow-500/20 to-amber-500/15 hover:border-amber-400 text-xs font-semibold text-amber-300 transition shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              title={`Ver novedades: ${RECOVERED_SONGS.length} canciones nuevas añadidas al catálogo`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">Solo por hoy:</span>
              <span className="font-bold text-amber-200">{RECOVERED_SONGS.length} Canciones Nuevas</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 text-xs text-amber-200/80 bg-[#201C16] px-3 py-1.5 rounded-lg border border-[#332C22]">
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
          isSkipping={isSkipping}
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
        {/* Columna Izquierda: Buscador y Catálogo / Cortinillas Nativas (7 columnas en LG) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Selector de Pestañas: Búsqueda vs Cortinillas Nativas */}
          <div className="flex items-center gap-2 p-1.5 bg-[#14120F]/90 rounded-2xl border border-[#332C22] shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 font-['Space_Grotesk',sans-serif] cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-gradient-to-r from-[#D4AF37] via-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-amber-300 hover:bg-[#201C16]'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Búsqueda de Canciones</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('animations')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 font-['Space_Grotesk',sans-serif] cursor-pointer ${
                activeTab === 'animations'
                  ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-500 text-white shadow-lg shadow-purple-500/25'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-[#201C16]'
              }`}
            >
              <Film className="w-4 h-4 text-purple-300" />
              <span>Cortinillas & Visuales Nativos</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-950/60 border border-purple-500/40 text-purple-200">
                4
              </span>
            </button>
          </div>

          {activeTab === 'search' ? (
            <>
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
                  onSelectSuggestion={(sug, mode) => handleSearch(sug, mode || searchMode)}
                  searchMode={searchMode}
                />
              </div>
            </>
          ) : (
            /* Vista de Videos y Cortinillas Nativas */
            <div className="min-h-[400px]">
              <AnimationSelector
                onAddToQueue={handleAddToQueue}
                onPlayNow={handlePlayNativeNow}
                onInterleave={handleInterleaveAnimation}
                queueLength={queue.length}
              />
            </div>
          )}
        </section>

        {/* Columna Derecha: Cola de Reproducción y Monitor (5 columnas en LG) */}
        <section className="lg:col-span-5 sticky top-24">
          <QueueManager
            currentTrack={currentTrack}
            queue={queue}
            isPlaying={isPlaying}
            volume={volume}
            isDisplayConnected={isDisplayConnected}
            validationMap={validationMap}
            restartCounter={restartCounter}
            onRemoveTrack={handleRemoveTrack}
            onRemoveCurrentTrack={handleRemoveCurrentTrack}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onPlayNow={handlePlayNow}
            onClearQueue={handleClearQueue}
            onOpenDirectYouTube={handleOpenDirectYouTube}
            onOpenAlertModal={handleOpenAlertModal}
            onTrackEnded={handleTrackEnded}
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

      {/* Modal de Anuncio Diario Especial: Canciones Rescatadas de Sentry (Solo por hoy) */}
      <DailyAnnouncementModal
        isOpen={showDailyAnnouncement}
        onClose={() => setShowDailyAnnouncement(false)}
        onAddToQueue={(song) => handleAddToQueue(song, { asVip: true })}
        onPlayNow={(song) => handlePlayDirectVip(song)}
      />
    </div>
  );
}

