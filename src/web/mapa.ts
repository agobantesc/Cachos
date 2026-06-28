// MAPAS del MODO HISTORIA — la vista cenital ("Game Boy") de cada barrio del
// bajo mundo. Entre mesa y mesa, el jugador camina por el barrio: enfrenta a los
// parroquianos, pasa por la tienda, toma decisiones y, cuando cumple la
// condición, se le abre la puerta al jefe.
//
// El grid es sólo muros ('#') y piso ('.'). Las entidades (rivales, tienda,
// dilema, puerta del jefe, premios, letreros) viven en una lista aparte con sus
// coordenadas, para no ensuciar el dibujo. Cada mapa es de una pantalla (11×9),
// pensado para el teléfono.
import type { ItemId } from "./historia";

export type CondicionMapa =
  | { tipo: "rivales" } // haber vencido a todos los rivales no-boss del escenario
  | { tipo: "plata"; monto: number } // tener al menos tanta plata
  | { tipo: "item"; item: ItemId }; // tener cierto item

export type TipoEntidad = "rival" | "tienda" | "dilema" | "puerta" | "letrero" | "premio";

export interface EntidadMapa {
  id: string;
  tipo: TipoEntidad;
  x: number;
  y: number;
  /** tipo "rival": índice del rival dentro de escenario.rivales. */
  rivalIdx?: number;
  /** tipo "puerta"/"premio": condición para abrir / reclamar. */
  cond?: CondicionMapa;
  /** Texto de letrero, o aviso al chocar una puerta cerrada. */
  texto?: string;
  /** tipo "premio": lo que entrega (una vez). */
  premio?: { plata?: number; item?: ItemId };
}

export interface MapaEscenario {
  ancho: number;
  alto: number;
  filas: string[]; // '#' muro, '.' piso
  entrada: { x: number; y: number };
  titulo: string;
  /** Objetivo del barrio (qué hay que hacer para avanzar). */
  pista: string;
  entidades: EntidadMapa[];
}

// Atajos para escribir entidades de forma compacta.
const rival = (id: string, x: number, y: number, rivalIdx: number): EntidadMapa => ({ id, tipo: "rival", x, y, rivalIdx });
const tienda = (x: number, y: number): EntidadMapa => ({ id: "tienda", tipo: "tienda", x, y });
const dilema = (x: number, y: number): EntidadMapa => ({ id: "dilema", tipo: "dilema", x, y });
const puerta = (x: number, y: number, cond: CondicionMapa, texto: string): EntidadMapa => ({ id: "puerta", tipo: "puerta", x, y, cond, texto });
const letrero = (id: string, x: number, y: number, texto: string): EntidadMapa => ({ id, tipo: "letrero", x, y, texto });
const premio = (id: string, x: number, y: number, cond: CondicionMapa, p: { plata?: number; item?: ItemId }, texto: string): EntidadMapa => ({ id, tipo: "premio", x, y, cond, premio: p, texto });

// ---------------------------------------------------------------------------
// Los seis barrios. boss = último rival del escenario; los demás son no-boss.
// Índices de rival por escenario (ver historia.ts):
//   pocilga:    0 pulga, 1 roto, 2 cabrera, 3 berta(boss)
//   vega:       0 charqui, 1 quintrala, 2 sapo, 3 carnicero(boss)
//   maestranza: 0 fundidor, 1 trenza, 2 mecha, 3 verdugo(boss)
//   trastienda: 0 notario, 1 pituto, 2 viuda, 3 croata(boss)
//   club:       0 madame, 1 turco, 2 comisario, 3 senador(boss)
//   cumbre:     0 heredero, 1 jueza, 2 rey(boss)
// ---------------------------------------------------------------------------

