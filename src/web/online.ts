// Punto de entrada LIGERO al modo en línea. Soporta dos backends y carga el que
// corresponda BAJO DEMANDA con import() dinámico (Vite los separa en chunks, así
// no pesan en el bundle inicial del modo solo/torneo):
//   - Render (VITE_BACKEND_URL): servidor WebSocket propio. Es el preferido.
//   - Supabase (VITE_SUPABASE_URL + ANON_KEY): backend serverless alternativo.
import type { TransporteOnline } from "./transporte";

const URL_RENDER = import.meta.env.VITE_BACKEND_URL as string | undefined;

/** ¿Hay algún backend en línea configurado? (sólo mira env vars, no carga libs.) */
export function onlineConfigurado(): boolean {
  return Boolean(URL_RENDER) || Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Crea el transporte en línea cargando el backend configurado bajo demanda. */
export async function crearTransporteOnline(): Promise<TransporteOnline> {
  if (URL_RENDER) {
    const { TransporteRender } = await import("./transporteRender");
    return TransporteRender.crear(URL_RENDER);
  }
  const { TransporteSupabase } = await import("./transporteSupabase");
  return TransporteSupabase.crear();
}
