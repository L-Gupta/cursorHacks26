/**
 * Tailwind CSS configuration for EarningsLens.
 *
 * Extends the default theme with hackathon palette tokens (dark background,
 * cyan accent, amber warning, red danger) and enables class scanning under
 * ``./index.html`` and ``./src/**`` so utility classes in components are
 * included in the production CSS purge.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        el: {
          bg: "#0a0f1e",
          surface: "#111827",
          accent: "#06b6d4",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
