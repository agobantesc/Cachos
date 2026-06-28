// MODO HISTORIA — una campaña por el bajo mundo del cacho chileno.
//
// El jugador, con su perfil, parte en pocilgas contra novatos y se va internando
// en las profundidades: tabernas, mercados negros, clubes clandestinos… hasta la
// cumbre. Los rivales escalan de dificultad; los BOSSES tienen ventajas (cachos
// de más, IA experta). Entre partidas el jugador gana PLATA y sube ATRIBUTOS que
// lo hacen más fuerte (aguante, ojo, suerte). Ambiente oscuro, mafioso-tabernero.
//
// Es lógica pura + datos: el TransporteHistoria la orquesta sobre el motor.
import type { Nivel } from "./bots";

export const HUMANO_ID = "humano";

// ---------------------------------------------------------------------------
// Rivales y escenarios
// ---------------------------------------------------------------------------

export interface DialogosRival {
  /** Lo que dice al sentarse a la mesa. */
  entrada: string;
  /** Lo que dice cuando el jugador le GANA. */
  derrota: string;
  /** Lo que dice cuando el jugador PIERDE. */
  victoria: string;
}

export interface RivalHistoria {
  id: string;
  nombre: string;
  nivel: Nivel;
  /** Cachos de ventaja con los que parte (los bosses traen 1–2). */
  dadosExtra: number;
  esBoss: boolean;
  /** Nombre de la habilidad del boss (sabor + describe su ventaja). */
  habilidad?: string;
  /** Plata que suelta al ser derrotado. */
  plata: number;
  dialogos: DialogosRival;
}

export interface Escenario {
  clave: string;
  nombre: string;
  lugar: string;
  ambiente: string;
  rivales: RivalHistoria[]; // termina en el boss del escenario
}

const d = (entrada: string, derrota: string, victoria: string): DialogosRival => ({ entrada, derrota, victoria });

