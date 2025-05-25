/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        blue: {
          400: '#3E92CC',
          600: '#0A2463',
          700: '#071E4A'
        },
        teal: {
          500: '#2CA58D'
        }
      }
    },
  },
  plugins: [],
};