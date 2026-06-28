// MODO HISTORIA — una campaña por el bajo mundo del cacho chileno.
//
// El jugador, con su perfil, parte en pocilgas contra novatos y se va internando
// en las profundidades: tabernas, mercados negros, clubes clandestinos… hasta la
// cumbre. Hay MESAS de todo tamaño (1v1, chicas, grandes hasta 6). Los rivales
// escalan; los BOSSES tienen HABILIDADES (reglas de la casa a su favor, trampas,
// IA implacable) — sin "cachos de ventaja". Entre escenarios el jugador gana
// PLATA y sube ATRIBUTOS (ojo, colmillo, suerte). Ambiente oscuro, mafioso.
import type { Nivel } from "./bots";
import { crearReglas, type ReglasCasa } from "../engine";

export const HUMANO_ID = "humano";

const NIVELES: Nivel[] = ["facil", "medio", "avanzado", "experto"];
/** Un escalón más blando (para el relleno de las mesas grandes). */
function nivelMenos(n: Nivel): Nivel {
  return NIVELES[Math.max(0, NIVELES.indexOf(n) - 1)]!;
}

// ---------------------------------------------------------------------------
// Habilidades de los bosses (vía reglas / trampa — nunca cachos de más)
// ---------------------------------------------------------------------------

export interface HabilidadBoss {
  nombre: string;
  desc: string;
  /** Reglas de la casa que rigen SU mesa. */
  reglas?: Partial<ReglasCasa>;
  /** Hace trampa: re-carga su mano cada ronda buscando concentración. */
  dadoCargado?: boolean;
}

const SIN_CLEMENCIA: HabilidadBoss = {
  nombre: "Sin clemencia",
  desc: "En su mesa no se puede calzar: o apuestas, o te callas.",
  reglas: { calzarPermitido: false },
};
const SANGRE_FACIL: HabilidadBoss = {
  nombre: "Sangre fácil",
  desc: "Dudar su primera apuesta y perder te cuesta 3 cachos de una.",
  reglas: { sicilianaDadosPerdidos: 3 },
};
const TEMPANO: HabilidadBoss = {
  nombre: "Témpano",
  desc: "Frío como el hielo: te lee los faroles antes de que termines de mentir.",
};
const DADO_CARGADO: HabilidadBoss = {
  nombre: "Dado cargado",
  desc: "Hace trampa: tiene comprado hasta los dados, y siempre le favorecen.",
  dadoCargado: true,
};
const OJO_HALCON: HabilidadBoss = {
  nombre: "Ojo de halcón",
  desc: "El mejor de Chile en treinta años: juego perfecto y, por si fuera poco, dados cargados.",
  dadoCargado: true,
};

// ---------------------------------------------------------------------------
// Rivales y escenarios
// ---------------------------------------------------------------------------

export interface DialogosRival {
  entrada: string;
  derrota: string; // cuando el jugador le gana
  victoria: string; // cuando el jugador pierde
}

export interface RivalHistoria {
  id: string;
  nombre: string;
  nivel: Nivel;
  /** Total de jugadores en la mesa de este encuentro (2 = mano a mano). */
  mesa: number;
  esBoss: boolean;
  habilidad?: HabilidadBoss;
  plata: number;
  dialogos: DialogosRival;
}

export interface Escenario {
  clave: string;
  nombre: string;
  lugar: string;
  ambiente: string;
  /** Narración al entrar al escenario (antes del primer rival). */
  intro: string;
  /** Narración al caer el boss del escenario (antes de la tienda). */
  epilogo: string;
  rivales: RivalHistoria[]; // termina en el boss
}

const d = (entrada: string, derrota: string, victoria: string): DialogosRival => ({ entrada, derrota, victoria });

