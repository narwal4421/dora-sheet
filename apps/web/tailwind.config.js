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
        background: '#020617',
        surface: '#0f172a',
        surfaceHover: '#1e293b',
        border: '#334155',
        accent: '#0ea5e9',
        accentHover: '#38bdf8',
        textMain: '#f8fafc',
        textMuted: '#94a3b8',
      }
    },
  },
  plugins: [],
}
