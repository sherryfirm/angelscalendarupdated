/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'oswald': ["'Oswald', sans-serif"],
        'barlow': ["'Barlow Condensed', sans-serif"],
      },
      colors: {
        zinc: {
          750: '#2d2d2d',
        }
      }
    },
  },
  plugins: [],
}
