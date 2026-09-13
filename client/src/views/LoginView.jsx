import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, Mic } from 'lucide-react';
import IntroSplash from '../components/IntroSplash';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [destinationPath, setDestinationPath] = useState('/');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Si ya está autenticado desde antes (sin pasar por submit), redirigir directamente
  React.useEffect(() => {
    if (isAuthenticated && !showIntro) {
      const from = location.state?.from?.pathname;
      const target = (from && from !== '/login') ? from : '/';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, showIntro, location.state, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsSubmitting(true);

    const result = login(cleanUser, cleanPass);

    if (result.success) {
      const from = location.state?.from?.pathname;
      const target = (from && from !== '/login') ? from : '/';
      setDestinationPath(target);
      // Activar animación oficial de Escenario 89
      setShowIntro(true);
    } else {
      setErrorMessage(result.error);
      setIsSubmitting(false);
    }
  };

  // Mostrar animación del Logo Escenario 89 tras loguearse
  if (showIntro) {
    return (
      <IntroSplash
        onComplete={() => {
          navigate(destinationPath, { replace: true });
        }}
      />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#040404] flex flex-col items-center justify-center text-amber-200">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-400 animate-spin mb-3" />
        <p className="text-xs font-mono tracking-wider uppercase">Iniciando Consola de Control...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040404] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-['Outfit',sans-serif]">
      {/* Reflectores y resplandores de fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[300px] bg-amber-900/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-yellow-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Tarjeta Central de Inicio de Sesión VIP */}
      <div className="w-full max-w-md bg-[#14120F]/95 backdrop-blur-xl border border-[#332C22] rounded-3xl p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative z-10">
        {/* Imagotipo Oficial de Escenario 89 */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative mb-4 group">
            <div className="w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-amber-600 via-[#FDE047] to-amber-500 shadow-[0_0_25px_rgba(212,175,55,0.4)] overflow-hidden">
              <img
                src="/logo-escenario89.jpg"
                alt="Escenario 89 Logo"
                className="w-full h-full object-cover scale-105"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-black p-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <h1 className="text-2xl font-black tracking-wider uppercase bg-gradient-to-r from-[#FDE047] via-[#D4AF37] to-[#B8860B] bg-clip-text text-transparent font-['Space_Grotesk',sans-serif]">
            Escenario 89
          </h1>
          <p className="text-xs text-amber-200/70 font-mono tracking-widest uppercase mt-1">
            CONSOLA DE CONTROL • ACCESO VIP
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-6 p-3.5 bg-red-950/50 border border-red-800/80 rounded-xl flex items-center gap-3 text-red-200 text-xs animate-shake shadow-inner">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Usuario */}
          <div>
            <label className="block text-xs font-semibold text-amber-200/80 mb-2 tracking-wide uppercase">
              Usuario del Sistema
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Admin"
                autoComplete="username"
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-[#090807] border border-[#332C22] focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-slate-100 placeholder-zinc-600 text-sm outline-none transition"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-amber-200/80 mb-2 tracking-wide uppercase">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400/60">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 bg-[#090807] border border-[#332C22] focus:border-amber-400/80 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-slate-100 placeholder-zinc-600 text-sm outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-amber-400/60 hover:text-amber-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#D4AF37] via-[#FDE047] to-[#B8860B] hover:from-[#FDE047] hover:to-[#D4AF37] text-black font-extrabold text-sm tracking-wider uppercase rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Ingresar a la Consola</span>
              </>
            )}
          </button>
        </form>

        {/* Pie de la tarjeta */}
        <div className="mt-8 pt-5 border-t border-[#332C22]/60 flex items-center justify-between text-[11px] text-amber-200/50">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400/70" />
            Dual-Screen Enabled
          </span>
          <span>Escenario 89 • v1.0</span>
        </div>

        {/* Créditos de Desarrollo Oficial */}
        <div className="mt-5 pt-4 border-t border-[#332C22]/50 text-center">
          <p className="text-xs text-amber-200/70 leading-relaxed font-medium">
            Aplicación Desarrollada por{' '}
            <a
              href="https://www.andresavila.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#FDE047] hover:text-[#D4AF37] underline underline-offset-4 decoration-amber-500/50 hover:decoration-amber-300 transition inline-block"
            >
              Andrés Ávila Motta (www.andresavila.org)
            </a>
          </p>
        </div>
      </div>

      {/* Footer discreto exterior */}
      <footer className="mt-6 text-center text-[11px] text-amber-200/40 relative z-10">
        <p>Escenario 89 Karaoke Bar &bull; Sistema de Doble Pantalla Profesional</p>
      </footer>
    </div>
  );
}
