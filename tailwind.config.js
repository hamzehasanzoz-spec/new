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
          deep: '#30215F',
          DEFAULT: '#7957D5',
          light: '#BCA7F4',
          soft: '#F8F7FC',
        },
        medical: {
          teal: '#4FC7C4',
          dark: '#3BA8A5',
        },
        surface: {
          DEFAULT: 'var(--bg)',
          soft: 'var(--bg-subtle)',
          card: 'var(--bg-elevated)',
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
        arabic: ['Tajawal', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '10px',
        'lg': '14px',
        'xl': '20px',
        '2xl': '24px',
      },
      boxShadow: {
        'brand': '0 4px 20px -2px rgba(121, 87, 213, 0.2)',
      }
    },
  },
  plugins: [],
};