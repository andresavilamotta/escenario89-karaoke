import React, { useRef, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';

export default function NotificationCenter({
  notifications = [],
  isOpen = false,
  onToggle,
  onClear,
  onClose,
  hasUnread = false,
}) {
  const panelRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de Campana en el Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative p-2.5 rounded-xl border transition-all duration-200 flex items-center justify-center ${
          isOpen
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/25'
            : hasUnread
            ? 'bg-[#201C16] hover:bg-[#332C22] border-amber-500/60 text-amber-400 animate-pulse'
            : 'bg-[#201C16] hover:bg-[#332C22] border-[#332C22] text-slate-300 hover:text-white'
        }`}
        title="Ver notificaciones y registro del sistema"
      >
        <Bell className="w-5 h-5" />

        {/* Badge contador si hay notificaciones */}
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono text-[10px] font-extrabold shadow-md shadow-amber-500/40">
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </button>

      {/* Menú Desplegable Flotante */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#14120F]/95 border border-[#332C22] rounded-2xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[480px]">
          {/* Header del Panel */}
          <div className="flex items-center justify-between p-3.5 border-b border-[#201C16] bg-[#090807]/80">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-['Space_Grotesk',sans-serif]">
                Registro del Sistema ({notifications.length})
              </h3>
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-[#201C16] rounded transition text-xs flex items-center gap-1"
                  title="Borrar todas las notificaciones"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Limpiar</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white hover:bg-[#201C16] rounded transition"
                title="Cerrar panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 divide-y divide-[#201C16]/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                <Bell className="w-8 h-8 text-slate-600 mb-2 opacity-40" />
                <p className="text-xs font-medium text-slate-400">Sin notificaciones pendientes</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Los eventos de la consola se guardarán aquí.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[#201C16]/50 transition-colors"
                >
                  {/* Ícono según tipo */}
                  <div className="flex-shrink-0 mt-0.5">
                    {n.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : n.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Info className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  {/* Mensaje y hora */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-200 leading-snug break-words">
                      {n.message}
                    </p>
                    <span className="text-[10px] font-mono text-amber-200/50 mt-1 block">
                      {n.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
