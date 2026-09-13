/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FDE047',
          300: '#FACC15',
          400: '#E5B83B',
          500: '#D4AF37', // Brand Core Gold
          600: '#B8860B',
          700: '#8C6314',
          800: '#543A08',
          900: '#2E1E05',
        },
        chrome: {
          100: '#FFFFFF',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1',
          500: '#94A3B8',
          600: '#475569',
        },
        obsidian: {
          950: '#040404',
          900: '#090807',
          800: '#14120F',
          700: '#201C16',
          600: '#332C22',
          500: '#4A4032',
        },
        neon: {
          pink: '#ff007f',
          purple: '#9d00ff',
          cyan: '#00f0ff',
          yellow: '#ffe600',
          green: '#00ff66',
        },
        dark: {
          900: '#090807',
          800: '#14120F',
          700: '#201C16',
          600: '#332C22',
          500: '#4A4032',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-gold': 'glowGold 2.5s ease-in-out infinite alternate',
        'equalizer': 'equalizer 1.2s ease-in-out infinite alternate',
      },
      keyframes: {
        glowGold: {
          '0%': { boxShadow: '0 0 10px rgba(212, 175, 55, 0.3), 0 0 20px rgba(212, 175, 55, 0.15)' },
          '100%': { boxShadow: '0 0 25px rgba(212, 175, 55, 0.65), 0 0 45px rgba(245, 158, 11, 0.35)' },
        },
        equalizer: {
          '0%': { height: '15%' },
          '100%': { height: '100%' }
        }
      }
    },
  },
  plugins: [],
}
