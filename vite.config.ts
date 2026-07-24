import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Sello de versión (UTC): se muestra en una esquina para saber al instante si
// el navegador cargó la última versión o una cacheada por el service worker.
const BUILD_TIME = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

// PWA: para repartir el juego con un link y que cada amigo lo "agregue a la
// pantalla de inicio" del iPhone, sin App Store.
// `base` se ajusta en el deploy de GitHub Pages (BASE_PATH=/Cachos/); en local es "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  define: { __BUILD_TIME__: JSON.stringify(BUILD_TIME), __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "1.0.0") },
  plugins: [
    react(),
    VitePWA({
      // "prompt": las versiones nuevas avisan con un cartel (ver src/web/sw.ts)
      // en vez de cambiar en silencio a mitad de una mesa.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["cacho.svg", "icono-192.png", "icono-512.png", "icono-180.png"],
      // Precachear también la tipografía embebida (woff2) para el modo offline.
      workbox: { globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"] },
      manifest: {
        name: "La Asociación de Cachos",
        short_name: "Asociación",
        description: "El dudo clandestino para jugar con los socios.",
        theme_color: "#0c0d10",
        background_color: "#0c0d10",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "cacho.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icono-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "icono-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
