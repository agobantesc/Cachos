// Modo Torneo (solitario): el humano juega UNA mesa real por ronda y las demás
// mesas se resuelven "a puertas cerradas" (bots vs bots) con el mismo motor.
// Eliminación directa: el GANADOR de cada mesa (último con dados) avanza; los
// clasificados se reagrupan en mesas nuevas hasta coronar a un campeón. La final
// puede ser mano a mano (mesa de 2). La dificultad sube por ronda.
//
// Este archivo es lógica pura (sin React ni transporte). El TransporteTorneo lo
// orquesta y la UI sólo lee la `VistaTorneo` que viaja en la Instantánea.
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  proyeccionPublica,
  vistaJugador,
  jugadorDeTurnoId,
  REGLAS_POR_DEFECTO,
  type Accion,
  type EstadoJuego,
  type ReglasCasa,
} from "../engine";
import { decidirBot, type JugadaBot, type Nivel } from "./bots";

/** Id fijo del jugador humano dentro de cada mesa del torneo. */
export const HUMANO_ID = "humano";

const NIVELES: Nivel[] = ["facil", "medio", "avanzado", "experto"];

/** Sube `pasos` escalones de dificultad desde `base`, sin pasar de experto. */
function escalarNivel(base: Nivel, pasos: number): Nivel {
  const i = Math.min(NIVELES.length - 1, NIVELES.indexOf(base) + Math.max(0, pasos));
  return NIVELES[i]!;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PresetTorneo {
  clave: string;
  nombre: string;
  /** Mesas en la primera ronda (todas de 4 jugadores). */
  mesas: number;
  /** Total de jugadores (mesas · 4). */
  jugadores: number;
  /** Frase corta para la tarjeta. */
  gancho: string;
}

// Todos cuadran en mesas de 4 y reducen limpio hasta una final (mano a mano
// cuando toca). El preset estrella es el del ejemplo del usuario: 8 mesas de 4.
export const PRESETS_TORNEO: PresetTorneo[] = [
  { clave: "duelo", nombre: "El Duelo", mesas: 2, jugadores: 8, gancho: "8 socios · 2 rondas" },
  { clave: "camada", nombre: "La Camada", mesas: 4, jugadores: 16, gancho: "16 socios · 2 rondas" },
  { clave: "asociacion", nombre: "La Asociación al completo", mesas: 8, jugadores: 32, gancho: "32 socios · 3 rondas" },
  { clave: "cofradia", nombre: "La Cofradía", mesas: 16, jugadores: 64, gancho: "64 socios · 3 rondas" },
];

export function presetPorClave(clave: string): PresetTorneo {
  return PRESETS_TORNEO.find((p) => p.clave === clave) ?? PRESETS_TORNEO[2]!;
}

// ---------------------------------------------------------------------------
// Estructuras
// ---------------------------------------------------------------------------

export interface ParticipanteTorneo {
  id: string;
  nombre: string;
  esHumano: boolean;
}

export interface MesaTorneo {
  participantes: ParticipanteTorneo[];
  ganadorId: string | null;
  esLaDelHumano: boolean;
}

/** Plan precalculado de una ronda del bracket. */
export interface PlanRonda {
  /** Cuántas mesas se juegan. */
  mesas: number;
  /** Jugadores que entran a la ronda. */
  jugadores: number;
  /** Nivel de los bots en esta ronda (sube si hay rampa). */
  nivel: Nivel;
  /** Etiqueta humana: "Octavos", "Semifinal", "Final"… */
  etiqueta: string;
}

/** Fase visible del torneo (presentación del cuadro, mesa en curso o transición). */
export type FaseTorneo = "presentacion" | "mesa" | "entre-rondas" | "campeon" | "eliminado";

// --- Mapa de duelos (el cuadro que se va llenando) -------------------------
export type EstadoParticipanteMapa = "gano" | "perdio" | "pendiente" | "incognito";

export interface MapaParticipante {
  id: string;
  nombre: string;
  esHumano: boolean;
  estado: EstadoParticipanteMapa;
}
export interface MapaMesa {
  participantes: MapaParticipante[];
  esLaDelHumano: boolean;
  resuelta: boolean;
  /** Nombre del ganador si la mesa ya se resolvió. */
  ganador: string | null;
}
export interface MapaRonda {
  etiqueta: string;
  nivel: Nivel;
  estado: "pasada" | "actual" | "futura";
  mesas: MapaMesa[];
}
export interface MapaTorneo {
  rondas: MapaRonda[];
  rondaActual: number;
}

/** Lo que la UI necesita para pintar el HUD y las pantallas del torneo. */
export interface VistaTorneo {
  faseTorneo: FaseTorneo;
  presetNombre: string;
  /** Ronda actual (1-based). */
  ronda: number;
  totalRondas: number;
  etiquetaRonda: string;
  mesasEnRonda: number;
  nivelRonda: Nivel;
  /** Socios todavía en carrera (al inicio de la ronda actual). */
  vivos: number;
  totalParticipantes: number;
  /** Rivales del humano en su mesa de esta ronda. */
  rivales: string[];
  /** Camino del humano por el bracket, para el mini-recorrido. */
  camino: { etiqueta: string; estado: "ganada" | "perdida" | "actual" | "pendiente" }[];
  /** En transición: ¿el humano ganó su última mesa? */
  humanoAvanzo: boolean;
  /** Nombre del campeón (en campeon/eliminado). */
  campeonNombre: string | null;
  /** Otros que avanzaron junto al humano (sabor para "entre-rondas"). */
  acompanantes: string[];
  /** El cuadro completo (se va llenando ronda a ronda). null durante la mesa. */
  mapa: MapaTorneo | null;
}

export interface EstadoTorneo {
  preset: PresetTorneo;
  nivelBase: Nivel;
  rampa: boolean;
  reglas: ReglasCasa;
  humanoNombre: string;
  plan: PlanRonda[];
  /** Índice 0-based de la ronda actual dentro de `plan`. */
  ronda: number;
  /** Mesas de la ronda actual (la del humano es `esLaDelHumano`). */
  mesas: MesaTorneo[];
  mesaHumanoIdx: number;
  /** Clasificados que entran a la ronda actual (en orden). */
  clasificados: ParticipanteTorneo[];
  /** Mesas ya resueltas de rondas pasadas, por índice de ronda (para el cuadro). */
  historialMesas: MesaTorneo[][];
  campeonId: string | null;
  /** Ronda (0-based) en que cayó el humano, o null si sigue/ganó. */
  rondaEliminado: number | null;
}

// ---------------------------------------------------------------------------
// Nombres temáticos para los rivales máquina (hasta 63)
// ---------------------------------------------------------------------------

const ICONICOS = ["El Tuerto", "La Sombra", "Doña Suerte", "El Croata", "Patas Negras"];
const ART_M = ["El", "Don", "El Viejo", "Ño"];
const ART_F = ["La", "Doña", "La Vieja"];
const APODO_M = [
  "Tuerto", "Ñato", "Zorro", "Lobo", "Cuervo", "Mudo", "Rengo", "Pelao", "Flaco",
  "Chino", "Turco", "Mono", "Tano", "Loco", "Brujo", "Diablo", "Santo", "Conde", "Galán",
  "Charqui", "Pillo", "Cacho", "Comodín", "Rey", "Cabro", "Roto", "Maestro", "Compadre",
  "Vampiro", "Gato", "Tiburón", "Manco", "Calvo", "Barbas",
];
const APODO_F = [
  "Sombra", "Bruja", "Loca", "Gata", "Reina", "Dama", "Fiera", "Viuda", "Pálida", "Roja",
  "Santa", "Zorra", "Maga", "Tuerta", "Muda", "Renga", "Flaca", "Condesa", "Galana", "Mala Cara",
];

function barajar<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Devuelve `n` nombres únicos y atmosféricos para los bots (con género coherente
 *  con el rostro: "La/Doña …" femeninos, "El/Don/Ño …" masculinos). */
export function generaNombres(n: number): string[] {
  const combos: string[] = [];
  for (const art of ART_M) for (const apo of APODO_M) combos.push(`${art} ${apo}`);
  for (const art of ART_F) for (const apo of APODO_F) combos.push(`${art} ${apo}`);
  const pool = [...ICONICOS, ...barajar(combos)];
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const nombre of pool) {
    if (vistos.has(nombre)) continue;
    vistos.add(nombre);
    out.push(nombre);
    if (out.length === n) break;
  }
  // Respaldo improbable: si pidieran más que el pool, numera.
  let k = 1;
  while (out.length < n) out.push(`Socio Nº ${k++}`);
  return out;
}

