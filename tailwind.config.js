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
        brand: {
          DEFAULT: 'var(--brand)', // بنفسجي أساسي
          hover: 'var(--brand-hover)',
          light: '#A78BFA', 
          bg: 'rgba(139, 92, 246, 0.1)',
        },
        medical: {
          teal: '#14B8A6', // تركواز طبي
        },
        surface: {
          DEFAULT: 'var(--bg)',
          card: 'var(--bg-card)',
          soft: 'var(--bg-soft)',
        },
        border: {
          DEFAULT: 'var(--border)',
        },
        content: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'brand': '0 4px 20px -2px rgba(139, 92, 246, 0.25)',
      }
    },
  },
  plugins: [],
};