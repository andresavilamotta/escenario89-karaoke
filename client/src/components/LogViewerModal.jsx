import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Terminal,
  Download,
  Copy,
  Check,
  Trash2,
  Filter,
  Search,
  AlertTriangle,
  AlertOctagon,
  Info,
  RefreshCw,
  Radio,
  Sparkles,
} from 'lucide-react';
import { logger } from '../utils/logger';
import * as Sentry from '@sentry/react';


export default function LogViewerModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState(() => logger.getLogs());
  const [filterLevel, setFilterLevel] = useState('all'); // 'all' | 'error' | 'warn' | 'sync' | 'youtube'
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef(null);

  // Suscripción reactiva al logger singleton
  useEffect(() => {
    const unsubscribe = logger.subscribe((_, updatedLogs) => {
      setLogs([...updatedLogs]);
    });
    return unsubscribe;
  }, []);

  // Auto-scroll al final cuando ingresen nuevos logs
  useEffect(() => {
    if (isOpen && autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen, autoScroll]);

  // Filtrado reactivo de logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtro por nivel / fuente
      if (filterLevel === 'error' && log.level !== 'error') return false;
      if (filterLevel === 'warn' && log.level !== 'warn') return false;
      if (filterLevel === 'sync' && log.level !== 'sync' && log.source !== 'Sync') return false;
      if (filterLevel === 'youtube' && log.source !== 'YouTube') return false;

      // Filtro por búsqueda textual
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMessage = log.message?.toLowerCase().includes(q);
        const matchSource = log.source?.toLowerCase().includes(q);
        const matchDetails = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        return matchMessage || matchSource || matchDetails;
      }

      return true;
    });
  }, [logs, filterLevel, searchQuery]);

  // Contadores de métricas
  const errorCount = useMemo(() => logs.filter((l) => l.level === 'error').length, [logs]);
  const warnCount = useMemo(() => logs.filter((l) => l.level === 'warn').length, [logs]);
  const syncCount = useMemo(() => logs.filter((l) => l.level === 'sync' || l.source === 'Sync').length, [logs]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      const text = logger.toPlainText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn('Error al copiar al portapapeles:', e);
    }
  };

  const handleDownload = () => {
    const data = logger.getExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const time = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `escenario89_diagnostico_${time}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('¿Deseas vaciar el historial de logs de esta sesión?')) {
      logger.clear();
    }
  };

  const handleGenerateTestLog = () => {
    const random = Math.floor(Math.random() * 3);
    if (random === 0) {
      logger.info('Operador', 'Prueba de diagnóstico: Consulta ejecutada en la consola.');
      try {
        Sentry.captureMessage('🔔 [Prueba] Notificación manual de diagnóstico desde Escenario 89', {
          level: 'info',
          tags: { prueba: 'manual', canal: 'operador' },
        });
      } catch (e) {}
    } else if (random === 1) {
      logger.warn('YouTube', 'Prueba de diagnóstico: Advertencia simulada de latencia en buffer.', { ms: 240 });
    } else {
      logger.error('Sistema', 'Prueba de diagnóstico: Error simulado para verificar alerta en celular.');
      try {
        Sentry.captureException(new Error('⚠️ [Prueba Sentry] Error simulado desde la Consola de Escenario 89'), {
          tags: { tipo: 'test_error' },
        });
      } catch (e) {}
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-['Outfit',sans-serif]">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0A0907] border border-[#D4AF37]/40 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
        
        {/* Cabecera del Visor de Logs */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#332C22] bg-[#14120F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-['Space_Grotesk']">
                  Diagnóstico & Telemetría en Vivo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Escenario 89
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Monitoreo continuo de eventos, YouTube, Dual-Screen y excepciones del sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Métricas y Filtros Rápidos */}
        <div className="px-5 py-3 border-b border-[#332C22] bg-[#0D0B08] flex flex-wrap items-center justify-between gap-3">
          {/* Métricas */}
          <div className="flex items-center gap-2 sm:gap-4 text-xs font-['Space_Grotesk']">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#181511] border border-slate-800 text-slate-300">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Total: <strong className="text-white">{logs.length}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-950/30 border border-red-800/40 text-red-300">
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>Errores: <strong>{errorCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/30 border border-amber-800/40 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Avisos: <strong>{warnCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#251e12] border border-[#D4AF37]/30 text-amber-200">
              <Radio className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Sync: <strong>{syncCount}</strong></span>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateTestLog}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#201C16] hover:bg-[#332C22] border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-white text-xs transition cursor-pointer"
              title="Registrar un evento de prueba en el logger"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Test Log</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                copied
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                  : 'bg-[#201C16] hover:bg-[#332C22] border-slate-700 hover:border-amber-500/50 text-slate-200'
              }`}
              title="Copiar log formateado al portapapeles"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37]/80 to-[#FDE047]/80 hover:brightness-110 text-black text-xs font-bold transition shadow-sm cursor-pointer"
              title="Descargar archivo JSON completo para soporte técnico"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Descargar JSON</span>
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-300 transition cursor-pointer"
              title="Limpiar historial de logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="px-5 py-2.5 border-b border-[#25201A] bg-[#0A0907] flex flex-wrap items-center justify-between gap-3">
          {/* Selector de pestañas */}
          <div className="flex items-center gap-1.5 bg-[#14120F] p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterLevel('all')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterLevel === 'all'
                  ? 'bg-[#D4AF37] text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel('error')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterLevel === 'error'
                  ? 'bg-red-600 text-white font-bold'
                  : 'text-slate-400 hover:text-red-400'
              }`}
            >
              Errores ({errorCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel('warn')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterLevel === 'warn'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              Avisos ({warnCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel('sync')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterLevel === 'sync'
                  ? 'bg-[#8C6314] text-amber-100 font-bold'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Dual-Screen ({syncCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterLevel('youtube')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                filterLevel === 'youtube'
                  ? 'bg-red-900 text-white font-bold'
                  : 'text-slate-400 hover:text-red-300'
              }`}
            >
              YouTube
            </button>
          </div>

          {/* Buscador y Auto-scroll */}
          <div className="flex items-center gap-3 flex-1 sm:flex-initial min-w-[200px] justify-end">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por texto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-lg bg-[#14120F] border border-slate-800 focus:border-amber-500/50 text-xs text-slate-200 placeholder-slate-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0"
              />
              <span>Auto-scroll</span>
            </label>
          </div>
        </div>

        {/* Consola de Registros (Terminal Monospace) */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed bg-[#050505] space-y-1 select-text">
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 font-['Outfit']">
              <Terminal className="w-10 h-10 text-slate-700" />
              <p className="text-sm">No hay registros que coincidan con el filtro actual.</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              // Colores por severidad
              let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
              let textColor = 'text-slate-300';
              let icon = <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />;

              if (log.level === 'error') {
                badgeColor = 'bg-red-950/60 text-red-300 border-red-700/50';
                textColor = 'text-red-200';
                icon = <AlertOctagon className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />;
              } else if (log.level === 'warn') {
                badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-700/50';
                textColor = 'text-amber-200';
                icon = <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />;
              } else if (log.level === 'sync' || log.source === 'Sync') {
                badgeColor = 'bg-amber-900/30 text-[#D4AF37] border-[#D4AF37]/30';
                textColor = 'text-amber-100';
                icon = <Radio className="w-3 h-3 text-[#D4AF37] shrink-0 mt-0.5" />;
              }

              return (
                <div
                  key={log.id}
                  className="group flex flex-col py-1 px-2 rounded hover:bg-[#12100D] transition-colors border-b border-white/[0.02]"
                >
                  <div className="flex items-start gap-2">
                    {icon}
                    <span className="text-slate-500 shrink-0">{log.timeStr}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${badgeColor}`}
                    >
                      {log.source}
                      {log.remote && ' 📡'}
                    </span>
                    <span className={`break-words flex-1 ${textColor}`}>
                      {log.message}
                    </span>
                  </div>

                  {/* Render de detalles o payload si existen */}
                  {log.details && (
                    <div className="ml-7 mt-0.5 pl-2 border-l border-slate-800 text-slate-400 text-[10px] break-all bg-black/40 rounded p-1.5">
                      <pre className="whitespace-pre-wrap font-mono">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details, null, 2)
                          : String(log.details)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* Pie del Visor */}
        <div className="px-5 py-2.5 border-t border-[#332C22] bg-[#14120F] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetría en tiempo real activa</span>
          </div>
          <span>Mostrando {filteredLogs.length} de {logs.length} eventos</span>
        </div>

      </div>
    </div>
  );
}
