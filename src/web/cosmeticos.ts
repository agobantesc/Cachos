// EL ROPERO DEL TAHÚR: cosméticos y secretos desbloqueables. Paños de mesa,
// pieles de dados, marcos de avatar y hasta capacidades se van ganando al
// jugar (mesas, rachas, logros, finales, la Mesa del Día). Algunos se exhiben
// con su condición a la vista; otros son SECRETOS: ni el nombre se muestra
// hasta ganarlos. Todo persiste en su propia clave de localStorage.
import { leerPalmares, type Palmares } from "./palmares";
import { LOGROS } from "./historia";
import { leerPrefs } from "./prefs";
import { leerDiaria } from "./diaria";
import { fijarPielDados } from "./Dado";
import { fijarMarcoJugador } from "./Avatar";
import type { EstadoHistoria } from "./historia";

const CLAVE = "cachos.ropero";

export type TipoCosmetico = "pano" | "dados" | "marco" | "capacidad";

/** Lo que mira cada condición de desbloqueo. */
export interface DatosProgreso {
  palmares: Palmares;
  historia: EstadoHistoria | null;
  /** Mesas del Día ganadas (histórico). */
  diariasGanadas: number;
}

export interface Cosmetico {
  id: string;
  tipo: TipoCosmetico;
  nombre: string;
  /** Qué es (se muestra al tenerlo o si no es secreto). */
  desc: string;
  /** Cómo se gana, en palabras del hampa (visible salvo que sea secreto). */
  condicion: string;
  /** SECRETO: hasta ganarlo se muestra como "???". */
  oculto?: boolean;
  /** Se tiene desde el día uno (los básicos de la casa). */
  deSerie?: boolean;
  listo: (d: DatosProgreso) => boolean;
}

const logro = (d: DatosProgreso, id: string) => d.palmares.logros.includes(id);
const capitulo = (d: DatosProgreso, n: number) =>
  !!d.historia && (d.historia.completado || d.historia.escenarioIdx >= n);

