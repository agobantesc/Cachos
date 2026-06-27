// Árbitro del Cacho para Render (servidor autoritativo por WebSocket).
//
// Es el ÚNICO que ve el estado completo (todas las caras). Mantiene las salas en
// memoria, corre el motor del juego, valida cada jugada y manda a cada jugador
// SÓLO lo suyo: la mesa pública + su propia mano. Así nadie ve los dados ajenos
// ni puede hacer trampa (el id del jugador sale de su conexión, nunca del cliente).
//
// Identidad: cada conexión se asocia a un jugador. El cliente manda un `clienteId`
// estable (guardado en su navegador) para poder reconectarse a su asiento si se
// le cae la conexión o recarga la página.
import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  vistaJugador,
  jugadorDeTurnoId,
  type Accion,
  type EstadoJuego,
  type Sentido,
} from "../engine/index.js";
import { decidirBot, type JugadaBot } from "../web/bots.js";

/** Tras este tiempo sin que un jugador desconectado vuelva, un bot juega por él
 *  para que la partida no se cuelgue esperando su turno. */
const GRACIA_AUSENTE_MS = Number(process.env.GRACIA_AUSENTE_MS ?? 12000);

const PUERTO = Number(process.env.PORT ?? 8787);
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin O/0/I/1

interface JugadorSala {
  id: string;
  nombre: string;
  clienteId: string;
}
interface Sala {
  codigo: string;
  jugadores: JugadorSala[]; // orden de asientos
  anfitrionId: string;
  estado: EstadoJuego | null; // null mientras está en el lobby
  conns: Map<string, Set<WebSocket>>; // jugadorId -> sockets abiertos
  ultimaActividad: number;
  /** Timer para que un bot juegue por un jugador ausente. */
  timerBot: ReturnType<typeof setTimeout> | null;
}
interface InfoConn {
  codigo: string;
  jugadorId: string;
}

const salas = new Map<string, Sala>();
const conexiones = new Map<WebSocket, InfoConn>();

