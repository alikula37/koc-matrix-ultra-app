/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          bg: "#020617",
          card: "#0f172a",
          border: "#1e293b",
          green: "#00ff88",
          red: "#ff3366",
          cyan: "#00e5ff",
          amber: "#ffaa00",
          muted: "#64748b"
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      animation: {
        pulseGlow: "pulseGlow 2s infinite",
        matrixScroll: "matrixScroll 20s linear infinite"
      },
      keyframes: {
        pulseGlow: {
          "0%,100%": { opacity: "1", boxShadow: "0 0 10px rgba(0,255,136,0.3)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 20px rgba(0,255,136,0.6)" }
        },
        matrixScroll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" }
        }
      }
    },
  },
  plugins: [],
}