export const MAPAS: Record<string, MapaEscenario> = {
  pocilga: {
    ancho: 11,
    alto: 9,
    titulo: "La Pocilga",
    pista: "Gánale a los tres parroquianos y se abrirá la mesa de Doña Berta.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#.........#",
      "#....#....#",
      "#.........#",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-berta", 5, 1, 3),
      puerta(5, 2, { tipo: "rivales" }, "Doña Berta no juega con cualquiera. Gánale primero a los tres de la pocilga."),
      rival("r-pulga", 2, 4, 0),
      rival("r-roto", 8, 4, 1),
      rival("r-cabrera", 8, 6, 2),
      tienda(2, 6),
      dilema(5, 4),
    ],
  },

  vega: {
    ancho: 11,
    alto: 9,
    titulo: "La Vega Chica",
    pista: "Hazte respetar entre los puestos; el Carnicero está al fondo.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#.##.##.##.",
      "#.........#",
      "#.##.##.##.",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-carnicero", 5, 1, 3),
      puerta(5, 2, { tipo: "rivales" }, "El Carnicero recibe sólo a los que ya valen algo. Vence a los tres del mercado."),
      rival("r-charqui", 2, 5, 0),
      rival("r-quintrala", 8, 5, 1),
      rival("r-sapo", 2, 7, 2),
      tienda(2, 3),
      dilema(8, 3),
      premio("vega-cajon", 8, 7, { tipo: "plata", monto: 120 }, { item: "marcado" }, "Un cajón con candado. Quien suelte 120 de propina, se lo abren."),
    ],
  },

  maestranza: {
    ancho: 11,
    alto: 9,
    titulo: "La Maestranza",
    pista: "Cruza los galpones y aguanta el fierro hasta El Verdugo.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#.#.###.#.#",
      "#.#.....#.#",
      "#.#.###.#.#",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-verdugo", 5, 1, 3),
      puerta(5, 2, { tipo: "rivales" }, "El Verdugo no abre su mesa hasta que pases por los tres de la maestranza."),
      rival("r-fundidor", 1, 5, 0),
      rival("r-trenza", 9, 5, 1),
      rival("r-mecha", 5, 5, 2),
      tienda(2, 7),
      dilema(8, 7),
    ],
  },

  trastienda: {
    ancho: 11,
    alto: 9,
    titulo: "La Trastienda",
    pista: "Tres sillas, tres rivales. El Croata espera al fondo del paño.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#..#...#..#",
      "#..#...#..#",
      "#.........#",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-croata", 5, 1, 3),
      puerta(5, 2, { tipo: "rivales" }, "El Croata sólo se sienta con los que ganaron su silla. Vence a los tres."),
      rival("r-notario", 2, 4, 0),
      rival("r-pituto", 8, 4, 1),
      rival("r-viuda", 5, 5, 2),
      tienda(2, 7),
      dilema(8, 7),
    ],
  },

  club: {
    ancho: 11,
    alto: 9,
    titulo: "El Subterráneo",
    pista: "Reservados de terciopelo. El Senador no se deja ver fácil.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#.#.#.#.#.#",
      "#.........#",
      "#.#.#.#.#.#",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-senador", 5, 1, 3),
      puerta(5, 2, { tipo: "rivales" }, "El Senador hace las leyes de la mesa. Gánate la sala venciendo a los tres."),
      rival("r-madame", 2, 5, 0),
      rival("r-turco", 8, 5, 1),
      rival("r-comisario", 5, 5, 2),
      tienda(2, 3),
      dilema(8, 3),
      premio("club-caja", 2, 7, { tipo: "item", item: "soplon" }, { plata: 150 }, "Una caja fuerte vieja. El que llegue con un dato del soplón sabe la combinación."),
    ],
  },

  cumbre: {
    ancho: 11,
    alto: 9,
    titulo: "La Cumbre",
    pista: "El penthouse. Sólo el Heredero y la Jueza te separan del Rey.",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#...###...#",
      "#...#.#...#",
      "#.........#",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-rey", 5, 1, 2),
      puerta(5, 2, { tipo: "rivales" }, "El Rey lleva treinta años invicto. Pasa primero por el Heredero y la Jueza."),
      rival("r-heredero", 2, 4, 0),
      rival("r-jueza", 8, 4, 1),
      tienda(2, 7),
      dilema(8, 7),
      letrero("cumbre-vista", 5, 5, "Desde el ventanal se ve todo Chile encendido. Arriba, sólo queda un trono."),
    ],
  },
};

export function mapaDeEscenario(clave: string): MapaEscenario | null {
  return MAPAS[clave] ?? null;
}

export function esPared(m: MapaEscenario, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= m.ancho || y >= m.alto) return true;
  return (m.filas[y]?.[x] ?? "#") === "#";
}

export function entidadEn(m: MapaEscenario, x: number, y: number): EntidadMapa | undefined {
  return m.entidades.find((e) => e.x === x && e.y === y);
}

/** Valida un mapa (dimensiones, entidades sobre piso, sin choques). Para tests. */
export function validarMapa(m: MapaEscenario): string[] {
  const errs: string[] = [];
  if (m.filas.length !== m.alto) errs.push(`alto ${m.alto} != filas ${m.filas.length}`);
  m.filas.forEach((f, y) => {
    if (f.length !== m.ancho) errs.push(`fila ${y} ancho ${f.length} != ${m.ancho}`);
  });
  if (esPared(m, m.entrada.x, m.entrada.y)) errs.push("la entrada está sobre un muro");
  const entradaK = `${m.entrada.x},${m.entrada.y}`;
  const ocupadas = new Set<string>();
  for (const e of m.entidades) {
    const k = `${e.x},${e.y}`;
    if (esPared(m, e.x, e.y)) errs.push(`entidad ${e.id} sobre muro (${k})`);
    if (k === entradaK) errs.push(`entidad ${e.id} sobre la entrada (${k})`);
    if (ocupadas.has(k)) errs.push(`dos entidades en ${k}`);
    ocupadas.add(k);
  }
  return errs;
}