export const COSMETICOS: Cosmetico[] = [
  // --- Paños de mesa ---------------------------------------------------------
  { id: "pano-casa", tipo: "pano", nombre: "Paño de la casa", desc: "El fieltro verde botella de toda la vida.", condicion: "De serie.", deSerie: true, listo: () => true },
  { id: "pano-burdeos", tipo: "pano", nombre: "Paño burdeos", desc: "Fieltro color vino, como las mesas bravas del sur.", condicion: "Gana 10 mesas (donde sea).", listo: (d) => d.palmares.ganadas >= 10 },
  { id: "pano-puerto", tipo: "pano", nombre: "Paño del puerto", desc: "Azul profundo, con olor a sal y a primera victoria.", condicion: "Sal de La Pocilga: completa el primer capítulo.", listo: (d) => capitulo(d, 1) },
  { id: "pano-fierro", tipo: "pano", nombre: "Paño de la Maestranza", desc: "Fieltro oxidado, con olor a soldadura y a deudas viejas.", condicion: "Llega a los galpones de la Maestranza.", listo: (d) => capitulo(d, 2) },
  { id: "pano-subterraneo", tipo: "pano", nombre: "Paño del Subterráneo", desc: "Terciopelo púrpura del club bajo el río.", condicion: "Abre los tres candados del bajo mundo.", listo: (d) => logro(d, "tres-llaves") },
  { id: "pano-banca", tipo: "pano", nombre: "Paño de la Banca", desc: "Negro absoluto con hilo de oro. En este fieltro nadie ve venir nada.", condicion: "La Banca te veló: conoce el final donde ella cobra.", oculto: true, listo: (d) => d.palmares.finales.includes("malo") },

  // --- Pieles de dados -------------------------------------------------------
  { id: "dados-clasicos", tipo: "dados", nombre: "Dados de la casa", desc: "Marfil honesto, pips grabados.", condicion: "De serie.", deSerie: true, listo: () => true },
  { id: "dados-obsidiana", tipo: "dados", nombre: "Dados de obsidiana", desc: "Piedra negra con pips de oro: pesan como una amenaza.", condicion: "Gana una mesa con tus 5 dados intactos.", listo: (d) => logro(d, "sin-un-rasguno") },
  { id: "dados-sangre", tipo: "dados", nombre: "Dados de sangre", desc: "Rojo matadero. La Vega los reconocería.", condicion: "Encadena una racha de 3 mesas ganadas.", listo: (d) => d.palmares.mejorRacha >= 3 },
  { id: "dados-oro", tipo: "dados", nombre: "Dados de oro", desc: "Oro macizo de la Cumbre. Ostentosos hasta decir basta.", condicion: "Corona la campaña, con el final que sea.", listo: (d) => logro(d, "rey-caido") },
  { id: "dados-dia", tipo: "dados", nombre: "Dados del Día", desc: "Azul de medianoche con pips de plata: los de la mesa que cambia cada día.", condicion: "Gana una Mesa del Día.", oculto: true, listo: (d) => d.diariasGanadas >= 1 },
  { id: "dados-marfil", tipo: "dados", nombre: "El marfil del Patrón", desc: "Marfil amarillento, más viejo que Santiago. Su primera partida vive aquí.", condicion: "Baja al verdadero Rey del Cacho.", oculto: true, listo: (d) => logro(d, "detras-vitrina") },

  // --- Marcos de avatar ------------------------------------------------------
  { id: "marco-ninguno", tipo: "marco", nombre: "Sin marco", desc: "Cara lavada, como llegaste al puerto.", condicion: "De serie.", deSerie: true, listo: () => true },
  { id: "marco-bronce", tipo: "marco", nombre: "Marco de bronce", desc: "Un aro de bronce pulido: respeto de barrio.", condicion: "Gana 25 mesas (donde sea).", listo: (d) => d.palmares.ganadas >= 25 },
  { id: "marco-plata", tipo: "marco", nombre: "Marco de plata", desc: "Plata curtida de mil noches: el aro de los que calientan la silla.", condicion: "Juega 40 mesas (ganes o pierdas).", listo: (d) => d.palmares.jugadas >= 40 },
  { id: "marco-oro", tipo: "marco", nombre: "Marco de oro", desc: "Oro de verdad. Que sepan quién manda en la mesa.", condicion: "Encadena una racha de 5 mesas ganadas.", listo: (d) => d.palmares.mejorRacha >= 5 },
  { id: "marco-humo", tipo: "marco", nombre: "Marco de humo", desc: "Un aro que se deshace, como el humo de la trastienda.", condicion: "Baja hasta la trastienda de San Diego (capítulo 4).", listo: (d) => capitulo(d, 3) },
  { id: "marco-dia", tipo: "marco", nombre: "Marco del cronómetro", desc: "Azul de medianoche con las cuatro horas marcadas: el aro de los que corren contra el reloj.", condicion: "Gana tres Mesas del Día.", listo: (d) => d.diariasGanadas >= 3 },
  { id: "marco-hampa", tipo: "marco", nombre: "Sello del hampa", desc: "Un aro rojo sangre: el bajo mundo reconoce a los suyos.", condicion: "Cumple un encargo del barrio, de punta a punta.", oculto: true, listo: (d) => logro(d, "de-palabra") },
  { id: "marco-calavera", tipo: "marco", nombre: "Marco de la calavera", desc: "Hueso viejo con una calavera al pie: el río devuelve a los porfiados.", condicion: "Sobrevive a 25 palizas y sigue sentándote a la mesa.", oculto: true, listo: (d) => d.palmares.jugadas - d.palmares.ganadas >= 25 },
  { id: "marco-tahur", tipo: "marco", nombre: "Marco del Tahúr", desc: "Oro con los cuatro pips cardinales: el aro de los completistas.", condicion: "Junta los doce logros de la campaña.", oculto: true, listo: (d) => LOGROS.every((l) => d.palmares.logros.includes(l.id)) },
  { id: "marco-leyenda", tipo: "marco", nombre: "Marco de la Leyenda", desc: "Doble aro de oro viejo: sólo para los que volvieron a empezar y coronaron igual.", condicion: "Corona una vuelta de Leyenda.", oculto: true, listo: (d) => logro(d, "leyenda-viva") },

  // --- Capacidades -----------------------------------------------------------
  { id: "cap-sin-piedad", tipo: "capacidad", nombre: "Sin piedad", desc: "Se abre la dificultad 'Sin piedad' (brutal) en Jugar solo: la banca completa, sin anestesia.", condicion: "Corona la campaña, con el final que sea.", listo: (d) => logro(d, "rey-caido") },
  { id: "cap-mesa-llena", tipo: "capacidad", nombre: "Mesa llena", desc: "Jugar solo se agranda: hasta 6 rivales en la misma mesa. Puro pulmón y oído.", condicion: "Gana 50 mesas (donde sea).", listo: (d) => d.palmares.ganadas >= 50 },
];

export interface Ropero {
  ganados: string[];
  equipado: { pano: string; dados: string; marco: string };
}

const EQUIPADO_DEFECTO = { pano: "pano-casa", dados: "dados-clasicos", marco: "marco-ninguno" };

