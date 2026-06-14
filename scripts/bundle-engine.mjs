// Empaqueta el motor (TypeScript) en un único módulo ESM que la Edge Function de
// Supabase (Deno) puede importar sin problemas de resolución de extensiones.
//
// esbuild resuelve los specifiers `./x.js` a los archivos `./x.ts` reales, así que
// el motor mantiene sus imports estilo Node y aquí queda en un solo archivo.
import { build } from "esbuild";

await build({
  entryPoints: ["src/engine/index.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "esnext",
  outfile: "supabase/functions/_shared/engine.mjs",
  banner: { js: "// GENERADO por scripts/bundle-engine.mjs — no editar a mano." },
});

console.log("Motor empaquetado -> supabase/functions/_shared/engine.mjs");
