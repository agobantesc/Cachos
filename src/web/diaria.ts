// LA MESA DEL DÍA: un desafío diario, igual para todos. La fecha es la
// semilla: de ella salen los rivales (duros), el capo tramposo y dos reglas
// de la casa que rotan. Gana el que la corona… y manda el CRONÓMETRO: menos
// tiempo, mejor puesto en el ranking del día. (El ranking rival, por ahora,
// lo pone la casa: una plantilla de tahúres inventados, distinta cada día.)
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { crearReglas, type ReglasCasa } from "../engine";
import type { Nivel } from "./bots";

const CLAVE = "cachos.diaria";
const HUMANO = "humano";

// --- Semilla del día ---------------------------------------------------------

/** La clave del día: AAAA-MM-DD en hora local (todos juegan "su" día). */
export function claveHoy(ahora = new Date()): string {
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${ahora.getFullYear()}-${m}-${d}`;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** PRNG determinista (mulberry32): misma fecha, misma mesa para todos. */
function prng(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- La mesa del día ----------------------------------------------------------

/** Reglas de la casa que rotan (dos por día, distintas entre sí). */
const MODIFICADORES: { clave: string; nombre: string; desc: string; reglas: Partial<ReglasCasa> }[] = [
  { clave: "puro-fierro", nombre: "Puro fierro", desc: "El as NO es comodín: cada pinta vale lo que es.", reglas: { asComodin: false } },
  { clave: "calzo-seco", nombre: "Calzo seco", desc: "Calzar no devuelve dados: lo jugado, jugado está.", reglas: { calzarRecuperaDado: false } },
  { clave: "polvora", nombre: "Pólvora", desc: "La siciliana vuela 3 dados de una.", reglas: { sicilianaDadosPerdidos: 3 } },
  { clave: "sin-velorio", nombre: "Sin velorio", desc: "No hay ronda de obligado: al moribundo, ni honores.", reglas: { obligadoActivo: false } },
  { clave: "ley-seca", nombre: "Ley seca", desc: "Prohibido calzar: o apuestas, o dudas.", reglas: { calzarPermitido: false } },
];

/** Tahúres de la casa (nombres del día; no confundir con los de la campaña). */
const TAHURES = [
  "El Tuerto", "La Sombra", "Patas Negras", "El Chacal", "La Gata", "Don Osvaldo",
  "El Flaco Silva", "La Turca", "Cara de Póker", "El Mudo", "Señora Rosa", "Huesos",
  "El Canario", "Doña Suerte", "El Piojo", "Manos de Seda",
];

export interface ConfigDiaria {
  clave: string;
  /** Rivales del día (el primero es el CAPO: el más duro, y tramposo). */
  rivales: { id: string; nombre: string; nivel: Nivel }[];
  /** Las dos reglas de la casa que rigen hoy. */
  modificadores: { clave: string; nombre: string; desc: string }[];
  reglas: ReglasCasa;
  /** El capo del día recarga su mano cada ronda con esta intensidad. */
  trampaIntentos: number;
}

/** Arma la mesa del día a partir de la fecha. Determinista: misma clave, misma mesa. */
export function mesaDelDia(clave = claveHoy()): ConfigDiaria {
  const r = prng(hash("mesa-del-dia:" + clave));
  // Tres rivales duros: el capo (brutal, tramposo) y dos matones.
  const nombres = [...TAHURES];
  const sacar = () => nombres.splice(Math.floor(r() * nombres.length), 1)[0]!;
  const niveles: Nivel[] = ["brutal", "experto", r() < 0.5 ? "experto" : "avanzado"];
  const rivales = niveles.map((nivel, i) => ({ id: `dia-${i}`, nombre: sacar(), nivel }));
  // Dos reglas de la casa, distintas, barajadas por la fecha.
  const pool = [...MODIFICADORES];
  const m1 = pool.splice(Math.floor(r() * pool.length), 1)[0]!;
  const m2 = pool.splice(Math.floor(r() * pool.length), 1)[0]!;
  const reglas = crearReglas({ ...m1.reglas, ...m2.reglas });
  return {
    clave,
    rivales,
    modificadores: [m1, m2].map(({ clave: c, nombre, desc }) => ({ clave: c, nombre, desc })),
    reglas,
    trampaIntentos: 5 + Math.floor(r() * 3), // 5–7: trampa pesada, pero jugable
  };
}

// --- Registro del jugador (persistente) ---------------------------------------

export interface RegistroDiaria {
  /** Clave del último día jugado y su mejor tiempo (ms); null si no ganó aún. */
  clave: string | null;
  mejorMs: number | null;
  intentos: number;
  /** Mesas del Día ganadas en total (histórico, para el Ropero). */
  ganadas: number;
}

export function leerDiaria(): RegistroDiaria {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<RegistroDiaria>;
    return {
      clave: typeof d.clave === "string" ? d.clave : null,
      mejorMs: typeof d.mejorMs === "number" ? d.mejorMs : null,
      intentos: d.intentos ?? 0,
      ganadas: d.ganadas ?? 0,
    };
  } catch {
    return { clave: null, mejorMs: null, intentos: 0, ganadas: 0 };
  }
}

function guardar(d: RegistroDiaria): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(d));
  } catch {
    /* sin persistencia */
  }
}

/** El registro DE HOY (si el guardado es de otro día, parte limpio). */
export function diariaDeHoy(clave = claveHoy()): RegistroDiaria {
  const d = leerDiaria();
  return d.clave === clave ? d : { clave, mejorMs: null, intentos: 0, ganadas: d.ganadas };
}

export function registrarIntentoDiaria(clave = claveHoy()): void {
  const d = diariaDeHoy(clave);
  d.intentos += 1;
  guardar(d);
}

/** Registra una victoria del día: guarda el MEJOR tiempo y suma al histórico. */
export function registrarVictoriaDiaria(ms: number, clave = claveHoy()): void {
  const d = diariaDeHoy(clave);
  if (d.mejorMs === null || ms < d.mejorMs) d.mejorMs = ms;
  d.ganadas += 1;
  guardar(d);
}

// --- El ranking del día --------------------------------------------------------

export interface PuestoRanking {
  nombre: string;
  ms: number;
  esJugador: boolean;
}

export function formatoTiempo(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** El ranking del día: la plantilla de la casa (tahúres inventados, distinta
 *  cada día) + tu mejor tiempo si ya ganaste. Menor tiempo, mejor puesto. */
export function rankingDelDia(clave = claveHoy()): PuestoRanking[] {
  const r = prng(hash("ranking:" + clave));
  const nombres = [...TAHURES];
  // Los rivales de la mesa no compiten en el ranking (están ocupados repartiendo).
  const enMesa = new Set(mesaDelDia(clave).rivales.map((x) => x.nombre));
  const candidatos = nombres.filter((n) => !enMesa.has(n));
  const puestos: PuestoRanking[] = [];
  const n = 9;
  for (let i = 0; i < n && candidatos.length > 0; i++) {
    const nombre = candidatos.splice(Math.floor(r() * candidatos.length), 1)[0]!;
    // Tiempos de la casa: entre ~2:20 y ~11:00, cargados hacia el medio.
    const ms = Math.round((140 + r() * 220 + r() * 300) * 1000);
    puestos.push({ nombre, ms, esJugador: false });
  }
  const mio = diariaDeHoy(clave);
  if (mio.mejorMs !== null) puestos.push({ nombre: "Tú", ms: mio.mejorMs, esJugador: true });
  return puestos.sort((a, b) => a.ms - b.ms);
}

// --- El transporte del día: una mesa normal + el cronómetro --------------------

/** Envuelve TransporteLocal: cuenta el intento, aplica la trampa del capo por
 *  ronda y CRONOMETRA de la primera ronda al FIN_JUEGO. Si ganas, registra tu
 *  tiempo del día (el mejor queda en el ranking). */
export class TransporteDiario implements Transporte {
  private inner: TransporteLocal;
  private unsub: () => void;
  private cfg: ConfigDiaria;
  /** Cuándo empezó a correr el reloj (primera ronda en curso). */
  t0: number | null = null;
  private terminado = false;

  constructor(nombreJugador: string, cfg: ConfigDiaria = mesaDelDia()) {
    this.cfg = cfg;
    registrarIntentoDiaria(cfg.clave);
    const jugadores = [
      { id: HUMANO, nombre: nombreJugador },
      ...cfg.rivales.map((x) => ({ id: x.id, nombre: x.nombre })),
    ];
    const nivelPorJugador = Object.fromEntries(cfg.rivales.map((x) => [x.id, x.nivel]));
    this.inner = new TransporteLocal(jugadores, { humanoId: HUMANO, nivelPorJugador, reglas: cfg.reglas });
    this.unsub = this.inner.suscribir(() => this.alCambiar());
    this.aplicarTrampa();
  }

  /** El capo del día juega cargado (como los jefes tramposos de la campaña). */
  private aplicarTrampa() {
    this.inner.cargarMano(this.cfg.rivales[0]!.id, this.cfg.trampaIntentos);
  }

  private alCambiar() {
    const pub = this.inner.instantanea().publico;
    if (!pub) return;
    if (this.t0 === null && pub.fase !== "FIN_JUEGO") this.t0 = Date.now();
    if (!this.terminado && pub.fase === "FIN_JUEGO") {
      this.terminado = true;
      if (pub.ganadorId === HUMANO && this.t0 !== null) {
        registrarVictoriaDiaria(Date.now() - this.t0, this.cfg.clave);
      }
    }
  }

  // --- delegación al transporte real ---
  suscribir(cb: () => void): () => void {
    return this.inner.suscribir(cb);
  }
  instantanea(): Instantanea {
    return this.inner.instantanea();
  }
  async iniciar() {
    await this.inner.iniciar();
  }
  async apostar(a: Parameters<Transporte["apostar"]>[0]) {
    await this.inner.apostar(a);
  }
  async dudar() {
    await this.inner.dudar();
  }
  async calzar() {
    await this.inner.calzar();
  }
  async pasar() {
    await this.inner.pasar();
  }
  async dudarPaso() {
    await this.inner.dudarPaso();
  }
  async siguienteRonda(s?: Parameters<Transporte["siguienteRonda"]>[0]) {
    await this.inner.siguienteRonda(s);
    this.aplicarTrampa();
  }
  async terminarSolo() {
    await this.inner.terminarSolo();
  }
  detener() {
    this.unsub();
    this.inner.detener();
  }
}