// ---------------------------------------------------------------------------
// Bracket
// ---------------------------------------------------------------------------

function etiquetaPorMesas(mesas: number, jugadores: number): string {
  if (mesas === 1) return jugadores === 2 ? "Final · mano a mano" : "Final";
  if (mesas === 2) return "Semifinal";
  if (mesas === 4) return "Cuartos de final";
  if (mesas === 8) return "Octavos de final";
  if (mesas === 16) return "Ronda inicial";
  return `Ronda de ${jugadores}`;
}

/**
 * Precalcula el bracket: cada ronda toma a los vivos y arma mesas (de 4, o menos
 * en la final). El ganador de cada mesa avanza, así que los vivos de la próxima
 * ronda = nº de mesas. Termina cuando queda 1 (campeón).
 */
export function planificarBracket(jugadores: number, nivelBase: Nivel, rampa: boolean): PlanRonda[] {
  const plan: PlanRonda[] = [];
  let vivos = jugadores;
  let r = 0;
  while (vivos > 1) {
    const mesas = vivos <= 4 ? 1 : Math.ceil(vivos / 4);
    plan.push({
      mesas,
      jugadores: vivos,
      nivel: rampa ? escalarNivel(nivelBase, r) : nivelBase,
      etiqueta: etiquetaPorMesas(mesas, vivos),
    });
    vivos = mesas;
    r++;
  }
  return plan;
}