export const CAMPANA: Escenario[] = [
  {
    clave: "pocilga",
    nombre: "La Pocilga",
    lugar: "Muelle de Valparaíso",
    ambiente: "Olor a pescado podrido y vino caliente. Aquí parten todos los que sueñan con el cacho… y aquí se quedan casi todos.",
    rivales: [
      { id: "r-pulga", nombre: "El Pulguita", nivel: "facil", dadosExtra: 0, esBoss: false, plata: 18,
        dialogos: d("¿Y este cabro nuevo? A ver si aguanta una mano.", "…la cresta. Tuviste suerte, mocoso.", "Jajaja, ándate pa' la casa con tu mamá.") },
      { id: "r-roto", nombre: "Roto Manríquez", nivel: "facil", dadosExtra: 0, esBoss: false, plata: 22,
        dialogos: d("Sírvanle un trago al difunto, va a perder igual.", "No puede ser… me ganó un pendejo.", "Otra cañita pa' celebrar tu paliza.") },
      { id: "b-berta", nombre: "Doña Berta", nivel: "medio", dadosExtra: 1, esBoss: true, plata: 70,
        habilidad: "La Patrona — la casa siempre juega con un cacho de más.",
        dialogos: d("Soy la dueña de esta pocilga, mijito. Aquí nadie me gana en mi mesa.", "Treinta años invicta… y me la ganó este forastero. Anda, sigue subiendo.", "La casa siempre gana, cabrito. Vuelve cuando seas grande.") },
    ],
  },
  {
    clave: "vega",
    nombre: "La Vega Chica",
    lugar: "Mercado de noche, Santiago",
    ambiente: "Cajones de fruta, sangre de matadero y plata sucia cambiando de mano bajo los faroles. Aquí el que duda mal, amanece flotando en el Mapocho.",
    rivales: [
      { id: "r-charqui", nombre: "El Charqui", nivel: "medio", dadosExtra: 0, esBoss: false, plata: 28,
        dialogos: d("Vienes de los muelles, ¿no? Aquí se juega en serio.", "Mierda. Tienes algo, lo reconozco.", "Vuelve a tu caleta, esto te queda grande.") },
      { id: "r-quintrala", nombre: "La Quintrala", nivel: "medio", dadosExtra: 0, esBoss: false, plata: 32,
        dialogos: d("Lindo cachito… sería una pena que perdieras.", "Maldito seas. Nadie me lee la mano así.", "Te lo dije, lindo. Esto era mío.") },
      { id: "b-carnicero", nombre: "El Carnicero", nivel: "avanzado", dadosExtra: 1, esBoss: true, plata: 120,
        habilidad: "Mano firme — no le tiembla el pulso y corta con un cacho extra.",
        dialogos: d("Yo despresa vacas y ambiciosos por igual. Siéntate.", "…hace veinte años que no perdía. Sube nomás, te van a comer más arriba.", "Otro pa'l gancho. Límpienle la sangre a la mesa.") },
    ],
  },
  {
    clave: "trastienda",
    nombre: "La Trastienda",
    lugar: "Tras una botillería en San Diego",
    ambiente: "Humo de cigarro barato, deudas que se pagan con sangre y un foco amarillo colgando sobre el paño verde. Aquí ya nadie juega por plata: juegan por respeto.",
    rivales: [
      { id: "r-notario", nombre: "El Notario", nivel: "avanzado", dadosExtra: 0, esBoss: false, plata: 45,
        dialogos: d("Todo queda registrado, joven. Hasta su derrota.", "Objeto… objeto, pero perdí. Anótelo.", "Caso cerrado. El siguiente.") },
      { id: "r-pituto", nombre: "Pituto", nivel: "avanzado", dadosExtra: 0, esBoss: false, plata: 48,
        dialogos: d("Yo conozco a todos los que mandan. Y a ti no te conozco… todavía.", "Ya, ya… te tengo en el radar ahora.", "Nadie va a recordar tu nombre, cabro.") },
      { id: "b-croata", nombre: "El Croata", nivel: "experto", dadosExtra: 1, esBoss: true, plata: 170,
        habilidad: "Témpano — frío, te lee los faroles antes de que mientas.",
        dialogos: d("Dicen que tienes ojo. Yo tengo paciencia. Veamos cuál pesa más.", "Frío como soy, esto me hierve la sangre. Buen juego, forastero.", "Tu cara te delató tres manos atrás. Aprende a mentir.") },
    ],
  },
  {
    clave: "club",
    nombre: "El Subterráneo",
    lugar: "Club clandestino bajo el río",
    ambiente: "Terciopelo gastado, armas bajo la mesa y nadie pregunta nombres. Para entrar pagaste con favores; para salir, hay que ganar.",
    rivales: [
      { id: "r-madame", nombre: "Madame Ruiz", nivel: "experto", dadosExtra: 0, esBoss: false, plata: 65,
        dialogos: d("Bienvenido a lo profundo, querido. Pocos llegan tan abajo.", "Tienes hambre de verdad. Me agrada… y me asusta.", "Lo profundo se traga a los ambiciosos, mi amor.") },
      { id: "r-turco", nombre: "El Turco Fino", nivel: "experto", dadosExtra: 0, esBoss: false, plata: 70,
        dialogos: d("Traje y cachos: las dos cosas que nunca me quito.", "Me arrugaste el traje, desgraciado. Bien jugado.", "Elegancia, cabro. Eso es lo que te falta.") },
      { id: "b-senador", nombre: "El Senador", nivel: "experto", dadosExtra: 2, esBoss: true, plata: 250,
        habilidad: "Tiene comprado todo — hasta los dados. Juega con dos cachos de ventaja.",
        dialogos: d("Yo hago las leyes de esta mesa, muchacho. Y la primera es que yo gano.", "Esto… esto no se compra. Maldito talento. Te van a estar esperando arriba.", "El poder no se reparte, se quita. Y a ti te lo acabo de quitar.") },
    ],
  },
  {
    clave: "cumbre",
    nombre: "La Cumbre",
    lugar: "Penthouse, lo más alto de Santiago",
    ambiente: "Desde este ventanal se ve todo Chile encendido. Llegaste desde el último muelle hasta el cielo. Sólo queda un nombre por borrar del mapa.",
    rivales: [
      { id: "r-heredero", nombre: "El Heredero", nivel: "experto", dadosExtra: 1, esBoss: false, plata: 90,
        dialogos: d("Mi padre era el segundo mejor de Chile. Yo voy a ser el primero.", "No… ese trono era mío por sangre.", "La sangre manda, advenedizo.") },
      { id: "b-rey", nombre: "El Rey del Cacho", nivel: "experto", dadosExtra: 2, esBoss: true, plata: 1000,
        habilidad: "Invicto en treinta años. Dos cachos de ventaja y ojo de halcón.",
        dialogos: d("Subiste desde el barro hasta mi mesa. Eso ya es leyenda. Pero la leyenda termina aquí.", "Treinta años… y un don nadie del puerto me destrona. El cacho es tuyo. Chile es tuyo.", "Yo SOY el cacho, muchacho. Vuelve al barro de donde saliste.") },
    ],
  },
];

// ---------------------------------------------------------------------------
// Atributos del jugador (lo que sube con plata)
// ---------------------------------------------------------------------------