function codigoNuevo(): string {
  let c = "";
  do {
    c = "";
    for (let i = 0; i < 6; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  } while (salas.has(c));
  return c;
}

function recorta(s: unknown, def: string): string {
  return String(s ?? def).slice(0, 24) || def;
}

function enviar(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}
function errorA(ws: WebSocket, mensaje: string): void {
  enviar(ws, { tipo: "error", mensaje });
}

/** Instantánea personalizada para un jugador (mesa pública + SU mano). */
function snapshot(sala: Sala, jugadorId: string) {
  const jugadoresLobby = sala.jugadores.map((j) => ({ id: j.id, nombre: j.nombre }));
  const base = {
    tipo: "estado",
    codigo: sala.codigo,
    anfitrionId: sala.anfitrionId,
    miId: jugadorId,
    jugadoresLobby,
  };
  if (!sala.estado) return { ...base, publico: null, miMano: null };
  const v = vistaJugador(sala.estado, jugadorId);
  return { ...base, publico: v.publico, miMano: v.miMano };
}

/** Manda a cada jugador conectado su instantánea. */
function difundir(sala: Sala): void {
  sala.ultimaActividad = Date.now();
  for (const [jid, sockets] of sala.conns) {
    const snap = snapshot(sala, jid);
    for (const ws of sockets) enviar(ws, snap);
  }
  programarAusente(sala);
}

function conectado(sala: Sala, jugadorId: string): boolean {
  const set = sala.conns.get(jugadorId);
  return !!set && set.size > 0;
}

function accionDeBot(j: JugadaBot, jugadorId: string): Accion {
  switch (j.tipo) {
    case "APOSTAR":
      return { tipo: "APOSTAR", jugadorId, apuesta: j.apuesta };
    case "CALZAR":
      return { tipo: "CALZAR", jugadorId };
    case "PASAR":
      return { tipo: "PASAR", jugadorId };
    case "DUDAR_PASO":
      return { tipo: "DUDAR_PASO", jugadorId };
    case "DUDAR":
      return { tipo: "DUDAR", jugadorId };
  }
}

/** Si quien tiene el turno (o el abridor en FIN_RONDA) está desconectado, agenda
 *  que un bot juegue por él tras una gracia, para que la mesa no se cuelgue. */
function programarAusente(sala: Sala): void {
  if (sala.timerBot) {
    clearTimeout(sala.timerBot);
    sala.timerBot = null;
  }
  const e = sala.estado;
  if (!e) return;
  if (e.fase === "EN_RONDA") {
    const turno = jugadorDeTurnoId(e);
    if (turno && !conectado(sala, turno)) {
      sala.timerBot = setTimeout(() => jugarPorAusente(sala, turno), GRACIA_AUSENTE_MS);
    }
  } else if (e.fase === "FIN_RONDA") {
    const ab = e.abridorRondaId;
    if (ab && !conectado(sala, ab)) {
      sala.timerBot = setTimeout(() => avanzarPorAusente(sala), GRACIA_AUSENTE_MS);
    }
  }
}

function jugarPorAusente(sala: Sala, jugadorId: string): void {
  sala.timerBot = null;
  const e = sala.estado;
  if (!e || e.fase !== "EN_RONDA") return;
  if (jugadorDeTurnoId(e) !== jugadorId || conectado(sala, jugadorId)) return; // volvió o cambió el turno
  const v = vistaJugador(e, jugadorId);
  const jugada = decidirBot(v.publico, v.miMano, jugadorId, "medio");
  try {
    sala.estado = aplicarAccion(e, accionDeBot(jugada, jugadorId));
  } catch {
    try {
      sala.estado = aplicarAccion(e, { tipo: "DUDAR", jugadorId });
    } catch {
      /* sin jugada legal: se deja como está */
    }
  }
  difundir(sala);
}

function avanzarPorAusente(sala: Sala): void {
  sala.timerBot = null;
  const e = sala.estado;
  if (!e || e.fase !== "FIN_RONDA") return;
  if (!e.abridorRondaId || conectado(sala, e.abridorRondaId)) return;
  sala.estado = iniciarRonda(e);
  difundir(sala);
}

function adjuntar(ws: WebSocket, sala: Sala, jugadorId: string): void {
  conexiones.set(ws, { codigo: sala.codigo, jugadorId });
  let set = sala.conns.get(jugadorId);
  if (!set) {
    set = new Set();
    sala.conns.set(jugadorId, set);
  }
  set.add(ws);
}

function salaDe(ws: WebSocket): { sala: Sala; jugadorId: string } | null {
  const info = conexiones.get(ws);
  if (!info) return null;
  const sala = salas.get(info.codigo);
  if (!sala) return null;
  return { sala, jugadorId: info.jugadorId };
}

function manejar(ws: WebSocket, msg: { tipo?: string; [k: string]: unknown }): void {
  switch (msg.tipo) {
    case "crearSala": {
      const codigo = codigoNuevo();
      const jugadorId = crypto.randomUUID();
      const sala: Sala = {
        codigo,
        jugadores: [{ id: jugadorId, nombre: recorta(msg.nombre, "Anfitrión"), clienteId: recorta(msg.clienteId, jugadorId) }],
        anfitrionId: jugadorId,
        estado: null,
        conns: new Map(),
        ultimaActividad: Date.now(),
        timerBot: null,
      };
      salas.set(codigo, sala);
      adjuntar(ws, sala, jugadorId);
      difundir(sala);
      return;
    }

    case "unirse": {
      const codigo = recorta(msg.codigo, "").toUpperCase();
      const sala = salas.get(codigo);
      if (!sala) return errorA(ws, "Sala no encontrada.");
      const clienteId = recorta(msg.clienteId, "");
      // ¿Reconexión? Si el clienteId ya tiene asiento, vuelve a él.
      let jug = clienteId ? sala.jugadores.find((j) => j.clienteId === clienteId) : undefined;
      if (!jug) {
        if (sala.estado) return errorA(ws, "La partida ya empezó.");
        if (sala.jugadores.length >= 8) return errorA(ws, "La sala está llena.");
        jug = { id: crypto.randomUUID(), nombre: recorta(msg.nombre, "Jugador"), clienteId: clienteId || crypto.randomUUID() };
        sala.jugadores.push(jug);
      }
      adjuntar(ws, sala, jug.id);
      difundir(sala);
      return;
    }

    case "iniciar": {
      const ctx = salaDe(ws);
      if (!ctx) return;
      const { sala, jugadorId } = ctx;
      if (sala.anfitrionId !== jugadorId) return errorA(ws, "Sólo el anfitrión inicia.");
      if (sala.jugadores.length < 2) return errorA(ws, "Faltan jugadores para empezar.");
      let e = crearJuego(sala.jugadores.map((j) => ({ id: j.id, nombre: j.nombre })));
      e = iniciarRonda(e, msg.sentido ? { sentido: msg.sentido as Sentido } : {});
      sala.estado = e;
      difundir(sala);
      return;
    }

    case "accion": {
      const ctx = salaDe(ws);
      if (!ctx || !ctx.sala.estado) return;
      const jugada = { ...(msg.jugada as object), jugadorId: ctx.jugadorId } as Accion;
      try {
        ctx.sala.estado = aplicarAccion(ctx.sala.estado, jugada);
      } catch (e) {
        return errorA(ws, e instanceof Error ? e.message : "Jugada inválida.");
      }
      difundir(ctx.sala);
      return;
    }

    case "siguienteRonda": {
      const ctx = salaDe(ws);
      if (!ctx || !ctx.sala.estado) return;
      if (ctx.sala.estado.fase !== "FIN_RONDA") return errorA(ws, "La ronda no ha terminado.");
      ctx.sala.estado = iniciarRonda(ctx.sala.estado, msg.sentido ? { sentido: msg.sentido as Sentido } : {});
      difundir(ctx.sala);
      return;
    }

    default:
      return;
  }
}

const http = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Árbitro del Cacho — OK");
});

