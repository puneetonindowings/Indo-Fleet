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
          navy: '#191b30',
          navyDark: '#121424',
          navyLight: '#242742',
          orange: '#ef7f1a',
          orangeHover: '#d96e11',
          orangeSoft: '#fff7ed',
          orangeBorder: '#fed7aa',
          white: '#ffffff',
          slate: '#f8fafc'
        },
        skygrid: {
          bg: '#191b30',
          dark: '#121424',
          purple: '#ef7f1a',
          purpleDark: '#d96e11',
          violet: '#ef7f1a',
          violetSoft: '#fff7ed',
          cyan: '#ef7f1a',
          green: '#10b981',
          amber: '#ef7f1a',
          panel: '#ffffff',
          line: '#e2e8f0',
          surface: '#ffffff',
          surfaceMuted: '#f8fafc',
          ink: '#191b30',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 18px 48px rgba(25, 27, 48, 0.16)',
        'orange-glow': '0 0 25px rgba(239, 127, 26, 0.35)',
        'glass': '0 8px 32px 0 rgba(25, 27, 48, 0.08)'
      }
    },
  },
  plugins: [],
}
