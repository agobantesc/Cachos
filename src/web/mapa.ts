// MAPAS del MODO HISTORIA — la vista cenital (tipo RPG) de cada barrio del
// bajo mundo. Entre mesa y mesa, el jugador CAMINA el barrio: reta a los
// parroquianos en el orden que quiera, pasa por la tienda, se topa con los
// eventos de calle (decisiones, peleas, lecturas de suerte) y, cuando vence a
// todos, se le abre la PUERTA del jefe.
//
// El grid es sólo muros ('#') y piso ('.'). Las entidades (rivales, tienda,
// eventos, puerta del jefe, botines, letreros) viven en una lista aparte con
// sus coordenadas. Cada mapa es de una pantalla (11×9), pensado para teléfono.
import type { ItemId } from "./historia";

export type CondicionMapa =
  | { tipo: "plata"; monto: number } // tener al menos tanta plata
  | { tipo: "item"; item: ItemId }; // llevar cierto item

export type TipoEntidad = "rival" | "tienda" | "evento" | "puerta" | "letrero" | "premio";

export interface EntidadMapa {
  id: string;
  tipo: TipoEntidad;
  x: number;
  y: number;
  /** tipo "rival": índice del rival dentro de escenario.rivales. */
  rivalIdx?: number;
  /** tipo "evento": clave del evento del escenario que dispara. */
  eventoClave?: string;
  /** tipo "premio": condición para reclamarlo. */
  cond?: CondicionMapa;
  /** Texto de letrero, aviso de puerta cerrada o de botín condicionado. */
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
  entidades: EntidadMapa[];
}

// Atajos para escribir entidades de forma compacta.
const rival = (id: string, x: number, y: number, rivalIdx: number): EntidadMapa => ({ id, tipo: "rival", x, y, rivalIdx });
const tienda = (x: number, y: number): EntidadMapa => ({ id: "tienda", tipo: "tienda", x, y });
const evento = (clave: string, x: number, y: number): EntidadMapa => ({ id: clave, tipo: "evento", x, y, eventoClave: clave });
const puerta = (x: number, y: number, texto: string): EntidadMapa => ({ id: "puerta", tipo: "puerta", x, y, texto });
const letrero = (id: string, x: number, y: number, texto: string): EntidadMapa => ({ id, tipo: "letrero", x, y, texto });
const premio = (id: string, x: number, y: number, cond: CondicionMapa, p: { plata?: number; item?: ItemId }, texto: string): EntidadMapa => ({ id, tipo: "premio", x, y, cond, premio: p, texto });

// ---------------------------------------------------------------------------
// Los seis barrios. La puerta del jefe se abre al vencer a los parroquianos.
// Índices de rival por escenario (ver historia.ts):
//   pocilga:    0 pulga, 1 roto, 2 cabrera, 3 berta(jefe)
//   vega:       0 charqui, 1 quintrala, 2 sapo, 3 carnicero(jefe)
//   maestranza: 0 fundidor, 1 trenza, 2 mecha, 3 verdugo(jefe)
//   trastienda: 0 notario, 1 pituto, 2 viuda, 3 croata(jefe)
//   club:       0 madame, 1 turco, 2 comisario, 3 senador(jefe)
//   cumbre:     0 heredero, 1 jueza, 2 rey(jefe)
// ---------------------------------------------------------------------------

export const MAPAS: Record<string, MapaEscenario> = {
  pocilga: {
    ancho: 11,
    alto: 9,
    titulo: "La Pocilga",
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
      puerta(5, 2, "Doña Berta no juega con cualquiera. Gánale primero a los tres de la pocilga."),
      rival("r-pulga", 2, 4, 0),
      rival("r-roto", 8, 4, 1),
      rival("r-cabrera", 8, 6, 2),
      tienda(2, 6),
      evento("pocilga-cabro", 5, 4),
    ],
  },

  vega: {
    ancho: 11,
    alto: 9,
    titulo: "La Vega Chica",
    filas: [
      "###########",
      "#####.#####",
      "#####.#####",
      "#.........#",
      "#.##.##.###",
      "#.........#",
      "#.##.##.###",
      "#.........#",
      "###########",
    ],
    entrada: { x: 5, y: 7 },
    entidades: [
      rival("b-carnicero", 5, 1, 3),
      puerta(5, 2, "El Carnicero recibe sólo a los que ya valen algo. Vence a los tres del mercado."),
      rival("r-charqui", 2, 5, 0),
      rival("r-quintrala", 8, 5, 1),
      rival("r-sapo", 2, 7, 2),
      tienda(2, 3),
      evento("vega-billetera", 8, 3),
      evento("vega-pitona", 5, 5),
      premio("vega-cajon", 8, 7, { tipo: "plata", monto: 120 }, { item: "marcado" }, "Un cajón con candado. Quien suelte 120 de propina, se lo abren."),
    ],
  },

  maestranza: {
    ancho: 11,
    alto: 9,
    titulo: "La Maestranza",
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
      puerta(5, 2, "El Verdugo no abre su mesa hasta que pases por los tres de la maestranza."),
      rival("r-fundidor", 1, 5, 0),
      rival("r-trenza", 9, 5, 1),
      rival("r-mecha", 5, 5, 2),
      tienda(4, 5),
      evento("maestranza-perro", 9, 7),
      evento("maestranza-bronca", 1, 7),
    ],
  },

  trastienda: {
    ancho: 11,
    alto: 9,
    titulo: "La Trastienda",
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
      puerta(5, 2, "El Croata sólo se sienta con los que ganaron su silla. Vence a los tres."),
      rival("r-notario", 2, 4, 0),
      rival("r-pituto", 8, 4, 1),
      rival("r-viuda", 5, 5, 2),
      tienda(2, 7),
      evento("trastienda-prestamo", 8, 7),
      evento("trastienda-cobrador", 2, 6),
    ],
  },

  club: {
    ancho: 11,
    alto: 9,
    titulo: "El Subterráneo",
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
      puerta(5, 2, "El Senador hace las leyes de la mesa. Gánate la sala venciendo a los tres."),
      rival("r-madame", 2, 5, 0),
      rival("r-turco", 8, 5, 1),
      rival("r-comisario", 6, 5, 2),
      tienda(4, 3),
      evento("club-madame", 7, 3),
      evento("club-tarot", 9, 3),
      evento("club-hermano", 1, 3),
      evento("club-recado", 7, 5),
      premio("club-caja", 1, 5, { tipo: "item", item: "soplon" }, { plata: 150 }, "Una caja fuerte vieja. El que llegue con un dato del soplón sabe la combinación."),
    ],
  },

  cumbre: {
    ancho: 11,
    alto: 9,
    titulo: "La Cumbre",
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
      puerta(5, 2, "El Rey lleva treinta años invicto. Pasa primero por el Heredero y la Jueza."),
      rival("r-heredero", 2, 4, 0),
      rival("r-jueza", 8, 4, 1),
      tienda(2, 7),
      evento("cumbre-oferta", 8, 7),
      evento("cumbre-huerfano", 1, 3),
      evento("cumbre-aliado", 9, 3),
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
