/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'usco-vino': '#8F141B',
        'usco-gris': '#4D626C',
        'usco-ocre': '#DFD4A6',
        'usco-fondo': '#F8F9FA',
      },
    },
  },
  plugins: [],
}