const wss = new WebSocketServer({ server: http });

// Keepalive: detectar y cerrar sockets muertos (Render/proxies cortan WS
// inactivos a ~55s). Si no, quedan conexiones zombi y turnos colgados.
type WsVivo = WebSocket & { isAlive?: boolean };
const PING = setInterval(() => {
  for (const ws of wss.clients) {
    const v = ws as WsVivo;
    if (v.isAlive === false) {
      ws.terminate();
      continue;
    }
    v.isAlive = false;
    try {
      ws.ping();
    } catch {
      /* ignore */
    }
  }
}, 30000);
wss.on("close", () => clearInterval(PING));

wss.on("connection", (ws) => {
  (ws as WsVivo).isAlive = true;
  ws.on("pong", () => {
    (ws as WsVivo).isAlive = true;
  });
  ws.on("message", (data) => {
    let msg: { tipo?: string; [k: string]: unknown };
    try {
      msg = JSON.parse(String(data));
    } catch {
      return;
    }
    try {
      manejar(ws, msg);
    } catch (e) {
      errorA(ws, e instanceof Error ? e.message : "Error");
    }
  });

  ws.on("close", () => {
    const info = conexiones.get(ws);
    conexiones.delete(ws);
    if (!info) return;
    const sala = salas.get(info.codigo);
    if (!sala) return;
    const set = sala.conns.get(info.jugadorId);
    set?.delete(ws);
    if (set && set.size === 0) sala.conns.delete(info.jugadorId);
    if (!sala.estado && sala.conns.size === 0) {
      // Lobby abandonado: se borra.
      if (sala.timerBot) clearTimeout(sala.timerBot);
      salas.delete(info.codigo);
    } else if (sala.estado) {
      // Partida en curso: si era su turno, un bot lo cubrirá tras la gracia.
      programarAusente(sala);
    }
  });
});

// Limpieza de salas viejas (por si el servidor no se reinicia): cada 30 min,
// borra las que llevan más de 6 horas inactivas.
setInterval(() => {
  const ahora = Date.now();
  for (const [cod, sala] of salas) {
    if (ahora - sala.ultimaActividad > 6 * 3600 * 1000) salas.delete(cod);
  }
}, 30 * 60 * 1000);

http.listen(PUERTO, () => {
  console.log(`Árbitro del Cacho escuchando en :${PUERTO}`);
});
