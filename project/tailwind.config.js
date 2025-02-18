/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          card: '#1E293B',
          hover: '#334155',
          border: '#374151',
          text: {
            primary: '#F3F4F6',
            secondary: '#CBD5E1'
          }
        }
      },
      animation: {
        'status-change': 'statusChange 0.3s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        statusChange: {
          '0%': { transform: 'scale(0.95)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function({ addComponents, theme }) {
      addComponents({
        '.calendar-grid': {
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: theme('spacing.2'),
        },
      });
    },
  ],
};