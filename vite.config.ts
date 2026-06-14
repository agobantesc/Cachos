import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// PWA: para repartir el juego con un link y que cada amigo lo "agregue a la
// pantalla de inicio" del iPhone, sin App Store.
// `base` se ajusta en el deploy de GitHub Pages (BASE_PATH=/Cachos/); en local es "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["cacho.svg"],
      manifest: {
        name: "Cachos — Dudo chileno",
        short_name: "Cachos",
        description: "Cacho/Dudo para jugar remoto con los amigos.",
        theme_color: "#0b3d2e",
        background_color: "#0b3d2e",
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
