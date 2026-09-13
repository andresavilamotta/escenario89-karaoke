/**
 * Escenario 89 Karaoke Bar - Sistema de Telemetría y Logging en Vivo
 * Permite auditar eventos, errores de YouTube, sincronización Dual-Screen y excepciones de JS.
 */
import * as Sentry from '@sentry/react';

const STORAGE_KEY = 'escenario89_system_logs_v1';

const MAX_LOGS = 300;

class LoggerService {
  constructor() {
    this.logs = this.loadFromStorage();
    this.listeners = new Set();
    this.initGlobalHandlers();
  }

  loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(-MAX_LOGS);
        }
      }
    } catch (e) {
      console.warn('[Logger] Error al cargar logs de localStorage:', e);
    }
    return [];
  }

  saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      // Si se excede la cuota de localStorage, recortar a la mitad
      try {
        this.logs = this.logs.slice(-150);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
      } catch (inner) {
        console.warn('[Logger] No se pudo persistir logs en localStorage:', inner);
      }
    }
  }

  notifyListeners(entry) {
    this.listeners.forEach((callback) => {
      try {
        callback(entry, this.logs);
      } catch (err) {
        console.error('[Logger] Error en suscriptor de logs:', err);
      }
    });
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  formatTime(date) {
    const pad = (n, s = 2) => String(n).padStart(s, '0');
    const h = pad(date.getHours());
    const m = pad(date.getMinutes());
    const s = pad(date.getSeconds());
    const ms = pad(date.getMilliseconds(), 3);
    return `${h}:${m}:${s}.${ms}`;
  }

  addEntry(level, source, message, details = null, remote = false) {
    const now = new Date();
    const entry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      timeStr: this.formatTime(now),
      level, // 'info' | 'warn' | 'error' | 'sync'
      source, // 'Operador' | 'Display' | 'YouTube' | 'API' | 'Sync' | 'Sistema'
      message: typeof message === 'string' ? message : JSON.stringify(message),
      details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : null,
      remote,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.saveToStorage();
    this.notifyListeners(entry);

    // Enviar a Sentry (Breadcrumbs y Eventos Remotos)
    try {
      if (level === 'error') {
        Sentry.captureMessage(`[${source}] ${entry.message}`, {
          level: 'error',
          tags: { source, remote: String(remote) },
          extra: { details: entry.details, time: entry.timeStr },
        });
      } else {
        Sentry.addBreadcrumb({
          category: source,
          message: entry.message,
          level: level === 'warn' ? 'warning' : 'info',
          data: entry.details,
        });
      }
    } catch (sentryErr) {
      // Sentry pasivo sin interferir con la app
    }

    // Salida espejo a la consola del navegador con colores estéticos
    const prefix = `[${entry.timeStr}] [${source}]`;
    if (level === 'error') {
      console.error(prefix, message, details || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, details || '');
    } else if (level === 'sync') {
      console.log(`%c${prefix} 🔄 ${message}`, 'color: #D4AF37; font-weight: bold;', details || '');
    } else {
      console.log(prefix, message, details || '');
    }

    return entry;
  }

  info(source, message, details = null) {

    return this.addEntry('info', source, message, details);
  }

  warn(source, message, details = null) {
    return this.addEntry('warn', source, message, details);
  }

  error(source, message, details = null) {
    return this.addEntry('error', source, message, details);
  }

  sync(source, message, details = null) {
    return this.addEntry('sync', source, message, details);
  }

  /**
   * Registra un log originado en una pantalla remota (ej: Display -> Operador)
   */
  addRemote(entry) {
    if (!entry || !entry.message) return;
    const cleanEntry = {
      ...entry,
      id: `log_remote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      remote: true,
    };
    this.logs.push(cleanEntry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }
    this.saveToStorage();
    this.notifyListeners(cleanEntry);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notifyListeners(null);
    this.info('Sistema', 'Historial de logs limpiado por el usuario.');
  }

  /**
   * Captura excepciones globales no controladas y promesas rechazadas
   */
  initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('Sistema', `Excepción no controlada: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack || null,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.error('Sistema', `Promesa rechazada no controlada: ${reason?.message || String(reason)}`, {
        stack: reason?.stack || null,
      });
    });
  }

  /**
   * Genera el payload de exportación para diagnóstico completo
   */
  getExportData() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desconocido';
    const screenRes = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} (Screen: ${window.screen?.width}x${window.screen?.height})` : 'N/A';

    return {
      appName: 'Escenario 89 Karaoke Bar',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userAgent: ua,
      screenResolution: screenRes,
      totalEntries: this.logs.length,
      errorsCount: this.logs.filter((l) => l.level === 'error').length,
      warningsCount: this.logs.filter((l) => l.level === 'warn').length,
      logs: this.logs,
    };
  }

  /**
   * Formatea los logs en texto plano legible para compartir por WhatsApp o soporte
   */
  toPlainText() {
    const data = this.getExportData();
    let text = `=== ESCENARIO 89 KARAOKE - REPORTE DE DIAGNÓSTICO ===\n`;
    text += `Fecha: ${data.exportedAt}\n`;
    text += `Dispositivo: ${data.screenResolution} | ${data.userAgent.substring(0, 80)}...\n`;
    text += `Total Registros: ${data.totalEntries} | Errores: ${data.errorsCount} | Advertencias: ${data.warningsCount}\n`;
    text += `======================================================\n\n`;

    this.logs.forEach((log) => {
      const tag = log.level.toUpperCase().padEnd(5, ' ');
      const src = `[${log.source}]`.padEnd(11, ' ');
      text += `${log.timeStr} | ${tag} | ${src} | ${log.message}\n`;
      if (log.details) {
        text += `   Detalles: ${JSON.stringify(log.details)}\n`;
      }
    });

    return text;
  }
}

export const logger = new LoggerService();
