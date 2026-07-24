/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Árbitro en línea (Render): URL del servidor WebSocket. */
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Sello de versión inyectado por Vite (ver `define` en vite.config.ts).
declare const __BUILD_TIME__: string;
declare const __APP_VERSION__: string;
