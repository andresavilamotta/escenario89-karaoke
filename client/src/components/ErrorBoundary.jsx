import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#040404] text-white flex flex-col items-center justify-center p-6 text-center font-['Outfit',sans-serif]">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center mb-4 text-red-400 shadow-xl">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-300 font-['Space_Grotesk',sans-serif] mb-2">
            Hubo un problema al cargar la vista
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-6 font-mono bg-[#14120F] p-3 rounded-lg border border-[#332C22]">
            {this.state.error?.message || 'Error desconocido al inicializar componentes.'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
