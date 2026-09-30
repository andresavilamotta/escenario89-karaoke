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

  // Enviar mensaje al canal con fallback a localStorage para ventanas secundarias
  const broadcast = useCallback((type, payload = {}) => {
    const msg = { type, payload, sender: role, timestamp: Date.now(), msgId: Math.random().toString(36).substring(2, 9) };
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(msg);
      } catch (err) {
        console.error(`[BroadcastChannel] Error al enviar ${type}:`, err);
      }
    }
    try {
      localStorage.setItem('karaoke_sync_event', JSON.stringify(msg));
    } catch (e) {}
  }, [role]);

  useEffect(() => {
    // Inicializar canal nativo
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const processedMessages = new Set();
    const handleRawMessage = (data) => {
      const { type, payload, sender, timestamp, msgId } = data || {};
      if (!type || sender === role) return;
      const key = `${type}_${timestamp}_${msgId || ''}`;
      if (processedMessages.has(key)) return;
      processedMessages.add(key);
      if (processedMessages.size > 100) {
        const first = processedMessages.values().next().value;
        processedMessages.delete(first);
      }

      // Heartbeat logic
      if (type === MESSAGE_TYPES.PING_DISPLAY) {
        if (role === 'display') {
          channel.postMessage({ type: MESSAGE_TYPES.PONG_OPERATOR, sender: 'display', timestamp: Date.now(), msgId: Math.random().toString(36).substring(2, 9) });
        }
      } else if (type === MESSAGE_TYPES.PONG_OPERATOR) {
        if (role === 'operator') {
          lastPongRef.current = Date.now();
          setIsDisplayConnected(true);
        }
      }

      // Despachar a callback específico si existe
      const cb = callbacksRef.current[type];
      if (typeof cb === 'function') {
        cb(payload, sender);
      }
    };

    channel.onmessage = (event) => handleRawMessage(event.data);

    // Redundancia con evento storage para pestañas en segundo plano o proyectores
    const handleStorage = (e) => {
      if (e.key === 'karaoke_sync_event' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleRawMessage(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

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
      window.removeEventListener('storage', handleStorage);
      channel.close();
      channelRef.current = null;
    };
  }, [role]);

  return {
    broadcast,
    isDisplayConnected,
  };
}