export const PROLOGO =
  "Naciste en el barro. Aprendiste a leer mentiras antes que a leer letras, y a agitar un cacho antes que a ganarte el pan. Dicen que el cacho tiene un rey escondido en lo más alto de Santiago, invicto hace treinta años. Tú vas a bajarlo de su trono. Pero para llegar arriba, primero hay que hundirse hasta el fondo.";

export const CAMPANA: Escenario[] = [
  {
    clave: "pocilga",
    nombre: "La Pocilga",
    lugar: "Muelle de Valparaíso",
    ambiente: "Olor a pescado podrido y vino caliente.",
    intro: "Aquí parten todos los que sueñan con el cacho… y aquí se quedan casi todos. La mesa está pegajosa de vino y los parroquianos huelen la sangre nueva. Siéntate y demuestra que no eres uno más.",
    epilogo: "La pocilga entera te mira distinto ahora. Doña Berta te sirve un trago de la casa, en silencio. Diste el primer paso fuera del barro.",
    rivales: [
      { id: "r-pulga", nombre: "El Pulguita", nivel: "facil", mesa: 4, esBoss: false, plata: 20,
        dialogos: d("¿Y este cabro nuevo? A la mesa, a ver si aguanta.", "…la cresta. Tuviste suerte, mocoso.", "Jajaja, ándate pa' la casa con tu mamá.") },
      { id: "r-roto", nombre: "Roto Manríquez", nivel: "facil", mesa: 2, esBoss: false, plata: 26,
        dialogos: d("Tú y yo, mano a mano. Sin testigos.", "No puede ser… me ganó un pendejo.", "Otra cañita pa' celebrar tu paliza.") },
      { id: "r-cabrera", nombre: "La Cabrera", nivel: "medio", mesa: 3, esBoss: false, plata: 34,
        dialogos: d("Tres en la mesa y dos van a llorar. Adivina cuáles.", "Mierda, el cabro tiene ojo. Anótenlo.", "Vuelve cuando sepas mentir, niño.") },
      { id: "b-berta", nombre: "Doña Berta", nivel: "medio", mesa: 3, esBoss: true, plata: 90, habilidad: SIN_CLEMENCIA,
        dialogos: d("Soy la dueña de esta pocilga, mijito. Treinta años y nadie me gana en mi mesa.", "Treinta años invicta… y me la ganó este forastero. Anda, sigue subiendo.", "La casa siempre gana, cabrito. Vuelve cuando seas grande.") },
    ],
  },
  {
    clave: "vega",
    nombre: "La Vega Chica",
    lugar: "Mercado de noche, Santiago",
    ambiente: "Cajones de fruta, sangre de matadero y plata sucia.",
    intro: "Subiste del puerto a la capital. En La Vega, de noche, la fruta tapa cosas peores y el que duda mal amanece flotando en el Mapocho. Aquí ya se juega por plata de verdad.",
    epilogo: "El Carnicero te da la mano con la suya manchada. 'Hay sangre nueva en Santiago', dice, y por primera vez no suena a amenaza. Suena a respeto.",
    rivales: [
      { id: "r-charqui", nombre: "El Charqui", nivel: "medio", mesa: 5, esBoss: false, plata: 32,
        dialogos: d("Cinco en la mesa, cabro. Esto no es el puerto.", "Mierda. Tienes algo, lo reconozco.", "Vuelve a tu caleta, esto te queda grande.") },
      { id: "r-quintrala", nombre: "La Quintrala", nivel: "medio", mesa: 2, esBoss: false, plata: 38,
        dialogos: d("Lindo cachito… sería una pena que lo perdieras conmigo.", "Maldito seas. Nadie me lee la mano así.", "Te lo dije, lindo. Esto era mío.") },
      { id: "r-sapo", nombre: "Sapo Reyes", nivel: "avanzado", mesa: 4, esBoss: false, plata: 48,
        dialogos: d("Yo le cuento todo al jefe. Y de ti… todavía no tengo nada bueno.", "Ya, ya. Le voy a decir que tenga cuidado contigo.", "El sapo siempre canta primero, cabro.") },
      { id: "b-carnicero", nombre: "El Carnicero", nivel: "avanzado", mesa: 4, esBoss: true, plata: 150, habilidad: SANGRE_FACIL,
        dialogos: d("Yo despresa vacas y ambiciosos por igual. En mi mesa, dudar al que abre se paga caro.", "…veinte años que no perdía. Sube nomás, te van a comer más arriba.", "Otro pa'l gancho. Límpienle la sangre a la mesa.") },
    ],
  },
  {
    clave: "trastienda",
    nombre: "La Trastienda",
    lugar: "Tras una botillería en San Diego",
    ambiente: "Humo de cigarro barato y deudas que se pagan con sangre.",
    intro: "Te ganaste una silla en la trastienda. Un foco amarillo cuelga sobre el paño verde y aquí ya nadie juega por plata: se juega por respeto, y a veces por la vida.",
    epilogo: "El Croata apaga su cigarro sin apuro. 'Pocos me hacen sudar', dice. Te abre la puerta a lo más profundo. Del otro lado, todo es más oscuro.",
    rivales: [
      { id: "r-notario", nombre: "El Notario", nivel: "avanzado", mesa: 3, esBoss: false, plata: 50,
        dialogos: d("Todo queda registrado, joven. Hasta su derrota de hoy.", "Objeto… objeto, pero perdí. Que conste en acta.", "Caso cerrado. El siguiente.") },
      { id: "r-pituto", nombre: "Pituto", nivel: "avanzado", mesa: 4, esBoss: false, plata: 56,
        dialogos: d("Yo conozco a todos los que mandan. A ti no te conozco… todavía.", "Ya te tengo en el radar ahora, cabro.", "Nadie va a recordar tu nombre.") },
      { id: "b-croata", nombre: "El Croata", nivel: "experto", mesa: 2, esBoss: true, plata: 200, habilidad: TEMPANO,
        dialogos: d("Dicen que tienes ojo. Yo tengo paciencia de hielo. Mano a mano: veamos cuál pesa más.", "Frío como soy, esto me hierve la sangre. Buen juego, forastero.", "Tu cara te delató tres manos atrás. Aprende a mentir.") },
    ],
  },
  {
    clave: "club",
    nombre: "El Subterráneo",
    lugar: "Club clandestino bajo el río",
    ambiente: "Terciopelo gastado y armas bajo la mesa.",
    intro: "Para entrar pagaste con favores; para salir, hay que ganar. Aquí nadie pregunta nombres y todos tienen algo que esconder. Estás en lo profundo, y lo profundo se traga a los ambiciosos.",
    epilogo: "El Senador se va sin pagar, claro, pero todos lo vieron caer. Por primera vez en años, alguien le ganó algo que no se compra. La noticia ya va subiendo… hasta la cumbre.",
    rivales: [
      { id: "r-madame", nombre: "Madame Ruiz", nivel: "experto", mesa: 6, esBoss: false, plata: 75,
        dialogos: d("Seis a la mesa, querido. Bienvenido a lo profundo: pocos llegan tan abajo.", "Tienes hambre de verdad. Me agrada… y me asusta.", "Lo profundo se traga a los ambiciosos, mi amor.") },
      { id: "r-turco", nombre: "El Turco Fino", nivel: "experto", mesa: 3, esBoss: false, plata: 85,
        dialogos: d("Traje y cachos: las dos cosas que nunca me quito.", "Me arrugaste el traje, desgraciado. Bien jugado.", "Elegancia, cabro. Eso es lo que te falta.") },
      { id: "b-senador", nombre: "El Senador", nivel: "experto", mesa: 4, esBoss: true, plata: 300, habilidad: DADO_CARGADO,
        dialogos: d("Yo hago las leyes de esta mesa, muchacho. Y la primera es que yo gano.", "Esto… esto no se compra. Maldito talento. Te van a estar esperando arriba.", "El poder no se reparte, se quita. Y a ti te lo acabo de quitar.") },
    ],
  },
  {
    clave: "cumbre",
    nombre: "La Cumbre",
    lugar: "Penthouse, lo más alto de Santiago",
    ambiente: "Desde este ventanal se ve todo Chile encendido.",
    intro: "Llegaste desde el último muelle hasta el cielo. Abajo, toda la ciudad. Arriba, nada. Sólo queda un nombre por borrar del mapa, y te está esperando con una sonrisa de treinta años.",
    epilogo: "El cacho, por fin, tiene un dueño nuevo.",
    rivales: [
      { id: "r-heredero", nombre: "El Heredero", nivel: "experto", mesa: 3, esBoss: false, plata: 120,
        dialogos: d("Mi padre era el segundo mejor de Chile. Yo voy a ser el primero.", "No… ese trono era mío por sangre.", "La sangre manda, advenedizo.") },
      { id: "b-rey", nombre: "El Rey del Cacho", nivel: "experto", mesa: 2, esBoss: true, plata: 1500, habilidad: OJO_HALCON,
        dialogos: d("Subiste desde el barro hasta mi mesa. Eso ya es leyenda. Pero la leyenda termina aquí, mano a mano.", "Treinta años… y un don nadie del puerto me destrona. El cacho es tuyo. Chile es tuyo.", "Yo SOY el cacho, muchacho. Vuelve al barro de donde saliste.") },
    ],
  },
];

