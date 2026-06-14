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
  define: { __BUILD_TIME__: JSON.stringify(BUILD_TIME) },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["cacho.svg"],
      manifest: {
        name: "La Asociación de Cachos",
        short_name: "Asociación",
        description: "El dudo clandestino para jugar con los socios.",
        theme_color: "#0c0d10",
        background_color: "#0c0d10",
        display: "standalone",
        orientation: "portrait",
        icons: [
          { src: "cacho.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
