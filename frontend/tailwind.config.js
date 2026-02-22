/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aura: {
          deep: '#0a0f1e',
          card: 'rgba(15, 23, 42, 0.6)',
          glass: 'rgba(255, 255, 255, 0.04)',
          border: 'rgba(255, 255, 255, 0.08)',
          teal: '#00d4ff',
          tealDim: 'rgba(0, 212, 255, 0.5)',
          violet: '#7c3aed',
          violetDim: 'rgba(124, 58, 237, 0.5)',
          green: '#00ff88',
          amber: '#ffb800',
          red: '#ff4444',
          text: 'rgba(255, 255, 255, 0.92)',
          muted: 'rgba(255, 255, 255, 0.55)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px rgba(0, 212, 255, 0.15)',
        glowStrong: '0 0 80px rgba(0, 212, 255, 0.25)',
      },
      backdropBlur: {
        glass: '20px',
      },
    },
  },
  plugins: [],
}
