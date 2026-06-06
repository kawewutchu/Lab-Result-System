/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#060B12',
        'bg-panel': '#090F18',
        'accent': '#00C2FF',
        'green': '#00D97A',
        'red-signal': '#FF3A55',
        'gold': '#FFB300',
        'border-dark': '#1A2535',
        'text-primary': '#E8EDF2',
        'text-secondary': '#7A8999',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
