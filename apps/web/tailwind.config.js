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
        background: '#1e1e1e',
        surface: '#262626',
        surfaceHover: '#333333',
        border: '#383838',
        accent: '#107c41',
        accentHover: '#0e6b37',
        textMain: '#ffffff',
        textMuted: '#a6a6a6',
        gridBg: '#ffffff',
        gridBorder: '#e1dfdd',
        gridText: '#111827',
        headerBg: '#262626',
        headerText: '#cccccc',
        headerActive: '#383838',
      }
    },
  },
  plugins: [],
}
