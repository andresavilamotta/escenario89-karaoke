import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';

/**
 * QueueValidator: Headless Background Pre-Flight Tester
 * 
 * Verifica en segundo plano y de forma 100% silenciosa las próximas canciones
 * en la cola (hasta 5 pistas) mediante un reproductor YouTube de 1x1 px invisible.
 * 
 * Garantiza cero fuga de sonido (mute: 1 y volume: 0 en la API).
 * Detecta tempranamente bloqueos de derechos de autor (Errores 150/101 LatinAutor/UMPG/Sony)
 * antes de que la canción suba al escenario.
 */
export default function QueueValidator({ queue = [], onValidationUpdate }) {
  const [activeVideoId, setActiveVideoId] = useState(null);
  const testedMapRef = useRef(new Map()); // videoId -> status ('testing' | 'valid' | 'restricted')
  const playerRef = useRef(null);
  const watchdogRef = useRef(null);
  const isTestingRef = useRef(false);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const handleTestComplete = useCallback((videoId, status, reason = '') => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }

    if (playerRef.current) {
      try {
        playerRef.current.stopVideo();
      } catch (e) {}
    }

    testedMapRef.current.set(videoId, status);

    if (status === 'restricted') {
      const song = queueRef.current.find((t) => t.videoId === videoId);
      const songTitle = song?.title || videoId;
      logger.warn('Pre-Flight', `[Pista Restringida Detectada en Cola] "${songTitle}" no se puede insertar.`, {
        videoId,
        reason,
      });

      try {
        Sentry.captureMessage(`[Pre-Flight Detectó Restricción] "${songTitle}"`, {
          level: 'warning',
          tags: {
            videoId,
            tipo: 'pre_flight_queue_validator',
          },
          extra: {
            songTitle,
            videoId,
            reason,
          },
        });
      } catch (e) {}
    } else if (status === 'valid') {
      logger.info('Pre-Flight', `[Pista Verificada 100% Compatible] (${videoId}) lista para el escenario.`);
    }

    if (onValidationUpdate) {
      onValidationUpdate(videoId, { status, reason, testedAt: Date.now() });
    }

    setActiveVideoId(null);
    playerRef.current = null;
    isTestingRef.current = false;

    // Pausa técnica de 400ms antes de validar la siguiente en cola para dar respiro al navegador
    setTimeout(() => {
      checkNextInQueue();
    }, 400);
  }, [onValidationUpdate]);

  const startTesting = useCallback((track) => {
    if (!track?.videoId) return;
    const videoId = track.videoId;

    isTestingRef.current = true;
    setActiveVideoId(videoId);
    testedMapRef.current.set(videoId, 'testing');

    if (onValidationUpdate) {
      onValidationUpdate(videoId, { status: 'testing' });
    }

    // Watchdog de 3.5 segundos: si no arranca la reproducción ni dispara error, considerarla restringida
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      console.warn(`[QueueValidator] Timeout en pista (${videoId}). Marcada como restringida/incompatible.`);
      handleTestComplete(videoId, 'restricted', 'Tiempo de espera agotado / Reproducción bloqueada');
    }, 3500);
  }, [handleTestComplete, onValidationUpdate]);

  const checkNextInQueue = useCallback(() => {
    if (isTestingRef.current) return;

    // Examinar hasta las primeras 5 pistas de la cola
    const top5 = (queueRef.current || []).slice(0, 5);
    const pending = top5.find((t) => t?.videoId && !testedMapRef.current.has(t.videoId));

    if (pending) {
      startTesting(pending);
    }
  }, [startTesting]);

  // Disparar chequeo cada vez que la cola se modifique
  useEffect(() => {
    checkNextInQueue();
  }, [queue, checkNextInQueue]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo();
        } catch (e) {}
      }
    };
  }, []);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    try {
      // Doble bloqueo de audio garantizado: Mute + Volumen Cero
      event.target.mute();
      event.target.setVolume(0);
      event.target.playVideo();
    } catch (err) {
      console.warn('[QueueValidator] Error al arrancar prueba silenciosa:', err);
    }
  };

  const onStateChange = (event) => {
    // Estado 1 = YT.PlayerState.PLAYING
    // Si comenzó a reproducir sin errores, ¡la pista es 100% compatible y ejecutable!
    if (event.data === 1 && activeVideoId) {
      handleTestComplete(activeVideoId, 'valid');
    }
  };

  const onPlayerError = (event) => {
    const errorCode = event.data;
    console.warn(`[QueueValidator] Error capturado en prueba silenciosa: ${errorCode} para ${activeVideoId}`);
    if (activeVideoId) {
      let reason = `Error YouTube ${errorCode}`;
      if (errorCode === 101 || errorCode === 150) {
        reason = 'Restricción de derechos de autor (Error 150/101 - LatinAutor/UMPG/Sony)';
      } else if (errorCode === 2) {
        reason = 'Identificador de video inválido';
      } else if (errorCode === 100) {
        reason = 'Video eliminado o privado';
      }
      handleTestComplete(activeVideoId, 'restricted', reason);
    }
  };

  const youtubeOptions = {
    width: '120',
    height: '120',
    playerVars: {
      autoplay: 1,
      mute: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      playsinline: 1,
      iv_load_policy: 3,
    },
  };

  if (!activeVideoId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: -200,
        right: -200,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: -9999,
      }}
      aria-hidden="true"
    >
      <YouTube
        videoId={activeVideoId}
        opts={youtubeOptions}
        onReady={onPlayerReady}
        onStateChange={onStateChange}
        onError={onPlayerError}
      />
    </div>
  );
}