/** Reparte `arr` en `grupos` partes lo más parejas posible (orden preservado). */
function repartirParejo<T>(arr: T[], grupos: number): T[][] {
  const out: T[][] = [];
  const base = Math.floor(arr.length / grupos);
  const resto = arr.length % grupos;
  let i = 0;
  for (let g = 0; g < grupos; g++) {
    const tam = base + (g < resto ? 1 : 0);
    out.push(arr.slice(i, i + tam));
    i += tam;
  }
  return out;
}

/**
 * Arma las mesas de una ronda a partir de los clasificados. El humano (si sigue
 * vivo) queda SIEMPRE en la mesa 0 para que sea la que juega en persona.
 */
export function armarMesas(clasificados: ParticipanteTorneo[], mesas: number): {
  mesas: MesaTorneo[];
  mesaHumanoIdx: number;
} {
  const humano = clasificados.find((p) => p.esHumano) ?? null;
  const resto = barajar(clasificados.filter((p) => !p.esHumano));
  const ordenados = humano ? [humano, ...resto] : resto;
  const grupos = repartirParejo(ordenados, mesas);
  let mesaHumanoIdx = 0;
  const tablas: MesaTorneo[] = grupos.map((participantes, idx) => {
    const esLaDelHumano = participantes.some((p) => p.esHumano);
    if (esLaDelHumano) mesaHumanoIdx = idx;
    return { participantes, ganadorId: null, esLaDelHumano };
  });
  return { mesas: tablas, mesaHumanoIdx };
}

// ---------------------------------------------------------------------------
// Simulación headless de una mesa (bots vs bots)
// ---------------------------------------------------------------------------

function accionDeBot(jugada: JugadaBot, jugadorId: string): Accion {
  switch (jugada.tipo) {
    case "APOSTAR":
      return { tipo: "APOSTAR", jugadorId, apuesta: jugada.apuesta };
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

/** Juega una mesa completa entre bots y devuelve el id del ganador. */
export function simularMesa(
  participantes: ParticipanteTorneo[],
  nivel: Nivel,
  reglas: ReglasCasa = REGLAS_POR_DEFECTO,
): string {
  let e: EstadoJuego = crearJuego(
    participantes.map((p) => ({ id: p.id, nombre: p.nombre })),
    reglas,
  );
  e = iniciarRonda(e);
  let guarda = 0;
  while (e.fase !== "FIN_JUEGO" && guarda++ < 8000) {
    if (e.fase === "FIN_RONDA") {
      e = iniciarRonda(e);
      continue;
    }
    const turno = jugadorDeTurnoId(e);
    if (turno === null) break;
    const vista = vistaJugador(e, turno);
    const jugada = decidirBot(vista.publico, vista.miMano, turno, nivel);
    try {
      e = aplicarAccion(e, accionDeBot(jugada, turno));
    } catch {
      try {
        e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: turno });
      } catch {
        break;
      }
    }
  }
  return proyeccionPublica(e).ganadorId ?? participantes[0]!.id;
}

