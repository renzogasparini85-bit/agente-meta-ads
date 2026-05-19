/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F1117',
        surface: '#1A1D27',
        border: '#2A2D3A',
        violet: {
          DEFAULT: '#6B21A8',
          light: '#7C3AED',
          glow: '#8B5CF6',
        },
        orange: {
          DEFAULT: '#FF6B00',
          light: '#FF8C38',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(107,33,168,0.3)',
        'glow-orange': '0 0 20px rgba(255,107,0,0.25)',
      },
    },
  },
  plugins: [],
}
