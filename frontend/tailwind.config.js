/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        opsara: {
          bg: "#0B0F17",
          panel: "#111827",
          panelHover: "#1F2937",
          border: "#1E293B",
          text: "#F1F5F9",
          muted: "#94A3B8",
          accent: "#38BDF8",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
          brand: "#2563EB"
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