// ---------------------------------------------------------------------------
// Creación y avance del torneo
// ---------------------------------------------------------------------------

export interface OpcionesTorneo {
  humanoNombre: string;
  preset: PresetTorneo;
  nivelBase: Nivel;
  rampa: boolean;
  reglas?: ReglasCasa;
}

export function crearTorneo(opts: OpcionesTorneo): EstadoTorneo {
  const reglas = opts.reglas ?? REGLAS_POR_DEFECTO;
  const nombres = generaNombres(opts.preset.jugadores - 1);
  const humano: ParticipanteTorneo = { id: HUMANO_ID, nombre: opts.humanoNombre, esHumano: true };
  const bots: ParticipanteTorneo[] = nombres.map((nombre, i) => ({
    id: `bot-${i}`,
    nombre,
    esHumano: false,
  }));
  const clasificados = [humano, ...bots];
  const plan = planificarBracket(opts.preset.jugadores, opts.nivelBase, opts.rampa);
  const { mesas, mesaHumanoIdx } = armarMesas(clasificados, plan[0]!.mesas);
  return {
    preset: opts.preset,
    nivelBase: opts.nivelBase,
    rampa: opts.rampa,
    reglas,
    humanoNombre: opts.humanoNombre,
    plan,
    ronda: 0,
    mesas,
    mesaHumanoIdx,
    clasificados,
    historialMesas: [],
    campeonId: null,
    rondaEliminado: null,
  };
}

/** Nivel de la ronda actual. */
export function nivelRondaActual(t: EstadoTorneo): Nivel {
  return t.plan[t.ronda]!.nivel;
}

/** Participantes de la mesa que juega el humano en la ronda actual. */
export function mesaDelHumano(t: EstadoTorneo): MesaTorneo {
  return t.mesas[t.mesaHumanoIdx]!;
}

export function esUltimaRonda(t: EstadoTorneo): boolean {
  return t.ronda >= t.plan.length - 1;
}

/** Nombre de un participante por id (en toda la lista de clasificados/mesas). */
function nombreDe(t: EstadoTorneo, id: string | null): string {
  if (!id) return "—";
  for (const m of t.mesas) {
    const p = m.participantes.find((x) => x.id === id);
    if (p) return p.nombre;
  }
  const c = t.clasificados.find((x) => x.id === id);
  return c?.nombre ?? "—";
}

/**
 * Resuelve la ronda actual sabiendo el ganador de la mesa del humano: simula las
 * OTRAS mesas y deja `mesas[*].ganadorId` listo. Devuelve los clasificados de la
 * próxima ronda (ganadores en orden de mesa) y si el humano avanzó.
 */
export function resolverRonda(
  t: EstadoTorneo,
  ganadorMesaHumano: string,
): { ganadores: ParticipanteTorneo[]; humanoAvanzo: boolean } {
  const nivel = nivelRondaActual(t);
  t.mesas.forEach((m, idx) => {
    if (idx === t.mesaHumanoIdx) m.ganadorId = ganadorMesaHumano;
    else if (!m.ganadorId) m.ganadorId = simularMesa(m.participantes, nivel, t.reglas);
  });
  const ganadores = t.mesas.map(
    (m) => m.participantes.find((p) => p.id === m.ganadorId)!,
  );
  const humanoAvanzo = ganadorMesaHumano === HUMANO_ID;
  return { ganadores, humanoAvanzo };
}

/** Avanza el estado a la siguiente ronda sembrando al humano en la mesa 0. */
export function prepararSiguienteRonda(t: EstadoTorneo, clasificados: ParticipanteTorneo[]): void {
  // La ronda que dejamos ya quedó resuelta: la guardamos para el cuadro.
  t.historialMesas[t.ronda] = t.mesas;
  t.ronda += 1;
  t.clasificados = clasificados;
  const { mesas, mesaHumanoIdx } = armarMesas(clasificados, t.plan[t.ronda]!.mesas);
  t.mesas = mesas;
  t.mesaHumanoIdx = mesaHumanoIdx;
}

/**
 * Corona al campeón cuando el humano YA quedó fuera: simula headless todas las
 * rondas restantes a partir de los clasificados dados.
 */
