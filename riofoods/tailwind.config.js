/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // paleta Rio Foods: negro 50%, rojo 40%, blanco 10%
        rio: {
          black: '#0a0a0a',
          coal: '#171717',
          ash: '#262626',
          red: '#dc2626',
          'red-dark': '#991b1b',
          'red-light': '#ef4444',
          white: '#fafafa',
          muted: '#a3a3a3',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
