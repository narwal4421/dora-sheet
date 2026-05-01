/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: '#0f1115', // Deep dark gray/blue
        surface: '#1c1f26',   // Slightly lighter for panels
        surfaceHover: '#2a2e38',
        border: '#333842',
        accent: '#6366f1',    // Indigo neon
        accentHover: '#818cf8',
        textMain: '#f8fafc',
        textMuted: '#94a3b8',
      }
    },
  },
  plugins: [],
}