export function coronarSinHumano(t: EstadoTorneo, clasificados: ParticipanteTorneo[]): string {
  let vivos = clasificados;
  let r = t.ronda + 1;
  while (vivos.length > 1 && r < t.plan.length) {
    const { mesas } = armarMesas(vivos, t.plan[r]!.mesas);
    const nivel = t.plan[r]!.nivel;
    vivos = mesas.map((m) => {
      const gid = simularMesa(m.participantes, nivel, t.reglas);
      return m.participantes.find((p) => p.id === gid)!;
    });
    r++;
  }
  return vivos[0]?.id ?? clasificados[0]!.id;
}

function mapaMesaDe(m: MesaTorneo): MapaMesa {
  const resuelta = m.ganadorId !== null;
  const participantes: MapaParticipante[] = m.participantes.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    esHumano: p.esHumano,
    estado: !resuelta ? "pendiente" : p.id === m.ganadorId ? "gano" : "perdio",
  }));
  return {
    participantes,
    esLaDelHumano: m.esLaDelHumano,
    resuelta,
    ganador: resuelta ? m.participantes.find((p) => p.id === m.ganadorId)?.nombre ?? null : null,
  };
}

/** Arma el cuadro completo: rondas pasadas (con ganadores), la actual y las
 *  futuras como incógnitas. Se va "llenando" a medida que el humano avanza. */
export function construirMapa(t: EstadoTorneo): MapaTorneo {
  const rondas: MapaRonda[] = t.plan.map((p, i) => {
    if (i < t.ronda) {
      return { etiqueta: p.etiqueta, nivel: p.nivel, estado: "pasada", mesas: (t.historialMesas[i] ?? t.mesas).map(mapaMesaDe) };
    }
    if (i === t.ronda) {
      return { etiqueta: p.etiqueta, nivel: p.nivel, estado: "actual", mesas: t.mesas.map(mapaMesaDe) };
    }
    const porMesa = Math.ceil(p.jugadores / p.mesas);
    const mesas: MapaMesa[] = Array.from({ length: p.mesas }, () => ({
      participantes: Array.from({ length: porMesa }, (_, k) => ({
        id: `incog-${i}-${k}`,
        nombre: "?",
        esHumano: false,
        estado: "incognito" as const,
      })),
      esLaDelHumano: false,
      resuelta: false,
      ganador: null,
    }));
    return { etiqueta: p.etiqueta, nivel: p.nivel, estado: "futura" as const, mesas };
  });
  return { rondas, rondaActual: t.ronda };
}

/** Construye la VistaTorneo (lo que lee la UI) para una fase dada. */
export function vistaTorneo(t: EstadoTorneo, fase: FaseTorneo, ganadores?: ParticipanteTorneo[]): VistaTorneo {
  const plan = t.plan;
  const ronda = t.ronda;
  const etiquetaActual = plan[ronda]!.etiqueta;
  const mesaH = mesaDelHumano(t);

  const camino = plan.map((p, i) => {
    let estado: "ganada" | "perdida" | "actual" | "pendiente";
    if (t.rondaEliminado !== null && i === t.rondaEliminado) estado = "perdida";
    else if (i < ronda) estado = "ganada";
    else if (i === ronda && fase !== "campeon") estado = t.rondaEliminado !== null ? "perdida" : "actual";
    else if (i === ronda && fase === "campeon") estado = "ganada";
    else estado = "pendiente";
    return { etiqueta: p.etiqueta, estado };
  });

  const acompanantes =
    fase === "entre-rondas" && ganadores
      ? ganadores.filter((g) => !g.esHumano).slice(0, 6).map((g) => g.nombre)
      : [];

  return {
    faseTorneo: fase,
    presetNombre: t.preset.nombre,
    ronda: ronda + 1,
    totalRondas: plan.length,
    etiquetaRonda: etiquetaActual,
    mesasEnRonda: plan[ronda]!.mesas,
    nivelRonda: plan[ronda]!.nivel,
    vivos: plan[ronda]!.jugadores,
    totalParticipantes: t.preset.jugadores,
    rivales: mesaH.participantes.filter((p) => !p.esHumano).map((p) => p.nombre),
    camino,
    humanoAvanzo: fase === "campeon" || (fase === "entre-rondas"),
    campeonNombre: t.campeonId ? nombreDe(t, t.campeonId) : null,
    acompanantes,
    mapa: fase === "mesa" ? null : construirMapa(t),
  };
}
