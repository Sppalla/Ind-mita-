/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#FAF0E6',
        terracotta: '#E6D0BD',
        gold: '#CDA06B',
        espresso: '#45392D',
        blush: '#F7EFE8',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 20px 45px rgba(69, 57, 45, 0.08)',
      },
    },
  },
  plugins: [],
}