export function leerRopero(): Ropero {
  const deSerie = COSMETICOS.filter((c) => c.deSerie).map((c) => c.id);
  try {
    const r = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<Ropero>;
    const ganados = [...new Set([...deSerie, ...(Array.isArray(r.ganados) ? r.ganados : [])])];
    const eq = { ...EQUIPADO_DEFECTO, ...(r.equipado ?? {}) };
    // Un equipado corrupto (o no ganado) vuelve al de serie.
    for (const t of ["pano", "dados", "marco"] as const) {
      const c = COSMETICOS.find((x) => x.id === eq[t]);
      if (!c || c.tipo !== t || !ganados.includes(c.id)) eq[t] = EQUIPADO_DEFECTO[t];
    }
    return { ganados, equipado: eq };
  } catch {
    return { ganados: deSerie, equipado: { ...EQUIPADO_DEFECTO } };
  }
}

function guardar(r: Ropero): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(r));
  } catch {
    /* sin persistencia */
  }
}

/** Junta los datos de progreso que miran las condiciones. */
function datos(): DatosProgreso {
  const prefs = leerPrefs();
  return {
    palmares: leerPalmares(),
    historia: prefs.historia ?? null,
    diariasGanadas: leerDiaria().ganadas,
  };
}

/** Revisa TODAS las condiciones y desbloquea lo que corresponda.
 *  Devuelve los cosméticos recién ganados (para avisar en pantalla). */
export function revisarDesbloqueos(): Cosmetico[] {
  const r = leerRopero();
  const d = datos();
  const nuevos = COSMETICOS.filter((c) => !r.ganados.includes(c.id) && c.listo(d));
  if (nuevos.length > 0) {
    r.ganados.push(...nuevos.map((c) => c.id));
    guardar(r);
  }
  return nuevos;
}

/** ¿Se tiene este cosmético/capacidad? (los de serie, siempre). */
export function tieneCosmetico(id: string): boolean {
  return leerRopero().ganados.includes(id);
}

/** Equipa un cosmético ganado (y lo aplica al tiro). Devuelve si pudo. */
export function equipar(id: string): boolean {
  const c = COSMETICOS.find((x) => x.id === id);
  if (!c || c.tipo === "capacidad") return false;
  const r = leerRopero();
  if (!r.ganados.includes(id)) return false;
  r.equipado[c.tipo] = id;
  guardar(r);
  aplicarEquipado();
  return true;
}

// --- Aplicación: el equipado tiñe la app (paño), los dados y el avatar ------

/** Colores del paño: [lámpara sobre el fieltro, fondo del fieltro, paño de tu mano]. */
const PANOS: Record<string, [string, string, string]> = {
  "pano-casa": ["rgba(34, 61, 42, 0.5)", "rgba(24, 44, 30, 0.28)", "rgba(38, 66, 46, 0.34)"],
  "pano-burdeos": ["rgba(84, 30, 34, 0.5)", "rgba(56, 20, 24, 0.3)", "rgba(92, 34, 38, 0.34)"],
  "pano-puerto": ["rgba(30, 52, 74, 0.52)", "rgba(20, 36, 54, 0.3)", "rgba(34, 58, 82, 0.34)"],
  "pano-fierro": ["rgba(88, 52, 30, 0.5)", "rgba(58, 34, 20, 0.3)", "rgba(96, 58, 34, 0.34)"],
  "pano-subterraneo": ["rgba(62, 34, 78, 0.5)", "rgba(42, 22, 54, 0.3)", "rgba(70, 40, 88, 0.34)"],
  "pano-banca": ["rgba(28, 26, 20, 0.62)", "rgba(14, 13, 10, 0.4)", "rgba(38, 34, 24, 0.4)"],
};

/** Muestra sólida del paño (para la vista previa del Ropero). */
export function muestraPano(id: string): string {
  const p = PANOS[id] ?? PANOS["pano-casa"]!;
  return p[0].replace(/[\d.]+\)$/, "1)"); // el color de la lámpara, opaco
}

export function aplicarEquipado(): void {
  if (typeof document === "undefined") return;
  const eq = leerRopero().equipado;
  const pano = PANOS[eq.pano] ?? PANOS["pano-casa"]!;
  const raiz = document.documentElement;
  raiz.style.setProperty("--pano-lampara", pano[0]);
  raiz.style.setProperty("--pano-fondo", pano[1]);
  raiz.style.setProperty("--pano-mano", pano[2]);
  fijarPielDados(eq.dados);
  fijarMarcoJugador(eq.marco === "marco-ninguno" ? null : eq.marco);
}
