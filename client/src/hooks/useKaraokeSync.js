import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '../utils/logger';

export const CHANNEL_NAME = 'karaoke_sync_channel';

export const MESSAGE_TYPES = {
  PLAY_NEXT: 'PLAY_NEXT',
  PLAYER_STATE: 'PLAYER_STATE',
  SKIP_TRACK: 'SKIP_TRACK',
  RESTART_TRACK: 'RESTART_TRACK',
  SET_VOLUME: 'SET_VOLUME',
  TRACK_ENDED: 'TRACK_ENDED',
  PING_DISPLAY: 'PING_DISPLAY',
  PONG_OPERATOR: 'PONG_OPERATOR',
  ERROR_RESTRICTED: 'ERROR_RESTRICTED',
  SYNC_STATE: 'SYNC_STATE',
  STANDBY: 'STANDBY',
  LOG_REMOTE: 'LOG_REMOTE',
};

/**
 * Custom Hook para sincronización bidireccional entre Operador y Pantalla Proyección
 * usando BroadcastChannel nativo del navegador.
 * 
 * @param {string} role - 'operator' o 'display'
 * @param {object} callbacks - Funciones a invocar según eventos entrantes
 */
export function useKaraokeSync(role = 'operator', callbacks = {}) {
  const [isDisplayConnected, setIsDisplayConnected] = useState(false);
  const channelRef = useRef(null);
  const lastPongRef = useRef(Date.now());
  const callbacksRef = useRef(callbacks);

  // Mantener actualizadas las referencias a callbacks sin recrear listeners
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Enviar mensaje al canal
  const broadcast = useCallback((type, payload = {}) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type, payload, sender: role, timestamp: Date.now() });
      } catch (err) {
        console.error(`[BroadcastChannel] Error al enviar ${type}:`, err);
      }
    }
  }, [role]);

  useEffect(() => {
    // Inicializar canal nativo
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const handleMessage = (event) => {
      const { type, payload, sender } = event.data || {};
      if (!type) return;

      // Heartbeat logic
      if (type === MESSAGE_TYPES.PING_DISPLAY) {
        if (role === 'display') {
          // Display responde al ping
          channel.postMessage({ type: MESSAGE_TYPES.PONG_OPERATOR, sender: 'display', timestamp: Date.now() });
        }
      } else if (type === MESSAGE_TYPES.PONG_OPERATOR) {
        if (role === 'operator') {
          lastPongRef.current = Date.now();
          setIsDisplayConnected(true);
        }
      }

      // Despachar a callback específico si existe (incluyendo PONG_OPERATOR para SYNC_STATE)
      const cb = callbacksRef.current[type];
      if (typeof cb === 'function') {
        cb(payload, sender);
      }
    };

    channel.onmessage = handleMessage;

    // Heartbeat loop para Operador
    let heartbeatInterval = null;
    let timeoutChecker = null;

    if (role === 'operator') {
      // Ping cada 1.5 segundos
      heartbeatInterval = setInterval(() => {
        channel.postMessage({ type: MESSAGE_TYPES.PING_DISPLAY, sender: 'operator', timestamp: Date.now() });
      }, 1500);

      // Si no recibe pong en 4 segundos, marcar como desconectado
      timeoutChecker = setInterval(() => {
        if (Date.now() - lastPongRef.current > 4000) {
          setIsDisplayConnected(false);
        }
      }, 2000);

      // Ping inicial inmediato
      channel.postMessage({ type: MESSAGE_TYPES.PING_DISPLAY, sender: 'operator', timestamp: Date.now() });
    }

    if (role === 'display') {
      // Al montarse, display anuncia su presencia
      channel.postMessage({ type: MESSAGE_TYPES.PONG_OPERATOR, sender: 'display', timestamp: Date.now() });
    }

    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (timeoutChecker) clearInterval(timeoutChecker);
      channel.close();
      channelRef.current = null;
    };
  }, [role]);

  return {
    broadcast,
    isDisplayConnected,
  };
}
