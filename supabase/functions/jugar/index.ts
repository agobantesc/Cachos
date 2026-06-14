// Edge Function autoritativa del Cacho.
//
// Es el ÚNICO componente que ve el estado completo (todas las caras). Corre el
// motor, valida cada jugada y persiste las proyecciones:
//   - secretos.estado_completo  (privado, sólo service role)
//   - salas.estado_publico      (la mesa, para todos los miembros)
//   - manos.<jugador>           (la mano de cada quien; null si juega a ciegas)
//
// El motor llega empaquetado en ../_shared/engine.mjs (correr `npm run build:engine`).
//
// Identidad: cada dispositivo entra con Supabase Auth (anónimo). El jugadorId es
// auth.uid(); nunca se confía en un id mandado por el cliente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @ts-ignore  bundle JS sin tipos
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  proyeccionPublica,
  vistaJugador,
  REGLAS_POR_DEFECTO,
} from "../_shared/engine.mjs";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1
function codigoSala(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  return s;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/** Escribe el estado completo + proyecciones públicas + manos privadas. */
async function persistir(admin: any, salaId: string, estado: any) {
  await admin.from("secretos").upsert({ sala_id: salaId, estado_completo: estado });
  await admin
    .from("salas")
    .update({ estado_publico: proyeccionPublica(estado), fase: estado.fase })
    .eq("id", salaId);
  const filas = estado.jugadores.map((j: any) => ({
    sala_id: salaId,
    jugador_id: j.id,
    mano: vistaJugador(estado, j.id).miMano,
  }));
  await admin.from("manos").upsert(filas);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // Identidad del que llama.
    const usuario = createClient(URL, ANON, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: auth } = await usuario.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return json({ error: "No autenticado." }, 401);

    const admin = createClient(URL, SERVICE);
    const cuerpo = await req.json();

    switch (cuerpo.tipo) {
      case "crearSala": {
        const codigo = codigoSala();
        const { data: sala, error } = await admin
          .from("salas")
          .insert({ codigo, anfitrion_id: uid, fase: "LOBBY" })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await admin.from("jugadores_sala").insert({
          sala_id: sala.id,
          jugador_id: uid,
          nombre: String(cuerpo.nombre ?? "Jugador"),
          asiento: 0,
        });
        return json({ salaId: sala.id, codigo });
      }

      case "unirse": {
        const { data: sala } = await admin
          .from("salas")
          .select("*")
          .eq("codigo", String(cuerpo.codigo ?? "").toUpperCase())
          .maybeSingle();
        if (!sala) return json({ error: "Sala no encontrada." }, 404);
        if (sala.fase !== "LOBBY") return json({ error: "La partida ya empezó." }, 409);
        const { count } = await admin
          .from("jugadores_sala")
          .select("*", { count: "exact", head: true })
          .eq("sala_id", sala.id);
        await admin.from("jugadores_sala").upsert({
          sala_id: sala.id,
          jugador_id: uid,
          nombre: String(cuerpo.nombre ?? "Jugador"),
          asiento: count ?? 0,
        });
        return json({ salaId: sala.id });
      }

      case "iniciar": {
        const salaId = String(cuerpo.salaId);
        const { data: sala } = await admin.from("salas").select("*").eq("id", salaId).single();
        if (sala.anfitrion_id !== uid) return json({ error: "Sólo el anfitrión inicia." }, 403);
        const { data: miembros } = await admin
          .from("jugadores_sala")
          .select("*")
          .eq("sala_id", salaId)
          .order("asiento");
        const jugadores = (miembros ?? []).map((m: any) => ({ id: m.jugador_id, nombre: m.nombre }));
        let estado = crearJuego(jugadores, REGLAS_POR_DEFECTO);
        estado = iniciarRonda(estado, cuerpo.sentido ? { sentido: cuerpo.sentido } : {});
        await persistir(admin, salaId, estado);
        return json({ ok: true });
      }

      case "accion": {
        const salaId = String(cuerpo.salaId);
        const { data: secreto } = await admin
          .from("secretos")
          .select("estado_completo")
          .eq("sala_id", salaId)
          .single();
        const estado = secreto.estado_completo;
        // El jugadorId SIEMPRE sale de la sesión, nunca del cliente.
        const jugada = { ...cuerpo.jugada, jugadorId: uid };
        const nuevo = aplicarAccion(estado, jugada);
        await persistir(admin, salaId, nuevo);
        return json({ ok: true });
      }

      case "siguienteRonda": {
        const salaId = String(cuerpo.salaId);
        const { data: secreto } = await admin
          .from("secretos")
          .select("estado_completo")
          .eq("sala_id", salaId)
          .single();
        const estado = secreto.estado_completo;
        if (estado.fase !== "FIN_RONDA") return json({ error: "La ronda no ha terminado." }, 409);
        const nuevo = iniciarRonda(estado, cuerpo.sentido ? { sentido: cuerpo.sentido } : {});
        await persistir(admin, salaId, nuevo);
        return json({ ok: true });
      }

      default:
        return json({ error: "Acción desconocida." }, 400);
    }
  } catch (e) {
    // Los ErrorDeJuego del motor (jugada ilegal) caen acá como 400.
    return json({ error: e instanceof Error ? e.message : "Error" }, 400);
  }
});
