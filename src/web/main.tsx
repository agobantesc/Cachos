import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
// Tipografía de la casa, embebida (funciona offline y se ve igual en todo
// aparato — Android no trae Georgia). Sólo el subset latino, pesa poco.
import "@fontsource/playfair-display/latin-600.css";
import "@fontsource/playfair-display/latin-700.css";
import "@fontsource/playfair-display/latin-800.css";
import "@fontsource/playfair-display/latin-500-italic.css";
import "./styles.css";
import { iniciarSW } from "./sw";

iniciarSW();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
