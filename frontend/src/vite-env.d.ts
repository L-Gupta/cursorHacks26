/**
 * Vite client type references for ``import.meta.env`` and asset imports.
 *
 * Ensures TypeScript recognizes ``VITE_*`` env vars when using ``import.meta.env``.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEEPGRAM_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
