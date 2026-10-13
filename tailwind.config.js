/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // ═══ ألوان ثابتة (لا تتغير مع الثيم) ═══
        primary: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#1E40AF',
        },
        success: '#22C55E',
        warn: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',

        // ═══ ألوان تتغير مع الثيم (CSS Variables) ═══
        surface: {
          DEFAULT: 'var(--bg)',
          soft: 'var(--bg-subtle)',
          card: 'var(--bg-elevated)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border)',
        },
        content: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};