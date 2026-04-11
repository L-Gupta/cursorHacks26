/**
 * PostCSS pipeline for Tailwind and Autoprefixer.
 *
 * Vite invokes PostCSS when processing ``src/index.css``; this file declares
 * the plugin chain so Tailwind directives are expanded and vendor prefixes
 * are applied for broad browser support during demo and judging.
 */
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
