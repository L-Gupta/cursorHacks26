/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rh: {
          bg: "#000000",
          surface: "#1E1F23",
          card: "#262730",
          border: "#2F3037",
          green: "#00C805",
          red: "#FF5000",
          text: "#FFFFFF",
          muted: "#9B9B9B",
          subtle: "#6F7178",
          hover: "#2C2D33",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
