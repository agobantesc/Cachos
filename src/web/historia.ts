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
  /** Narración del NARRADOR al presentar a este rival (antes de la mesa). */
  presentacion?: string;
  /** Narración del NARRADOR tras vencerlo (puente a lo que viene). Sólo no-boss;
   *  los jefes cierran con el epílogo del escenario. */
  relato?: string;
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

// --- Eventos entre mesas (decisiones, peleas, lecturas de suerte) -----------

/** Efecto de UNA mesa (la inmediatamente siguiente al evento). Reutiliza las
 *  trampas del motor: ventajas y desventajas que vienen de un evento. */
export type EfectoMesa =
  | "mano_cargada" // ventaja: tu mano sale concentrada
  | "suerte_extra" // ventaja: +1 Suerte
  | "rival_cargado" // desventaja: el rival juega con dados cargados
  | "sin_suerte"; // desventaja: entras nervioso, sin Suerte

/** Lo que entrega una opción de evento o una carta de lectura. */
export interface PremioEvento {
  /** Plata que ganas (o pierdes, si es negativa). */
  plata?: number;
  /** Item que te llevas. */
  item?: ItemId;
  /** Atributo que sube un nivel, gratis. */
  atributo?: ClaveAtributo;
  /** Ventaja/desventaja para la próxima mesa. */
  efecto?: EfectoMesa;
}

export interface OpcionDilema extends PremioEvento {
  etiqueta: string;
  /** Narración del desenlace de elegir esta opción. */
  resultado: string;
}

/** Una carta de la lectura de suerte: se da vuelta al elegirla. */
export interface CartaLectura extends PremioEvento {
  /** Nombre de la carta (se revela al darla vuelta). */
  nombre: string;
  resultado: string;
}

/** Un evento de calle entre mesas. */
export type Evento =
  | { tipo: "dilema" | "pelea"; clave: string; titulo: string; texto: string; opciones: OpcionDilema[] }
  | { tipo: "lectura"; clave: string; titulo: string; texto: string; cartas: CartaLectura[] };