// Relleno de las mesas grandes (parroquianos sin nombre propio).
const RELLENO = [
  "Un marinero", "El cojo de la esquina", "Una vieja del puerto", "El estibador", "Un comerciante",
  "El milico de civil", "La cantinera", "Un cargador", "El cura sin sotana", "Un cesante", "El prestamista", "Una dama de la noche",
];

// ---------------------------------------------------------------------------
// Atributos del jugador (lo que sube con plata — nada de cachos extra)
// ---------------------------------------------------------------------------

export interface AtributosJugador {
  /** Pista de probabilidad al APOSTAR en tu turno (0–2). */
  ojo: number;
  /** Pista de "probabilidad de mentira" cuando hay una apuesta (0–2). */
  colmillo: number;
  /** Re-tiradas de tu mano por partida (0–3). */
  suerte: number;
}

export type ClaveAtributo = keyof AtributosJugador;

export const ATRIBUTOS: {
  clave: ClaveAtributo;
  nombre: string;
  desc: string;
  max: number;
  costos: number[];
}[] = [
  { clave: "ojo", nombre: "Ojo del tahúr", desc: "En tu turno ves cuántos dados de la pinta se esperan en la mesa.", max: 2, costos: [60, 140] },
  { clave: "colmillo", nombre: "Colmillo", desc: "Cuando hay una apuesta, ves la probabilidad de que sea mentira.", max: 2, costos: [80, 180] },
  { clave: "suerte", nombre: "Suerte", desc: "Re-tira TU mano completa, una vez por partida (por nivel).", max: 3, costos: [50, 110, 190] },
];

