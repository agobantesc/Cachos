// Punto de entrada LIGERO al modo en línea. El cliente de Supabase pesa ~cientos
// de KB y sólo hace falta al jugar online, así que NO se importa estáticamente:
// se carga bajo demanda con import() dinámico (Vite lo separa en su propio chunk,
// fuera del bundle inicial del modo solo/torneo). Aquí sólo vive el chequeo de
// configuración, que necesita las env vars pero no la librería.
import type { TransporteSupabase } from "./transporteSupabase";

export function supabaseConfigurado(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

/** Carga la librería online bajo demanda y crea el transporte (sesión anónima). */
export async function crearTransporteOnline(): Promise<TransporteSupabase> {
  const { TransporteSupabase } = await import("./transporteSupabase");
  return TransporteSupabase.crear();
}
