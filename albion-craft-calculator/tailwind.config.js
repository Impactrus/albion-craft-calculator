/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        albion: {
          bg: '#0f1117',
          card: '#181b24',
          cardHover: '#1f2430',
          border: '#2b3040',
          gold: '#f0ad4e',
          goldHover: '#e59d3b',
          silver: '#c0c5d0',
          amber: '#d97706',
          green: '#22c55e',
          red: '#ef4444',
          blue: '#3b82f6',
          purple: '#a855f7'
        }
      }
    },
  },
  plugins: [],
}
