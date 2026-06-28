// MODO HISTORIA — una campaña por el bajo mundo del cacho chileno.
//
// El jugador, con su perfil, parte en pocilgas contra novatos y se va internando
// en las profundidades: tabernas, mercados negros, maestranzas, clubes
// clandestinos… hasta la cumbre. Hay MESAS de todo tamaño (1v1, chicas, grandes
// hasta 6). Los rivales escalan; los BOSSES tienen HABILIDADES (reglas de la casa
// a su favor, trampas, IA implacable) — sin "cachos de ventaja". Entre escenarios
// el jugador gana PLATA, sube ATRIBUTOS (ojo, colmillo, suerte) y junta ITEMS;
// y en la calle le salen DILEMAS que moldean su camino. Ambiente oscuro, mafioso.
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
const SIN_COMODIN: HabilidadBoss = {
  nombre: "Puro fierro",
  desc: "En su mesa el as NO es comodín: cada pinta vale sólo lo que es. Sin atajos.",
  reglas: { asComodin: false },
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

// --- Items (consumibles que el jugador junta y usa en la mesa) --------------

export type ItemId = "cargado" | "marcado" | "soplon";

export interface ItemMeta {
  id: ItemId;
  nombre: string;
  desc: string;
  /** Texto corto para el botón en la mesa. */
  corto: string;
  costo: number;
  max: number;
}

export const ITEMS: ItemMeta[] = [
  {
    id: "cargado",
    nombre: "Cacho cargado",
    corto: "Cargar",
    desc: "Tu mano sale concentrada esta ronda: más dados iguales para apostar firme.",
    costo: 120,
    max: 3,
  },
  {
    id: "marcado",
    nombre: "Dados marcados",
    corto: "Marcar",
    desc: "Al capo de la mesa le salen dados dispersos esta ronda. Que sufra él.",
    costo: 150,
    max: 3,
  },
  {
    id: "soplon",
    nombre: "El dato del soplón",
    corto: "Soplón",
    desc: "Un pajarito te canta las probabilidades (Ojo y Colmillo) por todo este encuentro.",
    costo: 90,
    max: 5,
  },
];

export type Inventario = Record<ItemId, number>;

export function itemMeta(id: ItemId): ItemMeta {
  return ITEMS.find((x) => x.id === id)!;
}

// --- Dilemas (decisiones de calle que moldean tu camino) --------------------

export interface OpcionDilema {
  etiqueta: string;
  /** Narración del desenlace de elegir esta opción. */
  resultado: string;
  /** Plata que ganas (o pierdes, si es negativa). */
  plata?: number;
  /** Item que te llevas. */
  item?: ItemId;
  /** Atributo que sube un nivel, gratis. */
  atributo?: ClaveAtributo;
}

export interface Dilema {
  /** Clave única (para no repetirlo). */
  clave: string;
  titulo: string;
  texto: string;
  opciones: OpcionDilema[];
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
  /** Decisión de calle, al llegar al escenario (una vez). */
  dilema?: Dilema;
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
    dilema: {
      clave: "pocilga-cabro",
      titulo: "El cabro de la puerta",
      texto: "Un cabro chico, descalzo, te tira la manga. 'Tío, ¿le vigilo la puerta mientras juega? O si quiere… le consigo un dato de los que sirven.' Tiene cara de saber más de lo que aparenta.",
      opciones: [
        { etiqueta: "Págale por vigilar", plata: 40, resultado: "El cabro se planta en la puerta como perro guardián. Nadie te molesta, y de paso te llena los bolsillos con lo que le sobra a la casa. Primera plata de la noche." },
        { etiqueta: "Mándalo por el dato", item: "soplon", resultado: "El cabro desaparece y vuelve con un soplón viejo que te susurra al oído cómo leer la mesa. Guárdate ese dato: vale más que la plata." },
      ],
    },
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
    dilema: {
      clave: "vega-billetera",
      titulo: "La billetera en el cajón",
      texto: "Moviendo un cajón de manzanas podridas, una billetera gorda cae al suelo. Nadie la vio caer… o eso crees. Adentro hay un fajo que huele a plata grande.",
      opciones: [
        { etiqueta: "Quédatela", plata: 90, resultado: "Te embolsas el fajo sin pestañear. Plata es plata. Pero al levantar la vista, El Charqui te clava los ojos desde su puesto: vio todo, y no olvida." },
        { etiqueta: "Devuélvela", atributo: "colmillo", resultado: "Era del Carnicero. Te mira raro —nadie devuelve nada en La Vega— y te suelta, bajito, un consejo para oler la mentira ajena. Vale más que el fajo." },
      ],
    },
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
    clave: "maestranza",
    nombre: "La Maestranza",
    lugar: "Galpones del ferrocarril, San Eugenio",
    ambiente: "Fierro oxidado, aceite quemado y trenes que ya no salen.",
    intro: "Te corriste la voz y te llamaron a la Maestranza: galpones muertos donde se juntan los pesados de verdad, los que ya no le temen a nadie. Acá no hay vino ni fruta que tape nada. Sólo fierro, y la pura mentira al hueso.",
    epilogo: "El Verdugo guarda su cacho en un saco de género y te mira de arriba abajo. 'Pasaste por el fierro y seguís de pie', gruñe. Te señala un boquerón oscuro entre los rieles: el camino sigue para abajo.",
    dilema: {
      clave: "maestranza-perro",
      titulo: "El quiltro entre los fierros",
      texto: "Un perro flaco, todo costilla, se acerca olfateando tu bolsillo. Trae el lomo pelado y los ojos de los que aguantaron mucho. En la Maestranza dicen que el que adopta a un quiltro de acá, adopta su suerte.",
      opciones: [
        { etiqueta: "Dale tu pan", atributo: "suerte", resultado: "Partes tu marraqueta y se la das. El quiltro te sigue toda la noche y se echa bajo tu silla. Los viejos asienten: ahora andas con suerte de la buena." },
        { etiqueta: "Sigue de largo", plata: 50, resultado: "No estás para regalar pan. El perro se va con otro. Te guardas tu marraqueta y, de paso, lo que ibas a gastar en tonteras: la plata pesa más que la pena." },
      ],
    },
    rivales: [
      { id: "r-fundidor", nombre: "El Fundidor", nivel: "avanzado", mesa: 5, esBoss: false, plata: 60,
        dialogos: d("Aquí fundimos fierro… y novatos. Cinco a la mesa, aguanta el calor.", "Te saliste del molde, cabro. No me pasa seguido.", "Al horno con él. Que se derrita solo.") },
      { id: "r-trenza", nombre: "La Trenza", nivel: "avanzado", mesa: 3, esBoss: false, plata: 66,
        dialogos: d("Manejé locomotoras y manejo mentiras. Las dos te aplastan igual.", "Me descarrilaste, desgraciado. Bien jugado.", "Quítenlo de la vía, que viene el tren.") },
      { id: "r-mecha", nombre: "Mecha Corta", nivel: "experto", mesa: 4, esBoss: false, plata: 80,
        dialogos: d("Tengo la paciencia justa para una mano. Apúrate o exploto.", "…contuviste la mecha. Pocos lo logran.", "Bum. Te dije que tenía la mecha corta, cabro.") },
      { id: "b-verdugo", nombre: "El Verdugo", nivel: "experto", mesa: 4, esBoss: true, plata: 220, habilidad: SIN_COMODIN,
        dialogos: d("En mi mesa el as no salva a nadie. Aquí la pinta vale lo que es, igual que la gente.", "Sin comodines me ganaste. Eso… eso es de los grandes. Baja, te están esperando.", "Sin comodines no eres nada, cabro. Como casi todos.") },
    ],
  },
  {
    clave: "trastienda",
    nombre: "La Trastienda",
    lugar: "Tras una botillería en San Diego",
    ambiente: "Humo de cigarro barato y deudas que se pagan con sangre.",
    intro: "Bajaste por los rieles hasta una trastienda. Un foco amarillo cuelga sobre el paño verde y aquí ya nadie juega por plata: se juega por respeto, y a veces por la vida.",
    epilogo: "El Croata apaga su cigarro sin apuro. 'Pocos me hacen sudar', dice. Te abre la puerta a lo más profundo. Del otro lado, todo es más oscuro.",
    dilema: {
      clave: "trastienda-prestamo",
      titulo: "El adelanto del Notario",
      texto: "El Notario te corre la silla antes de empezar. 'Joven, le adelanto un fajo contra sus ganancias de hoy. Firme aquí y juega tranquilo… o no firme nada, y siga debiéndose sólo a usted mismo.' La lapicera brilla más que su sonrisa.",
      opciones: [
        { etiqueta: "Firma el adelanto", plata: 120, resultado: "Firmas sin leer la letra chica —nunca hay que leerla— y te embolsas el fajo. Plata fresca para la mesa. La deuda, como todo aquí, ya verás cómo se paga." },
        { etiqueta: "No le debas a nadie", atributo: "ojo", resultado: "Le devuelves la lapicera sin firmar. El Notario sonríe de verdad por una vez: 'Hombre libre.' Jugar sin deuda encima te aclara la vista como nada." },
      ],
    },
    rivales: [
      { id: "r-notario", nombre: "El Notario", nivel: "avanzado", mesa: 3, esBoss: false, plata: 70,
        dialogos: d("Todo queda registrado, joven. Hasta su derrota de hoy.", "Objeto… objeto, pero perdí. Que conste en acta.", "Caso cerrado. El siguiente.") },
      { id: "r-pituto", nombre: "Pituto", nivel: "avanzado", mesa: 4, esBoss: false, plata: 78,
        dialogos: d("Yo conozco a todos los que mandan. A ti no te conozco… todavía.", "Ya te tengo en el radar ahora, cabro.", "Nadie va a recordar tu nombre.") },
      { id: "r-viuda", nombre: "La Viuda Alegre", nivel: "experto", mesa: 3, esBoss: false, plata: 95,
        dialogos: d("Enterré a tres maridos jugando al cacho. Siéntate, lindo, hay sitio.", "Me dejas viuda otra vez… de mi invicto. Qué hombre.", "Otro luto más para mi colección, mijito.") },
      { id: "b-croata", nombre: "El Croata", nivel: "experto", mesa: 2, esBoss: true, plata: 260, habilidad: TEMPANO,
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
    dilema: {
      clave: "club-madame",
      titulo: "La mano privada de Madame Ruiz",
      texto: "Madame Ruiz te aparta a un reservado de terciopelo. 'Antes del circo, una manito entre tú y yo, querido. Si me caes bien, te presto un favor de los míos. Si no… igual aprenderás algo.' Sus anillos valen más que toda la mesa.",
      opciones: [
        { etiqueta: "Acepta su juego", item: "marcado", resultado: "Juegas suave, la dejas ganar lo justo. Madame ríe encantada y te desliza un par de dados marcados bajo la servilleta. 'Para el capo de turno, mi amor. Que sufra él.'" },
        { etiqueta: "Declina con clase", plata: 60, resultado: "Le besas la mano y declinas. 'Elegante el muchacho', ronronea, y te paga una propina sólo por el gesto. Guardas tu energía para la mesa de verdad." },
      ],
    },
    rivales: [
      { id: "r-madame", nombre: "Madame Ruiz", nivel: "experto", mesa: 6, esBoss: false, plata: 90,
        dialogos: d("Seis a la mesa, querido. Bienvenido a lo profundo: pocos llegan tan abajo.", "Tienes hambre de verdad. Me agrada… y me asusta.", "Lo profundo se traga a los ambiciosos, mi amor.") },
      { id: "r-turco", nombre: "El Turco Fino", nivel: "experto", mesa: 3, esBoss: false, plata: 105,
        dialogos: d("Traje y cachos: las dos cosas que nunca me quito.", "Me arrugaste el traje, desgraciado. Bien jugado.", "Elegancia, cabro. Eso es lo que te falta.") },
      { id: "r-comisario", nombre: "El Comisario", nivel: "experto", mesa: 4, esBoss: false, plata: 130,
        dialogos: d("De día persigo al hampa; de noche le gano la plata. Conozco todos sus trucos.", "Si fueras delincuente, serías el mejor. Lástima que eres honrado.", "Queda detenido… en el último puesto, cabro.") },
      { id: "b-senador", nombre: "El Senador", nivel: "experto", mesa: 4, esBoss: true, plata: 360, habilidad: DADO_CARGADO,
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
    dilema: {
      clave: "cumbre-oferta",
      titulo: "La oferta del Heredero",
      texto: "El Heredero te corta el paso antes del salón final. 'Mira, seamos claros: te doy la mitad de mi fortuna ahora mismo, en efectivo, y te devuelves al barro siendo rico. O entras ahí y el Rey te entierra. ¿Qué dice el forastero?'",
      opciones: [
        { etiqueta: "Escúpele la oferta", atributo: "ojo", resultado: "Le escupes a los pies. 'No vine por tu plata. Vine por el trono.' El Heredero palidece. Esa rabia fría te despierta cada sentido: nunca viste la mesa tan clara." },
        { etiqueta: "Ríete en su cara", atributo: "colmillo", resultado: "Te ríes hasta que se te saltan las lágrimas. El Heredero aprieta los puños, humillado. Leer el miedo ajeno —ese de él, justo ahora— te afila el colmillo como ninguna lección." },
      ],
    },
    rivales: [
      { id: "r-heredero", nombre: "El Heredero", nivel: "experto", mesa: 3, esBoss: false, plata: 150,
        dialogos: d("Mi padre era el segundo mejor de Chile. Yo voy a ser el primero.", "No… ese trono era mío por sangre.", "La sangre manda, advenedizo.") },
      { id: "r-jueza", nombre: "La Jueza", nivel: "experto", mesa: 2, esBoss: false, plata: 200,
        dialogos: d("He condenado a hombres por menos que tu ambición. A ver si me convences.", "Veredicto: culpable… de ser mejor que yo. Pasa.", "Sentencia firme: de vuelta al barro, sin apelación.") },
      { id: "b-rey", nombre: "El Rey del Cacho", nivel: "experto", mesa: 2, esBoss: true, plata: 1500, habilidad: OJO_HALCON,
        dialogos: d("Subiste desde el barro hasta mi mesa. Eso ya es leyenda. Pero la leyenda termina aquí, mano a mano.", "Treinta años… y un don nadie del puerto me destrona. El cacho es tuyo. Chile es tuyo.", "Yo SOY el cacho, muchacho. Vuelve al barro de donde saliste.") },
    ],
  },
];

// Relleno de las mesas grandes (parroquianos sin nombre propio).
const RELLENO = [
  "Un marinero", "El cojo de la esquina", "Una vieja del puerto", "El estibador", "Un comerciante",
  "El milico de civil", "La cantinera", "Un cargador", "El cura sin sotana", "Un cesante", "El prestamista", "Una dama de la noche",
  "El maquinista", "Un soldador", "La planchadora", "El sereno",
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

function inventarioLimpio(inv: Partial<Inventario> | undefined): Inventario {
  return { cargado: inv?.cargado ?? 0, marcado: inv?.marcado ?? 0, soplon: inv?.soplon ?? 0 };
}

// ---------------------------------------------------------------------------
// Estado de la campaña (persistible)
// ---------------------------------------------------------------------------

/** Versión del formato de la campaña.
 *  v2: se insertó La Maestranza en el índice 2.
 *  v3: exploración tipo mapa — se guarda qué rivales fueron derrotados. */
export const HISTORIA_VERSION = 3;

export interface EstadoHistoria {
  nombre: string;
  atributos: AtributosJugador;
  inventario: Inventario;
  plata: number;
  escenarioIdx: number;
  rivalIdx: number;
  completado: boolean;
  /** Para mostrar el prólogo sólo una vez. */
  prologoVisto?: boolean;
  /** Claves de dilemas ya resueltos (para no repetirlos). */
  dilemasResueltos: string[];
  /** Ids de rivales ya derrotados (exploración: el orden lo decide el mapa). */
  derrotados: string[];
  /** Premios de mapa ya reclamados (por id de entidad). */
  premiosReclamados: string[];
  /** Versión del formato (para migrar índices de escenario al crecer la campaña). */
  version?: number;
}

export function historiaNueva(nombre: string): EstadoHistoria {
  return {
    nombre: nombre.trim() || "Forastero",
    atributos: { ojo: 0, colmillo: 0, suerte: 0 },
    inventario: { cargado: 0, marcado: 0, soplon: 0 },
    plata: 0,
    escenarioIdx: 0,
    rivalIdx: 0,
    completado: false,
    prologoVisto: false,
    dilemasResueltos: [],
    derrotados: [],
    premiosReclamados: [],
    version: HISTORIA_VERSION,
  };
}

/** Sanea un estado cargado (migración de partidas viejas). */
export function normalizar(h: EstadoHistoria): EstadoHistoria {
  // Migración v1 → v2: La Maestranza se insertó en el índice 2, así que los
  // escenarios que estaban en 2,3,4 (Trastienda, Subterráneo, Cumbre) corrieron
  // a 3,4,5. Sin esto, una partida vieja en curso quedaría reubicada en el
  // capítulo equivocado. dilemasResueltos usa claves de texto, así que no se ven
  // afectados por el corrimiento.
  const ver = h.version ?? 1;
  let escenarioIdx = h.escenarioIdx;
  if (ver < 2 && escenarioIdx >= 2) escenarioIdx += 1;
  escenarioIdx = Math.max(0, Math.min(escenarioIdx, CAMPANA.length - 1));

  // Migración v2 → v3: el avance lineal (rivalIdx) pasa a "rivales derrotados".
  // Marcamos como vencidos a los rivales del escenario actual anteriores al
  // puntero, para que en el mapa aparezcan ya derrotados.
  let derrotados = Array.isArray(h.derrotados) ? h.derrotados : [];
  if (!Array.isArray(h.derrotados)) {
    const esc = CAMPANA[escenarioIdx]!;
    const tope = Math.max(0, Math.min(h.rivalIdx ?? 0, esc.rivales.length));
    derrotados = esc.rivales.slice(0, tope).map((r) => r.id);
  }

  return {
    ...h,
    escenarioIdx,
    atributos: atributosLimpios(h.atributos),
    inventario: inventarioLimpio(h.inventario),
    dilemasResueltos: Array.isArray(h.dilemasResueltos) ? h.dilemasResueltos : [],
    derrotados,
    premiosReclamados: Array.isArray(h.premiosReclamados) ? h.premiosReclamados : [],
    version: HISTORIA_VERSION,
  };
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

export type FaseHistoria =
  | "intro" // narrativa al entrar a un escenario
  | "explorar" // el mapa (vista cenital) del barrio
  | "reto" // ficha del rival antes de sentarse a la mesa
  | "dilema"
  | "mesa"
  | "victoria"
  | "derrota"
  | "tienda"
  | "final";

/** Ids de los rivales NO-boss de un escenario (los parroquianos). */
export function rivalesNoBoss(esc: Escenario): string[] {
  return esc.rivales.filter((r) => !r.esBoss).map((r) => r.id);
}
/** El boss del escenario (el último rival). */
export function bossDe(esc: Escenario): RivalHistoria {
  return esc.rivales[esc.rivales.length - 1]!;
}

export interface MejoraVista {
  clave: ClaveAtributo;
  nombre: string;
  desc: string;
  nivel: number;
  max: number;
  costo: number;
  alcanzable: boolean;
}

export interface ItemTiendaVista {
  id: ItemId;
  nombre: string;
  desc: string;
  costo: number;
  cantidad: number;
  max: number;
  alcanzable: boolean;
}

export interface ItemManoVista {
  id: ItemId;
  nombre: string;
  corto: string;
  desc: string;
  cantidad: number;
}

export interface DilemaVista {
  titulo: string;
  texto: string;
  opciones: { etiqueta: string }[];
  /** Si ya elegiste, el desenlace a mostrar (con un botón para seguir). */
  resultado: string | null;
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
  /** Atributos para subir en la tienda. */
  mejoras: MejoraVista[];
  /** Items que se pueden comprar en la tienda. */
  itemsTienda: ItemTiendaVista[];
  /** Items en tu poder, para usar en la mesa. */
  itemsEnMano: ItemManoVista[];
  /** Decisión de calle, si toca. */
  dilema: DilemaVista | null;
  /** Mapa del barrio (vista cenital), si estás explorando. */
  explorar: ExplorarVista | null;
}

// --- Vista del mapa (exploración cenital tipo "Game Boy") -------------------

export interface EntidadVista {
  id: string;
  tipo: "rival" | "tienda" | "dilema" | "puerta" | "letrero" | "premio";
  x: number;
  y: number;
  /** Para rivales: a quién enfrentas. */
  rivalId?: string;
  rivalNombre?: string;
  esBoss?: boolean;
  /** Estado visual del token. */
  estado: "activo" | "derrotado" | "bloqueado" | "abierto" | "reclamado";
  /** Texto corto bajo el token. */
  etiqueta?: string;
}

export interface ExplorarVista {
  titulo: string;
  /** Objetivo del barrio (qué hay que hacer para avanzar). */
  pista: string;
  ancho: number;
  alto: number;
  /** Grid de muros/piso ('#' y '.'). */
  filas: string[];
  jugador: { x: number; y: number; nombre: string };
  entidades: EntidadVista[];
  /** Aviso transitorio (requisito de una puerta, premio, etc.). */
  mensaje: string | null;
}
