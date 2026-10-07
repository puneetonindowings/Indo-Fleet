/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#171222',
          navyDark: '#090314',
          navyLight: '#1f1630',
          purple: '#5a00b8',
          purpleHover: '#4a0099',
          purpleSoft: '#f1ecf7',
          purpleBorder: '#d7cce2',
          white: '#ffffff',
          slate: '#f7f4fb'
        },
        skygrid: {
          bg: '#091827',
          dark: '#171222',
          purple: '#3b0080',
          purpleDark: '#260052',
          violet: '#6d28d9',
          violetSoft: '#eee4ff',
          cyan: '#14b8d4',
          green: '#1f9d70',
          amber: '#d89032',
          panel: '#ffffff',
          line: '#d7cce2',
          surface: '#ffffff',
          surfaceMuted: '#f1ecf7',
          ink: '#171222',
          muted: '#4f485c'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 18px 48px rgba(11, 24, 39, 0.16)',
        'skygrid': '0 18px 48px rgba(11, 24, 39, 0.16)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'glow': '0 0 25px rgba(109, 40, 217, 0.35)',
        'purple-glow': '0 0 25px rgba(90, 0, 184, 0.35)'
      }
    },
  },
  plugins: [],
}
