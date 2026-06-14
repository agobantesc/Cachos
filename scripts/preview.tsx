// Genera una previsualización ESTÁTICA del UI (sin navegador): renderiza los
// componentes con el motor real y embebe el CSS en un HTML autocontenido.
// Uso: se empaqueta con esbuild y se corre con node (ver npm run preview:html).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server.browser";
import { App } from "../src/web/App";
import { Mesa } from "../src/web/Mesa";
import { TransporteLocal } from "../src/web/transporte";

const css = readFileSync("src/web/styles.css", "utf8");

function estadoMedio() {
  const t = new TransporteLocal([
    { id: "p0", nombre: "Ana" },
    { id: "p1", nombre: "Beto" },
    { id: "p2", nombre: "Cata" },
    { id: "p3", nombre: "Dani" },
  ]);
  void t.iniciar();
  void t.apostar({ cantidad: 2, pinta: 5 });
  void t.apostar({ cantidad: 3, pinta: 5 });
  void t.apostar({ cantidad: 3, pinta: 6 });
  return t;
}

function estadoReveal() {
  const t = estadoMedio();
  void t.dudar();
  return t;
}

const home = renderToStaticMarkup(<App />);
const tMedio = estadoMedio();
const mesa = renderToStaticMarkup(<Mesa snap={tMedio.instantanea()} transporte={tMedio} />);
const tReveal = estadoReveal();
const reveal = renderToStaticMarkup(<Mesa snap={tReveal.instantanea()} transporte={tReveal} />);

const marco = (titulo: string, contenido: string) => `
  <div class="marco">
    <div class="marco-titulo">${titulo}</div>
    <div id="root" class="telefono">${contenido}</div>
  </div>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Cachos — preview</title>
<style>
  body { margin:0; background:#111; font-family:-apple-system,system-ui,sans-serif; padding:24px; }
  .fila { display:flex; gap:24px; flex-wrap:wrap; align-items:flex-start; }
  .marco { background:#000; border-radius:28px; padding:10px; box-shadow:0 10px 40px rgba(0,0,0,.6); }
  .marco-titulo { color:#bbb; font-size:13px; text-align:center; padding:6px; }
  .telefono { width:360px; min-height:680px; position:relative; overflow:hidden; border-radius:20px;
    background: radial-gradient(circle at 50% 0%, #0f4c39, #0b3d2e 70%); }
  .telefono #root, .telefono > * { max-width:none; }
  /* el reveal usa position:fixed; lo acotamos al marco para el preview */
  .telefono .revelacion { position:absolute; }
  ${css}
</style></head>
<body>
  <h2 style="color:#eee">Cachos — previsualización del UI (estática)</h2>
  <div class="fila">
    ${marco("Inicio", home)}
    ${marco("Mesa (en juego)", mesa)}
    ${marco("Revelación (dudo)", reveal)}
  </div>
</body></html>`;

mkdirSync("preview", { recursive: true });
writeFileSync("preview/index.html", html);
console.log("Preview escrito en preview/index.html");