export function costoMejora(clave: ClaveAtributo, nivelActual: number): number {
  const a = ATRIBUTOS.find((x) => x.clave === clave)!;
  return a.costos[nivelActual] ?? Infinity;
}

function atributosLimpios(a: Partial<AtributosJugador> | undefined): AtributosJugador {
  return { ojo: a?.ojo ?? 0, colmillo: a?.colmillo ?? 0, suerte: a?.suerte ?? 0 };
}

// ---------------------------------------------------------------------------
// Estado de la campaña (persistible)
// ---------------------------------------------------------------------------

export interface EstadoHistoria {
  nombre: string;
  atributos: AtributosJugador;
  plata: number;
  escenarioIdx: number;
  rivalIdx: number;
  completado: boolean;
  /** Para mostrar el prólogo sólo una vez. */
  prologoVisto?: boolean;
}

export function historiaNueva(nombre: string): EstadoHistoria {
  return {
    nombre: nombre.trim() || "Forastero",
    atributos: { ojo: 0, colmillo: 0, suerte: 0 },
    plata: 0,
    escenarioIdx: 0,
    rivalIdx: 0,
    completado: false,
    prologoVisto: false,
  };
}

/** Sanea un estado cargado (migración de partidas viejas). */
export function normalizar(h: EstadoHistoria): EstadoHistoria {
  return { ...h, atributos: atributosLimpios(h.atributos) };
}