export interface AtributosJugador {
  /** +dados iniciales (0–2). Para aguantar a los peces gordos. */
  aguante: number;
  /** Pista de probabilidad en tu turno (0–2). El "ojo del tahúr". */
  ojo: number;
  /** Re-tiradas de tu mano por partida (0–3). La suerte del jugador. */
  suerte: number;
}

export type ClaveAtributo = keyof AtributosJugador;

export const ATRIBUTOS: {
  clave: ClaveAtributo;
  nombre: string;
  desc: string;
  max: number;
  costos: number[]; // costo para subir al nivel i+1
}[] = [
  { clave: "aguante", nombre: "Aguante", desc: "Partes con un cacho más en cada partida.", max: 2, costos: [80, 170] },
  { clave: "ojo", nombre: "Ojo del tahúr", desc: "En tu turno ves cuántos dados se esperan de la pinta.", max: 2, costos: [60, 140] },
  { clave: "suerte", nombre: "Suerte", desc: "Puedes re-tirar TU mano una vez por partida (por nivel).", max: 3, costos: [50, 110, 190] },
];

export function costoMejora(clave: ClaveAtributo, nivelActual: number): number {
  const a = ATRIBUTOS.find((x) => x.clave === clave)!;
  return a.costos[nivelActual] ?? Infinity;
}

// ---------------------------------------------------------------------------
// Estado de la campaña (persistible)
// ---------------------------------------------------------------------------

export interface EstadoHistoria {
  nombre: string;
  atributos: AtributosJugador;
  plata: number;
  /** Índice del escenario actual. */
  escenarioIdx: number;
  /** Índice del rival dentro del escenario. */
  rivalIdx: number;
  completado: boolean;
}

export function historiaNueva(nombre: string): EstadoHistoria {
  return {
    nombre: nombre.trim() || "Forastero",
    atributos: { aguante: 0, ojo: 0, suerte: 0 },
    plata: 0,
    escenarioIdx: 0,
    rivalIdx: 0,
    completado: false,
  };
}

export function escenarioActual(h: EstadoHistoria): Escenario {
  return CAMPANA[Math.min(h.escenarioIdx, CAMPANA.length - 1)]!;
}

export function rivalActual(h: EstadoHistoria): RivalHistoria {
  const esc = escenarioActual(h);
  return esc.rivales[Math.min(h.rivalIdx, esc.rivales.length - 1)]!;
}

/** ¿El rival actual es el último del último escenario (jefe final)? */
export function esRivalFinal(h: EstadoHistoria): boolean {
  return h.escenarioIdx === CAMPANA.length - 1 && h.rivalIdx === escenarioActual(h).rivales.length - 1;
}

/** Avanza al siguiente rival/escenario tras ganar. Devuelve si toca TIENDA
 *  (se completó un escenario) o si se terminó la campaña. */
export function avanzar(h: EstadoHistoria): { tienda: boolean; final: boolean } {
  const esc = escenarioActual(h);
  if (h.rivalIdx < esc.rivales.length - 1) {
    h.rivalIdx += 1;
    return { tienda: false, final: false };
  }
  // Cayó el boss del escenario.
  if (h.escenarioIdx < CAMPANA.length - 1) {
    h.escenarioIdx += 1;
    h.rivalIdx = 0;
    return { tienda: true, final: false };
  }
  h.completado = true;
  return { tienda: false, final: true };
}

export function dadosInicialesHumano(h: EstadoHistoria): number {
  return 5 + h.atributos.aguante;
}

// ---------------------------------------------------------------------------
// Vista para la UI
// ---------------------------------------------------------------------------

export type FaseHistoria = "intro" | "mesa" | "victoria" | "derrota" | "tienda" | "final";

export interface MejoraVista {
  clave: ClaveAtributo;
  nombre: string;
  desc: string;
  nivel: number;
  max: number;
  costo: number;
  alcanzable: boolean;
}

export interface VistaHistoria {
  faseHistoria: FaseHistoria;
  nombreJugador: string;
  plata: number;
  atributos: AtributosJugador;
  escenario: { nombre: string; lugar: string; ambiente: string; idx: number; total: number };
  rival: {
    id: string;
    nombre: string;
    nivel: Nivel;
    esBoss: boolean;
    habilidad: string | null;
    dadosExtra: number;
    /** Plata que da al ser derrotado (para mostrar el premio). */
    plata: number;
    /** Diálogo contextual a la fase (entrada / derrota / victoria). */
    dialogo: string;
  };
  progresoRival: { idx: number; total: number };
  /** Re-tiradas de mano disponibles esta partida (poder Suerte). */
  suerteDisponible: number;
  ojo: number;
  /** Mejoras comprables (sólo en fase "tienda"). */
  mejoras: MejoraVista[];
}