export interface Escenario {
  clave: string;
  nombre: string;
  lugar: string;
  ambiente: string;
  /** Narración al entrar al escenario (antes del primer rival). */
  intro: string;
  /** Narración al caer el boss del escenario (antes de la tienda). */
  epilogo: string;
  /** Eventos de calle, cada uno antes de enfrentar al rival de ese índice. */
  eventos?: { antesDe: number; evento: Evento }[];
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
    epilogo: "La pocilga entera te mira distinto ahora. Doña Berta te sirve un trago de la casa, en silencio. Afuera, dos hombres arrastran un saco pesado hacia el muelle; nadie voltea a mirar. Diste el primer paso fuera del barro… y aquí el barro se traga a la gente entera.",
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "pocilga-cabro",
        titulo: "El cabro de la puerta",
        texto: "Un cabro chico, descalzo, te tira la manga. 'Tío, ¿le vigilo la puerta mientras juega? O si quiere… le consigo un dato de los que sirven.' Tiene cara de saber más de lo que aparenta, y un corte mal cosido en la ceja.",
        opciones: [
          { etiqueta: "Págale por vigilar", plata: 40, resultado: "El cabro se planta en la puerta como perro guardián. Nadie te molesta, y de paso te llena los bolsillos con lo que le sobra a la casa. Primera plata de la noche." },
          { etiqueta: "Mándalo por el dato", item: "soplon", resultado: "El cabro desaparece y vuelve con un soplón viejo que te susurra al oído cómo leer la mesa. 'Cuídese del que pierde y sonríe, tío.' Guárdate ese dato: vale más que la plata." },
        ],
      } },
    ],
    rivales: [
      { id: "r-pulga", nombre: "El Pulguita", nivel: "facil", mesa: 4, esBoss: false, plata: 20,
        presentacion: "El más chico de la mesa te mide con una sonrisa de dientes podridos. Por algo le dicen Pulguita: salta de mesa en mesa picando a los novatos.",
        relato: "El Pulguita se va rascándose el orgullo. En un rincón, alguien deja de reír: el forastero ganó la primera mano de la noche, y eso, en la pocilga, ya es noticia.",
        dialogos: d("¿Y este cabro nuevo? A la mesa, a ver si aguanta.", "…la cresta. Tuviste suerte, mocoso.", "Jajaja, ándate pa' la casa con tu mamá.") },
      { id: "r-roto", nombre: "Roto Manríquez", nivel: "facil", mesa: 2, esBoss: false, plata: 26,
        presentacion: "Un tipo curtido despeja la mesa de un manotazo. 'Tú y yo, sin público.' Roto Manríquez no pierde mano a mano desde que tiene memoria.",
        relato: "Roto se toma el resto de su trago de un sorbo y no dice nada. Dos seguidas. La pocilga empieza a mirarte como se mira a un problema.",
        dialogos: d("Tú y yo, mano a mano. Sin testigos.", "No puede ser… me ganó un pendejo.", "Otra cañita pa' celebrar tu paliza.") },
      { id: "r-cabrera", nombre: "La Cabrera", nivel: "medio", mesa: 3, esBoss: false, plata: 34,
        presentacion: "La Cabrera te clava los ojos desde el fondo. Dicen que huele la mentira antes de que la digas, y que nunca, nunca, paga de más.",
        relato: "La Cabrera se levanta sin reclamar. Antes de irse te suelta tres palabras que valen oro: 'Doña Berta supo.' La dueña de la pocilga ya tiene tu nombre.",
        dialogos: d("Tres en la mesa y dos van a llorar. Adivina cuáles.", "Mierda, el cabro tiene ojo. Anótenlo.", "Vuelve cuando sepas mentir, niño.") },
      { id: "b-berta", nombre: "Doña Berta", nivel: "medio", mesa: 3, esBoss: true, plata: 90, habilidad: SIN_CLEMENCIA,
        presentacion: "Al fondo, tras una cortina de humo, la mismísima Doña Berta acomoda su cacho. Treinta años reinando este chiquero. En su mesa no le gana nadie. Nadie.",
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
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "vega-billetera",
        titulo: "La billetera en el cajón",
        texto: "Moviendo un cajón de manzanas podridas encuentras una billetera gorda… y la mano fría del dueño todavía agarrada a ella, tiesa entre la fruta. Nadie va a reclamarla. Adentro hay un fajo que huele a plata grande.",
        opciones: [
          { etiqueta: "Quédatela", plata: 90, resultado: "Le sueltas los dedos al muerto y te embolsas el fajo sin pestañear. Plata es plata. Pero al levantar la vista, El Charqui te clava los ojos desde su puesto: vio todo, y no olvida." },
          { etiqueta: "Déjala donde está", atributo: "colmillo", resultado: "Le cierras la mano al finado sobre su plata y te persignas. El Carnicero, que miraba de lejos, asiente lento: nadie respeta a los muertos en La Vega. Te susurra, al pasar, un consejo para oler la mentira ajena. Vale más que el fajo." },
        ],
      } },
      { antesDe: 2, evento: {
        tipo: "lectura",
        clave: "vega-pitona",
        titulo: "La Pitona de los cajones",
        texto: "Una vieja ciega te agarra la muñeca con dedos de raíz. 'Te leo la suerte, mijo. Tres cartas. Elige una… pero cuidado: el destino acá no devuelve el vuelto.' Sus ojos blancos no te sueltan, y huele a flores de velorio.",
        cartas: [
          { nombre: "El Sol", efecto: "suerte_extra", resultado: "Sale El Sol. La vieja sonríe sin dientes. 'Andas con luz esta noche, mijo. La próxima mano te va a obedecer como perro.'" },
          { nombre: "El Ahorcado", plata: 70, resultado: "Sale El Ahorcado, colgando sobre el Mapocho. La vieja escupe al suelo. 'Plata vas a tener… pero a alguien le van a cobrar tu suerte, y no vas a ser tú.' Te deja unos billetes sucios en la mano." },
          { nombre: "La Mano Negra", efecto: "rival_cargado", resultado: "Sale La Mano Negra. La vieja te suelta de golpe, como quemada. 'Alguien te cargó los dados antes de que te sentaras, mijo. La próxima mesa viene torcida en tu contra. Reza.'" },
        ],
      } },
    ],
    rivales: [
      { id: "r-charqui", nombre: "El Charqui", nivel: "medio", mesa: 5, esBoss: false, plata: 32,
        presentacion: "Entre cajones de fruta podrida, El Charqui reparte mesa para cinco. 'Esto no es el puerto, cabro.' Aquí ya se juega con plata que mancha.",
        relato: "El Charqui te reconoce con un gesto seco. La Vega de noche es chica para los secretos: para cuando llegues a la próxima mesa, ya sabrán que vienes ganando.",
        dialogos: d("Cinco en la mesa, cabro. Esto no es el puerto.", "Mierda. Tienes algo, lo reconozco.", "Vuelve a tu caleta, esto te queda grande.") },
      { id: "r-quintrala", nombre: "La Quintrala", nivel: "medio", mesa: 2, esBoss: false, plata: 38,
        presentacion: "La Quintrala te sienta a su lado con una sonrisa que corta. Mano a mano. Lindo cachito el tuyo… sería una pena perderlo con ella.",
        relato: "La Quintrala recoge sus anillos y se va sin mirar atrás. Te queda su perfume y una certeza: en La Vega, los que sonríen son los que más muerden.",
        dialogos: d("Lindo cachito… sería una pena que lo perdieras conmigo.", "Maldito seas. Nadie me lee la mano así.", "Te lo dije, lindo. Esto era mío.") },
      { id: "r-sapo", nombre: "Sapo Reyes", nivel: "avanzado", mesa: 4, esBoss: false, plata: 48,
        presentacion: "Sapo Reyes le cuenta todo al jefe. Hoy te toca a ti ser su informe. 'De ti todavía no tengo nada bueno', dice, afilando el lápiz.",
        relato: "El Sapo se va a cantar lo que vio. Y lo que vio fue una paliza. Al fondo del matadero, El Carnicero deja de filetear un segundo para escuchar tu nombre.",
        dialogos: d("Yo le cuento todo al jefe. Y de ti… todavía no tengo nada bueno.", "Ya, ya. Le voy a decir que tenga cuidado contigo.", "El sapo siempre canta primero, cabro.") },
      { id: "b-carnicero", nombre: "El Carnicero", nivel: "avanzado", mesa: 4, esBoss: true, plata: 150, habilidad: SANGRE_FACIL,
        presentacion: "El olor a sangre se hace más fuerte. El Carnicero limpia su cuchillo en el delantal y te corre la silla. 'Despreso vacas y ambiciosos por igual.'",
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
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "maestranza-perro",
        titulo: "El quiltro entre los fierros",
        texto: "Un perro flaco, todo costilla, se acerca olfateando tu bolsillo. Trae el lomo pelado y, en el hocico, sangre que no es suya. En la Maestranza dicen que el que adopta a un quiltro de acá, adopta su suerte… y sus muertos.",
        opciones: [
          { etiqueta: "Dale tu pan", atributo: "suerte", resultado: "Partes tu marraqueta y se la das. El quiltro te sigue toda la noche y se echa bajo tu silla, gruñendo a las sombras. Los viejos asienten: ahora andas con suerte de la buena." },
          { etiqueta: "Sigue de largo", plata: 50, resultado: "No estás para regalar pan. El perro se va a olfatear un bulto tirado junto a los rieles que más vale no mirar. Te guardas tu marraqueta y lo que ibas a gastar en tonteras: la plata pesa más que la pena." },
        ],
      } },
      { antesDe: 1, evento: {
        tipo: "pelea",
        clave: "maestranza-bronca",
        titulo: "Bronca en los fierros",
        texto: "Un soldador borracho te acusa de hacerle trampa en la mano anterior. Saca una cuchilla oxidada y la clava en la mesa, a un dedo de tus dados. El galpón se queda mudo. Acá las broncas no terminan con palabras; terminan en el saco de género.",
        opciones: [
          { etiqueta: "Rómpele la mano", efecto: "mano_cargada", resultado: "Le agarras la muñeca y la doblas hasta que algo cruje seco. El cuchillo cae. Nadie más te va a mirar feo esta noche. Te sientas a la próxima mesa con la sangre caliente y el pulso firme." },
          { etiqueta: "Cómprale el silencio", plata: -60, resultado: "Le tiras unos billetes a la cara. El borracho los recoge del suelo, humillado, y se va mascullando una amenaza. Compraste paz… por ahora. En la Maestranza todo se cobra dos veces." },
          { etiqueta: "Échale al Fundidor encima", item: "marcado", resultado: "Le murmuras al Fundidor que el borracho habló mal de él. Vuelan fierros. Cuando se asienta la polvareda, hay uno que no se levanta y nadie se agacha a ver. En el desorden te guardas unos dados marcados de la mesa." },
        ],
      } },
    ],
    rivales: [
      { id: "r-fundidor", nombre: "El Fundidor", nivel: "avanzado", mesa: 5, esBoss: false, plata: 60,
        presentacion: "El calor del galpón te golpea antes que él. El Fundidor reparte para cinco entre chispas de soldadura. 'Aquí fundimos fierro… y novatos.'",
        relato: "El Fundidor apaga su soplete. 'No te derretiste', gruñe, casi con respeto. En la Maestranza, eso ya es un diploma.",
        dialogos: d("Aquí fundimos fierro… y novatos. Cinco a la mesa, aguanta el calor.", "Te saliste del molde, cabro. No me pasa seguido.", "Al horno con él. Que se derrita solo.") },
      { id: "r-trenza", nombre: "La Trenza", nivel: "avanzado", mesa: 3, esBoss: false, plata: 66,
        presentacion: "La Trenza manejó locomotoras toda su vida. Ahora maneja mentiras desde una silla de fierro. 'Las dos te aplastan igual.'",
        relato: "La Trenza te deja pasar entre los rieles muertos. 'Cuídate del Verdugo', murmura bajito. 'Ese no juega: ejecuta.'",
        dialogos: d("Manejé locomotoras y manejo mentiras. Las dos te aplastan igual.", "Me descarrilaste, desgraciado. Bien jugado.", "Quítenlo de la vía, que viene el tren.") },
      { id: "r-mecha", nombre: "Mecha Corta", nivel: "experto", mesa: 4, esBoss: false, plata: 80,
        presentacion: "Mecha Corta golpetea la mesa con los dedos. Le dicen así por algo: tienes una mano para ganarle, o estalla.",
        relato: "Mecha aguanta el bufido y, por una vez, no explota. 'Pasa nomás.' Al fondo del galpón, una sombra enorme deja un saco de género sobre la mesa.",
        dialogos: d("Tengo la paciencia justa para una mano. Apúrate o exploto.", "…contuviste la mecha. Pocos lo logran.", "Bum. Te dije que tenía la mecha corta, cabro.") },
      { id: "b-verdugo", nombre: "El Verdugo", nivel: "experto", mesa: 4, esBoss: true, plata: 220, habilidad: SIN_COMODIN,
        presentacion: "Una mole de hombre desata el saco: adentro, un cacho gastado por mil ejecuciones. 'En mi mesa el as no salva a nadie.' El Verdugo no parpadea.",
        dialogos: d("En mi mesa el as no salva a nadie. Aquí la pinta vale lo que es, igual que la gente.", "Sin comodines me ganaste. Eso… eso es de los grandes. Baja, te están esperando.", "Sin comodines no eres nada, cabro. Como casi todos.") },
    ],
  },
  {
    clave: "trastienda",
    nombre: "La Trastienda",
    lugar: "Tras una botillería en San Diego",
    ambiente: "Humo de cigarro barato y deudas que se pagan con sangre.",
    intro: "Bajaste por los rieles hasta una trastienda. Un foco amarillo cuelga sobre el paño verde y aquí ya nadie juega por plata: se juega por respeto, y a veces por la vida.",
    epilogo: "El Croata apaga su cigarro en el dorso de su propia mano, sin pestañear. 'Pocos me hacen sudar. El último fue hace diez años; lo sacaron del Mapocho en pedazos.' Te abre la puerta a lo más profundo. Del otro lado, todo es más oscuro.",
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "trastienda-prestamo",
        titulo: "El adelanto del Notario",
        texto: "El Notario te corre la silla antes de empezar. 'Joven, le adelanto un fajo contra sus ganancias de hoy. Firme aquí y juega tranquilo… o no firme nada, y siga debiéndose sólo a usted mismo.' La lapicera brilla más que su sonrisa, y la última firma de su libreta está tachada con una cruz.",
        opciones: [
          { etiqueta: "Firma el adelanto", plata: 120, resultado: "Firmas sin leer la letra chica —nunca hay que leerla— y te embolsas el fajo. Plata fresca para la mesa. La deuda, como todo aquí, ya verás con qué se paga." },
          { etiqueta: "No le debas a nadie", atributo: "ojo", resultado: "Le devuelves la lapicera sin firmar. El Notario sonríe de verdad por una vez: 'Hombre libre. Qué raro ver uno con vida.' Jugar sin deuda encima te aclara la vista como nada." },
        ],
      } },
      { antesDe: 2, evento: {
        tipo: "pelea",
        clave: "trastienda-cobrador",
        titulo: "El cobrador",
        texto: "Un grandote con cara de cicatrices te corta el paso en el callejón. 'El que jugó antes que tú me debía plata, y se borró… abajo del puente. Alguien va a pagar esa deuda esta noche.' Sus nudillos truenan. La trastienda mira para otro lado, como siempre.",
        opciones: [
          { etiqueta: "Encáralo a combos", plata: 90, efecto: "sin_suerte", resultado: "Le sostienes la mirada y le caes encima. Sales del callejón con su fajo en el bolsillo y una costilla rota: la próxima mano la juegas con el cuerpo molido y el aire cortado." },
          { etiqueta: "Paga la deuda del muerto", plata: -80, resultado: "Pagas lo que debía un finado, sólo para que te suelten. El cobrador cuenta los billetes y asiente. 'Hombre práctico.' Te deja pasar limpio, sin un rasguño, listo para la mesa." },
          { etiqueta: "Señálale a otro", item: "soplon", resultado: "Le apuntas a un borracho que dormita en un rincón. El cobrador te cree. Lo último que ves al entrar es al pobre diablo arrastrado hacia el puente. No preguntes qué pasó después; te quedas con el dato que el borracho ya no va a usar." },
        ],
      } },
    ],
    rivales: [
      { id: "r-notario", nombre: "El Notario", nivel: "avanzado", mesa: 3, esBoss: false, plata: 70,
        presentacion: "Bajo el foco amarillo, El Notario anota cada jugada en una libreta grasienta. 'Todo queda registrado, joven. Hasta su derrota de hoy.'",
        relato: "El Notario cierra su libreta. 'Que conste en acta', suspira. Tu nombre ya está escrito en la trastienda, y de ahí no se borra fácil.",
        dialogos: d("Todo queda registrado, joven. Hasta su derrota de hoy.", "Objeto… objeto, pero perdí. Que conste en acta.", "Caso cerrado. El siguiente.") },
      { id: "r-pituto", nombre: "Pituto", nivel: "avanzado", mesa: 4, esBoss: false, plata: 78,
        presentacion: "Pituto conoce a todos los que mandan. A ti no te conoce… todavía. Te da la mano blanda y los ojos duros.",
        relato: "Pituto te guarda en su memoria de elefante. 'Ahora sí te tengo en el radar.' Que Pituto ande pendiente de ti puede salvarte la vida… o costártela.",
        dialogos: d("Yo conozco a todos los que mandan. A ti no te conozco… todavía.", "Ya te tengo en el radar ahora, cabro.", "Nadie va a recordar tu nombre.") },
      { id: "r-viuda", nombre: "La Viuda Alegre", nivel: "experto", mesa: 3, esBoss: false, plata: 95,
        presentacion: "La Viuda Alegre enterró a tres maridos en esta misma mesa. Te corre la silla con una sonrisa negra. 'Hay sitio, lindo.'",
        relato: "La Viuda te despide con un beso al aire. 'Otro luto para mi colección.' Tras el humo, El Croata apaga su cigarro: llegó tu turno con el hielo.",
        dialogos: d("Enterré a tres maridos jugando al cacho. Siéntate, lindo, hay sitio.", "Me dejas viuda otra vez… de mi invicto. Qué hombre.", "Otro luto más para mi colección, mijito.") },
      { id: "b-croata", nombre: "El Croata", nivel: "experto", mesa: 2, esBoss: true, plata: 260, habilidad: TEMPANO,
        presentacion: "El Croata no te mira: te calcula. Frío como témpano, lleva cuenta de cada gesto tuyo. 'Veamos cuál pesa más: tu ojo o mi paciencia.'",
        dialogos: d("Dicen que tienes ojo. Yo tengo paciencia de hielo. Mano a mano: veamos cuál pesa más.", "Frío como soy, esto me hierve la sangre. Buen juego, forastero.", "Tu cara te delató tres manos atrás. Aprende a mentir.") },
    ],
  },
  {
    clave: "club",
    nombre: "El Subterráneo",
    lugar: "Club clandestino bajo el río",
    ambiente: "Terciopelo gastado y armas bajo la mesa.",
    intro: "Para entrar pagaste con favores; para salir, hay que ganar. Aquí nadie pregunta nombres y todos tienen algo que esconder. Estás en lo profundo, y lo profundo se traga a los ambiciosos.",
    epilogo: "El Senador se va sin pagar, claro, pero todos lo vieron caer. Antes de cruzar la puerta te deja una promesa con voz de terciopelo: 'Esto no te lo perdono ni muerto, cabro.' La noticia, igual, ya va subiendo… hasta la cumbre.",
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "club-madame",
        titulo: "La mano privada de Madame Ruiz",
        texto: "Madame Ruiz te aparta a un reservado de terciopelo manchado. 'Antes del circo, una manito entre tú y yo, querido. Si me caes bien, te presto un favor de los míos. Si no… igual aprenderás algo.' Sus anillos valen más que toda la mesa; uno lleva grabada una inicial que no es la suya.",
        opciones: [
          { etiqueta: "Acepta su juego", item: "marcado", resultado: "Juegas suave, la dejas ganar lo justo. Madame ríe encantada y te desliza un par de dados marcados bajo la servilleta. 'Para el capo de turno, mi amor. Que sufra él, como sufrieron otros.'" },
          { etiqueta: "Declina con clase", plata: 60, resultado: "Le besas la mano y declinas. 'Elegante el muchacho', ronronea, y te paga una propina sólo por el gesto. Guardas tu energía para la mesa de verdad." },
        ],
      } },
      { antesDe: 2, evento: {
        tipo: "lectura",
        clave: "club-tarot",
        titulo: "Las cartas de Madame",
        texto: "En el reservado, Madame baraja un mazo de tarot con uñas rojas como sangre fresca. 'Antes de seguir bajando, querido, deja que las cartas te digan cómo termina esto. Elige una. Lo que salga, salió: aquí abajo el destino se cumple sí o sí.'",
        cartas: [
          { nombre: "La Estrella", efecto: "suerte_extra", resultado: "La Estrella. Madame ronronea, complacida. 'El destino te debe una, mi amor. Cóbrasela en la próxima mano, sin pena.'" },
          { nombre: "El Diablo", item: "cargado", resultado: "El Diablo, riéndose desde la carta. Madame se persigna con la mano de los anillos. 'Vas a ganar… pero algo se te va a pedir a cambio, más arriba.' Te desliza un cacho cargado bajo la mesa, como anticipo del pacto." },
          { nombre: "La Torre", efecto: "rival_cargado", resultado: "La Torre, cayéndose en llamas con dos cuerpos despeñados. Madame frunce el ceño. 'El de abajo te espera con todo comprado, hasta los dados. La próxima mesa viene torcida. Cuídate, lindo.'" },
        ],
      } },
    ],
    rivales: [
      { id: "r-madame", nombre: "Madame Ruiz", nivel: "experto", mesa: 6, esBoss: false, plata: 90,
        presentacion: "Terciopelo gastado y seis sillas. Madame Ruiz preside lo profundo con anillos que valen más que toda la mesa. 'Pocos llegan tan abajo, querido.'",
        relato: "Madame Ruiz aplaude bajito, encantada. 'Tienes hambre de verdad', ronronea. 'Eso aquí se huele… y atrae a las fieras grandes.'",
        dialogos: d("Seis a la mesa, querido. Bienvenido a lo profundo: pocos llegan tan abajo.", "Tienes hambre de verdad. Me agrada… y me asusta.", "Lo profundo se traga a los ambiciosos, mi amor.") },
      { id: "r-turco", nombre: "El Turco Fino", nivel: "experto", mesa: 3, esBoss: false, plata: 105,
        presentacion: "El Turco Fino no se quita el traje ni los cachos. Elegancia hasta para robarte. 'Las dos cosas que nunca suelto.'",
        relato: "El Turco se sacude una arruga invisible. 'Me ganaste limpio, cabro.' Viniendo de un tramposo de seda, es casi un honor.",
        dialogos: d("Traje y cachos: las dos cosas que nunca me quito.", "Me arrugaste el traje, desgraciado. Bien jugado.", "Elegancia, cabro. Eso es lo que te falta.") },
      { id: "r-comisario", nombre: "El Comisario", nivel: "experto", mesa: 4, esBoss: false, plata: 130,
        presentacion: "De civil, pero huele a placa a un metro. El Comisario persigue al hampa de día y le gana la plata de noche. 'Conozco todos sus trucos.'",
        relato: "El Comisario te deja libre 'por esta vez'. Antes de irse, baja la voz: 'El Senador hace trampa y tiene comprado a medio Chile. Arriba ya no hay reglas.'",
        dialogos: d("De día persigo al hampa; de noche le gano la plata. Conozco todos sus trucos.", "Si fueras delincuente, serías el mejor. Lástima que eres honrado.", "Queda detenido… en el último puesto, cabro.") },
      { id: "b-senador", nombre: "El Senador", nivel: "experto", mesa: 4, esBoss: true, plata: 360, habilidad: DADO_CARGADO,
        presentacion: "El Senador llega tarde, como los que mandan. Se sienta sin saludar. 'Yo hago las leyes de esta mesa, muchacho. Y la primera es que yo gano.'",
        dialogos: d("Yo hago las leyes de esta mesa, muchacho. Y la primera es que yo gano.", "Esto… esto no se compra. Maldito talento. Te van a estar esperando arriba.", "El poder no se reparte, se quita. Y a ti te lo acabo de quitar.") },
    ],
  },
  {
    clave: "cumbre",
    nombre: "La Cumbre",
    lugar: "Penthouse, lo más alto de Santiago",
    ambiente: "Desde este ventanal se ve todo Chile encendido.",
    intro: "Llegaste desde el último muelle hasta el cielo. Abajo, toda la ciudad. Arriba, nada. Sólo queda un nombre por borrar del mapa, y te está esperando con una sonrisa de treinta años.",
    epilogo: "El Rey deja su cacho sobre el paño con manos que, por primera vez en treinta años, le tiemblan. Afuera, el Mapocho se lleva en silencio a todos los que apostaron antes que tú y perdieron; esta noche, por fin, el río pasa de largo. Subiste desde un saco de pescado podrido hasta el cielo de Santiago, dejando una estela de tahúres caídos, y nadie —nadie— quedó por encima de tu nombre. El cacho, al fin, tiene un dueño nuevo. Duerme con un ojo abierto: el trono se gana una vez, pero se defiende toda la vida.",
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "cumbre-oferta",
        titulo: "La oferta del Heredero",
        texto: "El Heredero te corta el paso antes del salón final. 'Mira, seamos claros: te doy la mitad de mi fortuna ahora mismo, en efectivo, y te devuelves al barro siendo rico. O entras ahí y el Rey te entierra junto a todos los que lo intentaron —y son hartos, mira el ventanal.' Afuera, el río brilla negro.",
        opciones: [
          { etiqueta: "Escúpele la oferta", atributo: "ojo", resultado: "Le escupes a los pies. 'No vine por tu plata. Vine por el trono.' El Heredero palidece. Esa rabia fría te despierta cada sentido: nunca viste la mesa tan clara." },
          { etiqueta: "Ríete en su cara", atributo: "colmillo", resultado: "Te ríes hasta que se te saltan las lágrimas. El Heredero aprieta los puños, humillado. Leer el miedo ajeno —ese de él, justo ahora— te afila el colmillo como ninguna lección." },
        ],
      } },
    ],
    rivales: [
      { id: "r-heredero", nombre: "El Heredero", nivel: "experto", mesa: 3, esBoss: false, plata: 150,
        presentacion: "El penthouse huele a dinero viejo. El Heredero te recibe con desprecio de cuna. 'Mi padre fue el segundo mejor de Chile. Yo seré el primero.'",
        relato: "El Heredero se hunde en su sillón de cuero. La sangre no le alcanzó. Una puerta doble se abre al fondo: del otro lado espera la Jueza, y después… el trono.",
        dialogos: d("Mi padre era el segundo mejor de Chile. Yo voy a ser el primero.", "No… ese trono era mío por sangre.", "La sangre manda, advenedizo.") },
      { id: "r-jueza", nombre: "La Jueza", nivel: "experto", mesa: 2, esBoss: false, plata: 200,
        presentacion: "La Jueza condenó a hombres por menos que tu ambición. Te mira por encima de sus lentes. 'A ver si me convences, forastero.'",
        relato: "La Jueza dicta su último veredicto de la noche: 'Culpable… de ser mejor que yo. Pasa.' Se hace un silencio. Tras la última puerta, treinta años de leyenda te esperan.",
        dialogos: d("He condenado a hombres por menos que tu ambición. A ver si me convences.", "Veredicto: culpable… de ser mejor que yo. Pasa.", "Sentencia firme: de vuelta al barro, sin apelación.") },
      { id: "b-rey", nombre: "El Rey del Cacho", nivel: "experto", mesa: 2, esBoss: true, plata: 1500, habilidad: OJO_HALCON,
        presentacion: "Treinta años invicto, sentado contra el ventanal con todo Chile a sus pies. El Rey del Cacho sonríe como quien ya ganó. 'La leyenda termina aquí, mano a mano.'",
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

/** Versión del formato de la campaña. v2 insertó La Maestranza en el índice 2. */
export const HISTORIA_VERSION = 2;

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
  /** Claves de eventos ya resueltos (dilemas, peleas, lecturas — no se repiten). */
  dilemasResueltos: string[];
  /** Ventaja/desventaja para la PRÓXIMA mesa (de una lectura o pelea). */
  efectoPendiente?: EfectoMesa | null;
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

  return {
    ...h,
    escenarioIdx,
    atributos: atributosLimpios(h.atributos),
    inventario: inventarioLimpio(h.inventario),
    dilemasResueltos: Array.isArray(h.dilemasResueltos) ? h.dilemasResueltos : [],
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

/** El evento de calle que toca antes del rival actual (si hay y sin resolver). */
export function eventoActual(h: EstadoHistoria): Evento | null {
  const esc = escenarioActual(h);
  for (const e of esc.eventos ?? []) {
    if (e.antesDe === h.rivalIdx && !h.dilemasResueltos.includes(e.evento.clave)) return e.evento;
  }
  return null;
}

/** Etiqueta humana de un efecto de mesa (para la UI). */
export function etiquetaEfecto(ef: EfectoMesa): { titulo: string; bueno: boolean } {
  switch (ef) {
    case "mano_cargada":
      return { titulo: "Ventaja · tu próxima mano sale cargada", bueno: true };
    case "suerte_extra":
      return { titulo: "Ventaja · +1 Suerte para la próxima mesa", bueno: true };
    case "rival_cargado":
      return { titulo: "Desventaja · el rival jugará con dados cargados", bueno: false };
    case "sin_suerte":
      return { titulo: "Desventaja · entras nervioso: sin Suerte", bueno: false };
  }
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

export type FaseHistoria = "intro" | "evento" | "mesa" | "victoria" | "derrota" | "tienda" | "final";

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

/** Una carta de lectura, como la ve la UI. */
export interface CartaVista {
  /** Boca abajo hasta darla vuelta. */
  volteada: boolean;
  /** Nombre, sólo si está volteada. */
  nombre: string | null;
  /** true si fue la elegida. */
  elegida: boolean;
}

export interface EventoVista {
  tipo: "dilema" | "pelea" | "lectura";
  titulo: string;
  texto: string;
  /** Opciones (dilema/pelea). */
  opciones: { etiqueta: string }[];
  /** Cartas (lectura). */
  cartas: CartaVista[];
  /** Desenlace tras elegir/dar vuelta (con botón para seguir). */
  resultado: string | null;
  /** Efecto otorgado por el desenlace (ventaja/desventaja), si hubo. */
  efecto: { titulo: string; bueno: boolean } | null;
}

export interface VistaHistoria {
  faseHistoria: FaseHistoria;
  nombreJugador: string;
  plata: number;
  atributos: AtributosJugador;
  escenario: { nombre: string; lugar: string; ambiente: string; idx: number; total: number };
  /** Narración del narrador. prologo: 1ª vez. intro: al entrar al escenario.
   *  presentacion: al presentar al rival (antes de la mesa). relato: tras vencer
   *  a un rival (puente a lo que viene). epilogo: al caer el jefe. */
  narrativa: {
    prologo: string | null;
    intro: string | null;
    presentacion: string | null;
    relato: string | null;
    epilogo: string | null;
  };
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
  /** Evento de calle (decisión, pelea o lectura de suerte), si toca. */
  evento: EventoVista | null;
}