export function escenarioActual(h: EstadoHistoria): Escenario {
  return CAMPANA[Math.min(h.escenarioIdx, CAMPANA.length - 1)]!;
}
export function rivalActual(h: EstadoHistoria): RivalHistoria {
  const esc = escenarioActual(h);
  return esc.rivales[Math.min(h.rivalIdx, esc.rivales.length - 1)]!;
}

export function avanzar(h: EstadoHistoria): { tienda: boolean; final: boolean } {
  const esc = escenarioActual(h);
  if (h.rivalIdx < esc.rivales.length - 1) {
    h.rivalIdx += 1;
    return { tienda: false, final: false };
  }
  if (h.escenarioIdx < CAMPANA.length - 1) {
    h.escenarioIdx += 1;
    h.rivalIdx = 0;
    return { tienda: true, final: false };
  }
  h.completado = true;
  return { tienda: false, final: true };
}

/** Arma la mesa del encuentro actual: humano + rival + relleno, con niveles por
 *  jugador, reglas de la habilidad y el id que hace trampa (dado cargado). */
export function armarMesa(h: EstadoHistoria): {
  jugadores: { id: string; nombre: string }[];
  nivelPorJugador: Record<string, Nivel>;
  reglas: ReglasCasa;
  dadoCargadoId: string | null;
  acompanantes: string[];
} {
  const rival = rivalActual(h);
  const nivelPorJugador: Record<string, Nivel> = { [rival.id]: rival.nivel };
  const jugadores = [
    { id: HUMANO_ID, nombre: h.nombre },
    { id: rival.id, nombre: rival.nombre },
  ];
  const nRelleno = Math.max(0, rival.mesa - 2);
  const nivelR = nivelMenos(rival.nivel);
  const off = h.escenarioIdx * 3 + h.rivalIdx * 2;
  const acompanantes: string[] = [];
  for (let i = 0; i < nRelleno; i++) {
    const nombre = RELLENO[(off + i) % RELLENO.length]!;
    const id = `f-${rival.id}-${i}`;
    jugadores.push({ id, nombre });
    nivelPorJugador[id] = nivelR;
    acompanantes.push(nombre);
  }
  return {
    jugadores,
    nivelPorJugador,
    reglas: crearReglas(rival.habilidad?.reglas ?? {}),
    dadoCargadoId: rival.habilidad?.dadoCargado ? rival.id : null,
    acompanantes,
  };
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
  /** Narración: prólogo (1ª vez), intro del escenario (1er rival), epílogo (boss caído). */
  narrativa: { prologo: string | null; intro: string | null; epilogo: string | null };
  rival: {
    id: string;
    nombre: string;
    nivel: Nivel;
    esBoss: boolean;
    habilidad: { nombre: string; desc: string } | null;
    /** Plata que entrega al ser derrotado (para el premio). */
    plata: number;
    dialogo: string;
  };
  /** Total de jugadores en la mesa del encuentro (2 = mano a mano). */
  mesa: number;
  /** Nombres del relleno de la mesa (los parroquianos). */
  acompanantes: string[];
  progresoRival: { idx: number; total: number };
  suerteDisponible: number;
  ojo: number;
  colmillo: number;
  mejoras: MejoraVista[];
}
