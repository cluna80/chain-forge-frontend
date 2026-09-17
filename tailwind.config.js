/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#07080d',
          900: '#0a0c14',
          850: '#0d1018',
          800: '#111521',
          750: '#161b2c',
          700: '#1c2238',
          600: '#262d48',
          500: '#353d5e',
          400: '#4a5378',
          300: '#6b75a0',
          200: '#9aa3c8',
          100: '#c8d0ea',
          50: '#e8ecf8',
        },
        forge: {
          400: '#5b8cff',
          500: '#3b6ef5',
          600: '#2b54d4',
          700: '#1e3da8',
        },
        violet: {
          400: '#9d7bff',
          500: '#8155f0',
          600: '#6b3fd4',
        },
        success: {
          400: '#3dd685',
          500: '#1fb96b',
          600: '#15995a',
        },
        warn: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          400: '#fb6a6a',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
