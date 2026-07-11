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

const NIVELES: Nivel[] = ["facil", "medio", "avanzado", "experto", "brutal"];
/** Un escalón más blando (para el relleno de las mesas grandes). */
function nivelMenos(n: Nivel): Nivel {
  return NIVELES[Math.max(0, NIVELES.indexOf(n) - 1)]!;
}
/** N escalones más duro (Nueva Partida+: la Leyenda endurece a todos). */
function nivelMas(n: Nivel, pasos: number): Nivel {
  return NIVELES[Math.min(NIVELES.length - 1, NIVELES.indexOf(n) + pasos)]!;
}

/** Un pasaje narrativo: su estampa y su texto. Se usa para los epílogos de
 *  los finales, las cinemáticas de entrada de los jefes y el cierre de
 *  capítulo — cualquier momento que se cuenta en varios pasajes. */
export interface FinalBeat {
  escena: string;
  texto: string;
}

/** Un pasaje EN CURSO, tal como lo ve la UI: su índice, el total de la
 *  secuencia y si es el último (para cambiar el botón de "Seguir" a lo
 *  que corresponda cerrar esa pantalla). */
export interface BeatVista {
  idx: number;
  total: number;
  escena: string;
  texto: string;
  esUltimo: boolean;
}

// ---------------------------------------------------------------------------
// Habilidades de los bosses (vía reglas / trampa — nunca cachos de más)
// ---------------------------------------------------------------------------

export interface HabilidadBoss {
  nombre: string;
  desc: string;
  /** Reglas de la casa que rigen SU mesa. */
  reglas?: Partial<ReglasCasa>;
  /** Hace trampa: re-carga su mano cada ronda buscando concentración. El
   *  número es cuántas tiradas prueba antes de quedarse con la mejor (más
   *  alto = trampa más burda y más ventaja). */
  dadoCargado?: number;
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
  desc: "Frío como el hielo: te lee los faroles antes de que termines de mentir. No hace trampa; no la necesita.",
};
const DADO_CARGADO: HabilidadBoss = {
  nombre: "Dado cargado",
  desc: "Hace trampa: tiene comprado hasta los dados, y casi siempre le favorecen.",
  dadoCargado: 8,
};
const OJO_HALCON: HabilidadBoss = {
  nombre: "Ojo de halcón",
  desc: "El mejor de Chile en treinta años: te lee el farol antes de que lo termines, y por si fuera poco, juega con los dados comprados.",
  dadoCargado: 10,
};

// --- Reglas de mesa (mesas comunes con reglas propias — no sólo los jefes) ---
const CALZO_SECO: HabilidadBoss = {
  nombre: "Calzo seco",
  desc: "En su mesa, calzar no devuelve dados: lo jugado, jugado está.",
  reglas: { calzarRecuperaDado: false },
};
const POLVORA: HabilidadBoss = {
  nombre: "Pólvora",
  desc: "Dudar al que abre y perder aquí vuela 3 dados de una.",
  reglas: { sicilianaDadosPerdidos: 3 },
};
const SIN_VELORIO: HabilidadBoss = {
  nombre: "Sin velorio",
  desc: "Aquí no hay ronda de obligado: al moribundo no se le hacen honores.",
  reglas: { obligadoActivo: false },
};
const LEY_SECA: HabilidadBoss = {
  nombre: "Ley seca",
  desc: "El Comisario no permite calzar: o apuestas, o dudas.",
  reglas: { calzarPermitido: false },
};
const SIN_ATENUANTES: HabilidadBoss = {
  nombre: "Sin atenuantes",
  desc: "En su tribunal el as no es comodín: cada pinta responde por sí sola.",
  reglas: { asComodin: false },
};
const CALZO_LIBRE: HabilidadBoss = {
  nombre: "Calzo libre",
  desc: "En su mesa se puede calzar desde la primera mano, sin esperar a que se vacíe.",
  reglas: { calzarSoloConMitadDeDados: false },
};
const LETRA_CHICA: HabilidadBoss = {
  nombre: "Letra chica",
  desc: "Nada de sicilianas: toda duda cuesta un dado, como manda el contrato.",
  reglas: { sicilianaActiva: false },
};
const CARTAS_VISTAS: HabilidadBoss = {
  nombre: "Cartas sobre la mesa",
  desc: "El obligado se juega abierto: todos ven todos los dados. Aquí nadie se esconde.",
  reglas: { obligadoCerradoParaOtros: false },
};
const CORTESIA: HabilidadBoss = {
  nombre: "Cortesía de la casa",
  desc: "Hasta en el obligado el as sigue de comodín. Elegancia ante todo.",
  reglas: { obligadoAsesNoComodin: false },
};
const SOPLADO: HabilidadBoss = {
  nombre: "Soplado",
  desc: "Dicen que le soplan los dados: su mano llega demasiado buena, demasiado seguido.",
  dadoCargado: 5,
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
  /** Cinemática de entrada (3 pasajes: plano general, medio y primer plano). Sólo bosses. */
  cinematica?: FinalBeat[];
  /** Frases del jefe DURANTE la mesa (bocadillos por gatillo). Sólo bosses. */
  frases?: FrasesMesa;
}

/** Lo que un jefe comenta en caliente, según lo que pasó en la ronda. */
export interface FrasesMesa {
  /** Te ganó una ronda (perdiste dados). */
  caza: string;
  /** Le ganaste una ronda (perdió un dado). */
  cae: string;
  /** Cayó la siciliana en su mesa. */
  siciliana: string;
  /** Quedaste con tu último dado. */
  alFilo: string;
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
  /** Marca que queda en tu historial: cambia el rumbo de eventos futuros. */
  marca?: string;
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

/** Un evento agendado: aparece antes del rival `antesDe`, quizá condicionado a
 *  una MARCA previa (así una decisión de antes cambia lo que viene después). */
export interface EventoProgramado {
  antesDe: number;
  evento: Evento;
  /** Sólo aparece si llevas esta marca (una consecuencia de tu pasado). */
  requiere?: string;
  /** No aparece si llevas esta marca. */
  vetadoPor?: string;
}

/** Un SECRETO del barrio: un candado que se abre marcando la cifra correcta
 *  en tres dados. Las pistas viven en la propia historia (personajes, reglas,
 *  detalles que el jugador atento ya conoce). Es opcional y se puede volver. */
export interface Acertijo {
  clave: string;
  titulo: string;
  /** El acertijo en sí (las tres pistas, en orden). */
  texto: string;
  /** La cifra correcta (tres pintas, en orden). */
  solucion: [number, number, number];
  /** Burla al fallar (sin castigo: se puede volver a intentar). */
  fallo: string;
  /** Narración + premio al abrirlo. */
  desenlace: string;
  premio: PremioEvento;
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
  /** Pasajes previos al epílogo (la caída del jefe, antes del texto de cierre). */
  epilogoBeats?: FinalBeat[];
  /** Eventos de calle (decisiones, peleas, lecturas y consecuencias). */
  eventos?: EventoProgramado[];
  /** Secreto del barrio (candado de cifra), si lo hay. */
  acertijo?: Acertijo;
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
    epilogoBeats: [
      { escena: "caida-pocilga", texto: "El cacho se le escapa de la mano y rebota sobre la madera pegajosa. Por un segundo, nadie en la pocilga respira. Treinta años de reinado se le caen a Doña Berta de encima como un abrigo viejo." },
      { escena: "secuela-pocilga", texto: "Alguien corre hacia la puerta antes de que termines de recoger tu plata: la noticia ya va calle arriba. En la pocilga del puerto, esta noche, nació algo que todavía no tiene nombre." },
    ],
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "pocilga-cabro",
        titulo: "El cabro de la puerta",
        texto: "Un cabro chico, descalzo, te tira la manga. 'Tío, ¿le vigilo la puerta mientras juega? O si quiere… le consigo un dato de los que sirven.' Tiene cara de saber más de lo que aparenta, y un corte mal cosido en la ceja.",
        opciones: [
          { etiqueta: "Págale por vigilar", plata: 40, marca: "cabro", resultado: "El cabro se planta en la puerta como perro guardián. Nadie te molesta, y de paso te llena los bolsillos con lo que le sobra a la casa. Primera plata de la noche. Al irte, te sigue media cuadra: te eligió, aunque tú no lo sepas todavía." },
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
      { id: "r-cabrera", nombre: "La Cabrera", nivel: "medio", mesa: 3, esBoss: false, plata: 34, habilidad: CALZO_LIBRE,
        presentacion: "La Cabrera te clava los ojos desde el fondo. Dicen que huele la mentira antes de que la digas, y que nunca, nunca, paga de más.",
        relato: "La Cabrera se levanta sin reclamar. Antes de irse te suelta tres palabras que valen oro: 'Doña Berta supo.' La dueña de la pocilga ya tiene tu nombre.",
        dialogos: d("Tres en la mesa y dos van a llorar. Adivina cuáles.", "Mierda, el cabro tiene ojo. Anótenlo.", "Vuelve cuando sepas mentir, niño.") },
      { id: "b-berta", nombre: "Doña Berta", nivel: "medio", mesa: 3, esBoss: true, plata: 90, habilidad: SIN_CLEMENCIA,
        cinematica: [
          { escena: "cap-muelle", texto: "Tres mesas caíste ganando, y la pocilga entera lo sabe. Los parroquianos se corren para dejarte paso hacia el fondo, donde el humo es más espeso y las apuestas dejan de ser un juego. Ahí, tras la cortina, alguien lleva treinta años sin perder." },
          { escena: "jefe-berta", texto: "Doña Berta no levanta la vista de su cacho. Frente a ella, tres vasos vacíos alineados en el borde de la mesa: trofeos, no adornos. Cuando por fin te mira, sonríe como quien ya contó tus dientes. 'Siéntate, mijito. Vamos a ver de qué estás hecho.'" },
          { escena: "retrato-berta", texto: "De cerca, Doña Berta huele a humo de treinta años y a vino derramado. Se prende un cigarrillo sin apuro, te mira por encima de la brasa y empuja el cacho hacia ti. 'Dale, mijito. Sorpréndeme.'" },
        ],
        frases: { caza: "Así se cocina a un novato, mijito.", cae: "Mmm… treinta años, y todavía hay noches que me sorprenden.", siciliana: "¡La siciliana, cabrito! En mi pocilga las dudas se pagan al contado.", alFilo: "Un dadito te queda… qué pena me das, mijito." },
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
    epilogoBeats: [
      { escena: "caida-vega", texto: "El cuchillo se le cae de la mano manchada y se clava en el aserrín. El Carnicero, que despresó vacas y ambiciosos por igual durante veinte años, se queda mirando sus propios dedos como si no los reconociera." },
      { escena: "secuela-vega", texto: "Los vendedores de la Vega bajan la voz, y la noticia baja con ellos, calle abajo, hasta llegar —dicen— a oídos del mismísimo puerto." },
    ],
    eventos: [
      { antesDe: 0, evento: {
        tipo: "dilema",
        clave: "vega-billetera",
        titulo: "La billetera en el cajón",
        texto: "Moviendo un cajón de manzanas podridas encuentras una billetera gorda… y la mano fría del dueño todavía agarrada a ella, tiesa entre la fruta. Nadie va a reclamarla. Adentro hay un fajo que huele a plata grande.",
        opciones: [
          { etiqueta: "Quédatela", plata: 90, marca: "saqueador", resultado: "Le sueltas los dedos al muerto y te embolsas el fajo sin pestañear. Plata es plata. Pero al levantar la vista, un cargador joven te clava los ojos desde el fondo: vio todo, y se queda mirándote el rostro como quien aprende una cara de memoria." },
          { etiqueta: "Déjala donde está", atributo: "colmillo", marca: "honrado", resultado: "Le cierras la mano al finado sobre su plata y te persignas. El Carnicero, que miraba de lejos, asiente lento: nadie respeta a los muertos en La Vega. Te susurra, al pasar, un consejo para oler la mentira ajena. 'Me acordaré de esto', dice. Y el Carnicero nunca olvida un favor." },
        ],
      } },
      { antesDe: 1, requiere: "cabro", evento: {
        tipo: "dilema",
        clave: "vega-cabro",
        titulo: "El cabro te siguió",
        texto: "Entre los cajones aparece una cara conocida: el cabro de la pocilga, con los pies embarrados de caminar desde el puerto. 'Tío… me vine detrás suyo. Allá no hay nada pa' mí. Déjeme ser su campana: yo veo todo y nadie me ve a mí.' Le brillan los ojos de hambre y de otra cosa: de futuro.",
        opciones: [
          { etiqueta: "Tómalo de campana", item: "soplon", marca: "padrino", resultado: "Le pasas medio pan y un puesto: tus espaldas. El cabro desaparece entre los cajones como si hubiera nacido ahí, y a la media hora vuelve con el primer dato: 'La mesa del fondo juega con miedo, tío.' Ahora tienes un par de ojos más." },
          { etiqueta: "Mándalo de vuelta", resultado: "Le pagas el micro de vuelta y le dices que el bajo mundo no es lugar pa' crecer. El cabro se va pateando piedras, sin mirar atrás. Quizás le salvaste la vida. Quizás le quitaste la única puerta que conocía. No vas a saberlo nunca." },
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
    acertijo: {
      clave: "sec-charqui",
      titulo: "El candado del Charqui",
      texto:
        "Bajo el puesto del Charqui hay un cofre con tres dados por cerradura y un papel grasiento: 'Pa'l que mira y escucha: las patas de la vaca que despresa el jefe, los dados que te cuesta dudarle cuando abre, y las cartas que tiende la vieja ciega.'",
      solucion: [4, 3, 3],
      fallo: "El candado ni se mueve. Desde su puesto, El Charqui se ríe sin mirar: 'Ese cofre lleva años burlándose de los apurados, cabro.'",
      desenlace: "Clac. El cofre se abre: adentro hay un par de dados marcados envueltos en un pañuelo y un fajo chico. Arriba del pañuelo, una nota: 'Bien mirado, cabro.'",
      premio: { item: "marcado", plata: 100 },
    },
    rivales: [
      { id: "r-charqui", nombre: "El Charqui", nivel: "medio", mesa: 5, esBoss: false, plata: 32,
        presentacion: "Entre cajones de fruta podrida, El Charqui reparte mesa para cinco. 'Esto no es el puerto, cabro.' Aquí ya se juega con plata que mancha.",
        relato: "El Charqui te reconoce con un gesto seco. La Vega de noche es chica para los secretos: para cuando llegues a la próxima mesa, ya sabrán que vienes ganando.",
        dialogos: d("Cinco en la mesa, cabro. Esto no es el puerto.", "Mierda. Tienes algo, lo reconozco.", "Vuelve a tu caleta, esto te queda grande.") },
      { id: "r-quintrala", nombre: "La Quintrala", nivel: "medio", mesa: 2, esBoss: false, plata: 38, habilidad: CALZO_SECO,
        presentacion: "La Quintrala te sienta a su lado con una sonrisa que corta. Mano a mano. Lindo cachito el tuyo… sería una pena perderlo con ella.",
        relato: "La Quintrala recoge sus anillos y se va sin mirar atrás. Te queda su perfume y una certeza: en La Vega, los que sonríen son los que más muerden.",
        dialogos: d("Lindo cachito… sería una pena que lo perdieras conmigo.", "Maldito seas. Nadie me lee la mano así.", "Te lo dije, lindo. Esto era mío.") },
      { id: "r-sapo", nombre: "Sapo Reyes", nivel: "avanzado", mesa: 4, esBoss: false, plata: 48, habilidad: SOPLADO,
        presentacion: "Sapo Reyes le cuenta todo al jefe. Hoy te toca a ti ser su informe. 'De ti todavía no tengo nada bueno', dice, afilando el lápiz.",
        relato: "El Sapo se va a cantar lo que vio. Y lo que vio fue una paliza. Al fondo del matadero, El Carnicero deja de filetear un segundo para escuchar tu nombre.",
        dialogos: d("Yo le cuento todo al jefe. Y de ti… todavía no tengo nada bueno.", "Ya, ya. Le voy a decir que tenga cuidado contigo.", "El sapo siempre canta primero, cabro.") },
      { id: "b-carnicero", nombre: "El Carnicero", nivel: "avanzado", mesa: 4, esBoss: true, plata: 150, habilidad: SANGRE_FACIL,
        cinematica: [
          { escena: "cap-vega", texto: "El Charqui, la Quintrala, Sapo Reyes: todos caen. Y todos, al perder, te mandan al mismo lugar: hacia el fondo del mercado, donde el aire huele a sangre fresca y nadie mira lo que hace El Carnicero con las manos." },
          { escena: "jefe-carnicero", texto: "El Carnicero no te recibe con palabras. Sigue destazando algo que ya no importa qué es, mientras limpia el filo en su delantal manchado. Cuando termina, recién entonces te mira. 'Así que tú eres el que anda haciendo preguntas raras en mi mercado.'" },
          { escena: "retrato-carnicero", texto: "De cerca, El Carnicero es más grande que su leyenda. Tiene sangre seca en el delantal y una cicatriz que le parte la ceja. 'En mi mesa se juega limpio', dice, 'porque al que ensucia… lo despresa la casa.'" },
        ],
        frases: { caza: "Otro corte limpio. Así se despresa.", cae: "…buen filo, cabro. Buen filo.", siciliana: "¡Sangre fácil! Te lo advertí: en mi mesa, dudar al que abre cuesta tres.", alFilo: "Ya estás pa'l gancho, cabro." },
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
    epilogoBeats: [
      { escena: "caida-maestranza", texto: "El cacho gastado de mil ejecuciones rueda entre los rieles y se detiene contra un durmiente oxidado. El Verdugo se queda de pie, inmóvil, como una máquina a la que por fin se le acabó el carbón." },
      { escena: "secuela-maestranza", texto: "Los fierros dejan de sonar. Uno por uno, los obreros del galpón se corren para abrirte camino hacia un boquerón oscuro entre los rieles: nadie te lo dice, pero todos saben que ahí sigue el descenso." },
    ],
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
          { etiqueta: "Échale al Fundidor encima", item: "marcado", marca: "sangre-fria", resultado: "Le murmuras al Fundidor que el borracho habló mal de él. Vuelan fierros. Cuando se asienta la polvareda, hay uno que no se levanta y nadie se agacha a ver. En el desorden te guardas unos dados marcados de la mesa. Aprendiste algo de ti esta noche, y no te gustó." },
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
      { id: "r-mecha", nombre: "Mecha Corta", nivel: "experto", mesa: 4, esBoss: false, plata: 80, habilidad: POLVORA,
        presentacion: "Mecha Corta golpetea la mesa con los dedos. Le dicen así por algo: tienes una mano para ganarle, o estalla.",
        relato: "Mecha aguanta el bufido y, por una vez, no explota. 'Pasa nomás.' Al fondo del galpón, una sombra enorme deja un saco de género sobre la mesa.",
        dialogos: d("Tengo la paciencia justa para una mano. Apúrate o exploto.", "…contuviste la mecha. Pocos lo logran.", "Bum. Te dije que tenía la mecha corta, cabro.") },
      { id: "b-verdugo", nombre: "El Verdugo", nivel: "experto", mesa: 4, esBoss: true, plata: 220, habilidad: SIN_COMODIN,
        cinematica: [
          { escena: "cap-maestranza", texto: "El Fundidor, La Trenza, Mecha Corta: todos te avisaron, cada uno a su manera, que El Verdugo no juega — ejecuta. Entre los rieles muertos, el galpón se abre a un espacio más grande, y más oscuro." },
          { escena: "jefe-verdugo", texto: "Una mole de sombra desata un saco de género sobre la mesa: adentro, un cacho gastado de mil ejecuciones. No dice nada todavía. El fierro, alrededor, tampoco." },
          { escena: "retrato-verdugo", texto: "De cerca, El Verdugo no tiene cara: tiene un silencio con mandíbula. Sus ojos, dos puntas de fierro frío, te miden como se mide un tronco antes del hachazo. 'Empecemos', dice. Y el galpón entero obedece." },
        ],
        frases: { caza: "Cae el hacha.", cae: "…interesante. Sigues vivo.", siciliana: "La siciliana. Sin llanto.", alFilo: "Un dado. La cuenta es corta." },
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
    epilogoBeats: [
      { escena: "caida-trastienda", texto: "Por primera vez en diez años, al Croata se le cae el cigarro de entre los dedos antes de terminarlo. No dice nada. El hielo, cuando se rompe, no hace ruido: se raja por dentro." },
      { escena: "secuela-trastienda", texto: "Tras el paño verde, alguien abre una puerta que no sabías que estaba ahí. El aire que sale es más frío que el del Croata, y más oscuro que toda la trastienda junta." },
    ],
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
      { antesDe: 1, requiere: "sangre-fria", evento: {
        tipo: "dilema",
        clave: "trastienda-eco",
        titulo: "El eco de los fierros",
        texto: "Un parroquiano te reconoce y se le corta la voz: 'Tú… tú eres el de la Maestranza. El del Fundidor.' La trastienda entera baja el murmullo un tono. El cuento de lo que pasó entre los fierros llegó antes que tú, y creció por el camino. Ahora todos te miran distinto: con miedo del bueno.",
        opciones: [
          { etiqueta: "Deja que el miedo trabaje", efecto: "mano_cargada", resultado: "No confirmas ni desmientes: sostienes la mirada hasta que el parroquiano se estudia los zapatos. Te sientas a la próxima mesa con un silencio respetuoso alrededor y el pulso planchado. El miedo ajeno también es una ventaja." },
          { etiqueta: "Baja el perfil", plata: 40, resultado: "Te encoges de hombros: 'Me confundes con otro.' El parroquiano, aliviado, te convida un trago y hasta te desliza unos billetes 'por la molestia'. Mejor así: los cuentos grandes atraen cuchillos grandes." },
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
          { etiqueta: "Señálale a otro", item: "soplon", marca: "delator", resultado: "Le apuntas a un viejo que dormita en un rincón con un niño dormido en las piernas. El cobrador se lo lleva. Lo último que ves es al crío despertando solo, gritando un nombre hacia el puente. No preguntes qué pasó después; te quedas con el dato que el viejo ya no va a usar." },
        ],
      } },
    ],
    acertijo: {
      clave: "sec-notario",
      titulo: "La caja del Notario",
      texto:
        "Tras el estante hay una caja de fierro con tres dados y una ficha escrita con letra de escribano: 'Sólo abre para quien lleva la cuenta: los maridos que enterró la Viuda, los dados con que parte cada socio, y el vidrio con que leo la letra chica.'",
      solucion: [3, 5, 1],
      fallo: "La caja no cede. Te parece oír al Notario, desde alguna parte: 'La memoria, joven. En este oficio, la memoria lo es todo.'",
      desenlace: "La caja suelta un suspiro de fierro viejo y se abre: un fajo gordo, ordenado con prolijidad de escribano. Sin nota. El Notario no deja constancia de sus derrotas.",
      premio: { plata: 250 },
    },
    rivales: [
      { id: "r-notario", nombre: "El Notario", nivel: "avanzado", mesa: 3, esBoss: false, plata: 70, habilidad: LETRA_CHICA,
        presentacion: "Bajo el foco amarillo, El Notario anota cada jugada en una libreta grasienta. 'Todo queda registrado, joven. Hasta su derrota de hoy.'",
        relato: "El Notario cierra su libreta. 'Que conste en acta', suspira. Tu nombre ya está escrito en la trastienda, y de ahí no se borra fácil.",
        dialogos: d("Todo queda registrado, joven. Hasta su derrota de hoy.", "Objeto… objeto, pero perdí. Que conste en acta.", "Caso cerrado. El siguiente.") },
      { id: "r-pituto", nombre: "Pituto", nivel: "avanzado", mesa: 4, esBoss: false, plata: 78,
        presentacion: "Pituto conoce a todos los que mandan. A ti no te conoce… todavía. Te da la mano blanda y los ojos duros.",
        relato: "Pituto te guarda en su memoria de elefante. 'Ahora sí te tengo en el radar.' Que Pituto ande pendiente de ti puede salvarte la vida… o costártela.",
        dialogos: d("Yo conozco a todos los que mandan. A ti no te conozco… todavía.", "Ya te tengo en el radar ahora, cabro.", "Nadie va a recordar tu nombre.") },
      { id: "r-viuda", nombre: "La Viuda Alegre", nivel: "experto", mesa: 3, esBoss: false, plata: 95, habilidad: SIN_VELORIO,
        presentacion: "La Viuda Alegre enterró a tres maridos en esta misma mesa. Te corre la silla con una sonrisa negra. 'Hay sitio, lindo.'",
        relato: "La Viuda te despide con un beso al aire. 'Otro luto para mi colección.' Tras el humo, El Croata apaga su cigarro: llegó tu turno con el hielo.",
        dialogos: d("Enterré a tres maridos jugando al cacho. Siéntate, lindo, hay sitio.", "Me dejas viuda otra vez… de mi invicto. Qué hombre.", "Otro luto más para mi colección, mijito.") },
      { id: "b-croata", nombre: "El Croata", nivel: "brutal", mesa: 2, esBoss: true, plata: 260, habilidad: TEMPANO,
        cinematica: [
          { escena: "cap-trastienda", texto: "El Notario, Pituto, la Viuda Alegre: cada uno con su parte del rumor. Hay un hombre al fondo que no suda, no parpadea, no pierde. Bajo el foco amarillo, el paño verde te espera para la última mesa de la trastienda." },
          { escena: "jefe-croata", texto: "El Croata ya te lleva la cuenta antes de que te sientes: cuántas veces subiste de más, cuántas dudaste tarde. No fuma por vicio — fuma para tener las manos quietas. 'Siéntate', dice, sin levantar la vista. 'Veamos qué tan bien mientes.'" },
          { escena: "retrato-croata", texto: "De cerca, los ojos del Croata son de un gris que no existe en Chile. El cigarro le cuelga de los labios sin temblar, con la brasa quieta como un punto final. 'Tres manos', murmura. 'En tres manos voy a saber todo de ti.'" },
        ],
        frases: { caza: "Te lo dije: tu cara habla antes que tú.", cae: "Frío. Mantengamos… la calma.", siciliana: "Directo al hielo. Valiente. O tonto.", alFilo: "Un dado. Ya sé cómo termina esto." },
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
    epilogoBeats: [
      { escena: "caida-club", texto: "Los fajos que el Senador tenía listos para pagar favores se le desparraman de un bolsillo roto. Por un segundo, el hombre que hace las leyes de la mesa se ve exactamente como lo que es: un tramposo más, pillado." },
      { escena: "secuela-club", texto: "En el Subterráneo nadie aplaude —acá abajo no se aplaude nunca— pero todos, sin excepción, se corren un paso atrás cuando pasas. La noticia ya sube, de boca en boca, hacia la Cumbre." },
    ],
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
      { antesDe: 1, requiere: "saqueador", evento: {
        tipo: "pelea",
        clave: "club-hermano",
        titulo: "El hermano del finado",
        texto: "Un cargador joven se planta frente a tu mesa, temblando. 'Tú le sacaste la billetera a mi hermano muerto, allá en La Vega. Lo enterré sin un peso por tu culpa, y te seguí hasta este agujero.' Saca una corvina de destripar pescado, todavía con escamas. Es la cara que te miraba aquella noche.",
        opciones: [
          { etiqueta: "Devuélvele el doble", plata: -160, resultado: "Le pones el doble del fajo en la mano. El muchacho llora, escupe, se lo guarda. 'Esto no devuelve a mi hermano… pero me deja dormir.' Se va. Saldaste una deuda que creías gratis." },
          { etiqueta: "Acábalo tú primero", efecto: "sin_suerte", marca: "asesino", resultado: "No alcanza a clavarte. Cuando todo termina, hay dos hermanos bajo el río en vez de uno. Te tiemblan las manos el resto de la noche: la próxima mano la juegas con la culpa pesándote en los dedos." },
          { etiqueta: "Niégalo todo", efecto: "rival_cargado", resultado: "Lo miras a los ojos y le juras que se equivocó de hombre. Casi te cree… pero algo en tu cara lo delata, y se va prometiendo volver con gente. Entras a la mesa sabiendo que alguien, en las sombras, ya juega en tu contra." },
        ],
      } },
      { antesDe: 1, requiere: "honrado", evento: {
        tipo: "dilema",
        clave: "club-recado",
        titulo: "El recado del Carnicero",
        texto: "Un tipo enorme con delantal manchado te aparta del bullicio. 'El Carnicero manda saludos. Dice que un hombre que respeta a los muertos merece un respiro acá abajo.' Te ofrece, a elección, plata o algo bajo la manga. Su palabra, en este sótano, vale más que un arma.",
        opciones: [
          { etiqueta: "Acepta la plata", plata: 130, marca: "aliado", resultado: "Te pasa un fajo grueso. 'Por lo de La Vega.' El nombre del Carnicero, acá abajo, ahora también te cubre a ti. Por primera vez no estás del todo solo." },
          { etiqueta: "Acepta el dato", item: "soplon", marca: "aliado", resultado: "Te susurra cómo respiran los de la mesa de abajo. 'El Carnicero ve todo. Y ahora, un poco, ve por ti.' Tienes un aliado donde nadie hace amigos." },
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
    acertijo: {
      clave: "sec-madame",
      titulo: "El cofre de Madame",
      texto:
        "En el reservado hay un cofre de terciopelo con tres dados por cerradura. La tarjeta perfumada dice: 'Para el que entiende esta casa: las sillas de mi mesa, los reyes que de verdad reparten en Chile, y lo que vende el fiador para hacerte más fuerte.'",
      solucion: [6, 1, 3],
      fallo: "El cofre ronronea y no se abre. Madame, de lejos, alza su copa: 'Casi, querido. Casi.'",
      desenlace: "El cofre se abre con un clic sedoso: un cacho cargado de marfil y un fajo atado con cinta roja. 'Los secretos son de quien los entiende', dice la tarjeta.",
      premio: { item: "cargado", plata: 150 },
    },
    rivales: [
      { id: "r-madame", nombre: "Madame Ruiz", nivel: "experto", mesa: 6, esBoss: false, plata: 90, habilidad: CARTAS_VISTAS,
        presentacion: "Terciopelo gastado y seis sillas. Madame Ruiz preside lo profundo con anillos que valen más que toda la mesa. 'Pocos llegan tan abajo, querido.'",
        relato: "Madame Ruiz aplaude bajito, encantada. 'Tienes hambre de verdad', ronronea. 'Eso aquí se huele… y atrae a las fieras grandes.'",
        dialogos: d("Seis a la mesa, querido. Bienvenido a lo profundo: pocos llegan tan abajo.", "Tienes hambre de verdad. Me agrada… y me asusta.", "Lo profundo se traga a los ambiciosos, mi amor.") },
      { id: "r-turco", nombre: "El Turco Fino", nivel: "experto", mesa: 3, esBoss: false, plata: 105, habilidad: CORTESIA,
        presentacion: "El Turco Fino no se quita el traje ni los cachos. Elegancia hasta para robarte. 'Las dos cosas que nunca suelto.'",
        relato: "El Turco se sacude una arruga invisible. 'Me ganaste limpio, cabro.' Viniendo de un tramposo de seda, es casi un honor.",
        dialogos: d("Traje y cachos: las dos cosas que nunca me quito.", "Me arrugaste el traje, desgraciado. Bien jugado.", "Elegancia, cabro. Eso es lo que te falta.") },
      { id: "r-comisario", nombre: "El Comisario", nivel: "experto", mesa: 4, esBoss: false, plata: 130, habilidad: LEY_SECA,
        presentacion: "De civil, pero huele a placa a un metro. El Comisario persigue al hampa de día y le gana la plata de noche. 'Conozco todos sus trucos.'",
        relato: "El Comisario te deja libre 'por esta vez'. Antes de irse, baja la voz: 'El Senador hace trampa y tiene comprado a medio Chile. Arriba ya no hay reglas.'",
        dialogos: d("De día persigo al hampa; de noche le gano la plata. Conozco todos sus trucos.", "Si fueras delincuente, serías el mejor. Lástima que eres honrado.", "Queda detenido… en el último puesto, cabro.") },
      { id: "b-senador", nombre: "El Senador", nivel: "experto", mesa: 4, esBoss: true, plata: 360, habilidad: DADO_CARGADO,
        cinematica: [
          { escena: "cap-club", texto: "Madame Ruiz, el Turco Fino, El Comisario: todos, a su manera, te dejaron ver lo mismo. Acá abajo el que manda no se sienta a jugar limpio. Se sienta a cobrar." },
          { escena: "jefe-senador", texto: "El Senador llega cuando ya nadie lo espera, como llegan los que mandan. No te mira mientras se sienta: mira el cacho, calculando. Bajo la mesa, algo brilla un segundo de más." },
          { escena: "retrato-senador", texto: "De cerca, El Senador sonríe como en los afiches, pero los lentes no alcanzan a taparle el cálculo. 'Muchacho', dice mientras acomoda el cacho sin mirarlo, 'esto no es un juego: es una elección. Y yo no pierdo elecciones.'" },
        ],
        frases: { caza: "La ley soy yo, muchacho.", cae: "¡Recuento! Exijo… no importa. Sigamos.", siciliana: "¡Orden en la mesa! La siciliana cobra al contado.", alFilo: "Un consejo gratis: ríndete con dignidad." },
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
    epilogoBeats: [
      { escena: "caida-cumbre", texto: "Por primera vez en treinta años, al Rey del Cacho le tiemblan las manos al dejar el cacho sobre el paño. Todo Santiago, encendido tras el ventanal, parece contener la respiración con él." },
      { escena: "secuela-cumbre", texto: "Nadie en el penthouse dice una palabra. El Rey se queda mirando sus propias manos vacías, como si recién ahora entendiera que treinta años también se acaban." },
    ],
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
      { antesDe: 1, requiere: "delator", evento: {
        tipo: "dilema",
        clave: "cumbre-huerfano",
        titulo: "El mozo que te conoce",
        texto: "Un mozo joven te llena la copa en el penthouse y se queda mirándote demasiado tiempo. Tiene los ojos de alguien que te buscó la cara durante años. 'Yo a usted lo conozco', dice bajito. 'Usted señaló a mi viejo, allá en la trastienda. Yo era el niño del puente.' No grita. Sólo deja la botella y espera.",
        opciones: [
          { etiqueta: "Cómprale el olvido", plata: -150, resultado: "Le metes un fajo en el delantal. No lo rechaza —el hambre manda— pero te mira con un asco que no se compra. La culpa, al menos, te la callas con plata por esta noche." },
          { etiqueta: "Sostenle la mirada", efecto: "sin_suerte", marca: "sin-alma", resultado: "No bajas la vista. El crío entiende que no hay perdón ni vergüenza en ti, y algo se le apaga en la cara. Confirmar lo que eres también te cuesta: subes a la mesa de la Jueza con la mano fría y el pulso peor." },
        ],
      } },
      { antesDe: 1, requiere: "padrino", evento: {
        tipo: "dilema",
        clave: "cumbre-campana",
        titulo: "Tu campana llegó a la cumbre",
        texto: "Un mozo joven te intercepta con una bandeja que no pidió nadie. Te toma un segundo reconocerlo: el cabro del puerto, más alto, con el pelo peinado y los mismos ojos rápidos. 'Me colé, tío. ¿O creía que lo iba a dejar solo justo ahora? Llevo dos horas mirando a la Jueza: le tiembla la ceja cuando miente.'",
        opciones: [
          { etiqueta: "Escucha a tu campana", efecto: "suerte_extra", resultado: "Te sopla todo lo que vio: los tics, los tiempos, las manías de la mesa que viene. Subes al duelo sabiendo más de lo que deberías. El mejor dato de tu carrera te lo dio un cabro al que un día le pagaste por cuidar una puerta." },
          { etiqueta: "Mándalo abajo, a salvo", plata: -100, resultado: "Le metes un fajo en el bolsillo del delantal y le ordenas esperarte abajo: 'Esto lo termino solo.' Protesta, pero obedece. Si esta noche sale mal, al menos él no la va a ver. Subes más liviano y más solo que nunca." },
        ],
      } },
      { antesDe: 2, requiere: "aliado", evento: {
        tipo: "dilema",
        clave: "cumbre-aliado",
        titulo: "Una mano amiga",
        texto: "Cuando ya no esperabas a nadie, una figura conocida se cuela al penthouse: el hombre del Carnicero, el que te debía una desde La Vega. 'No vas a entrar solo a esa mesa', dice, y se acerca a tu oído. 'Te traigo cómo respira el Rey cuando miente. Treinta años de tics, en un susurro.'",
        opciones: [
          { etiqueta: "Acepta la ayuda", efecto: "suerte_extra", marca: "verdad", resultado: "Asientes. El aliado te sopla los tics del Rey… y algo más, bajando la voz hasta casi no oírse: 'Una última cosa. El Rey que vas a enfrentar lleva treinta años invicto porque nunca jugó en serio: es una fachada. El verdadero Rey del Cacho está más arriba, en una pieza sin número. Si de verdad quieres el trono, no te quedes con el de la vitrina.' Entras al duelo con una ventaja… y con un secreto que pocos llegan a oír." },
          { etiqueta: "Hazlo a tu manera", efecto: "mano_cargada", resultado: "Le agradeces y le dices que esta la juegas solo, como empezaste. El aliado se encoge de hombros, se guarda lo que iba a decirte, y se va. El dato te queda dando vueltas y la mano te sale firme: entras al trono con el pulso de hierro… y sin saber lo que ese hombre callaba." },
        ],
      } },
    ],
    rivales: [
      { id: "r-heredero", nombre: "El Heredero", nivel: "experto", mesa: 3, esBoss: false, plata: 150,
        presentacion: "El penthouse huele a dinero viejo. El Heredero te recibe con desprecio de cuna. 'Mi padre fue el segundo mejor de Chile. Yo seré el primero.'",
        relato: "El Heredero se hunde en su sillón de cuero. La sangre no le alcanzó. Una puerta doble se abre al fondo: del otro lado espera la Jueza, y después… el trono.",
        dialogos: d("Mi padre era el segundo mejor de Chile. Yo voy a ser el primero.", "No… ese trono era mío por sangre.", "La sangre manda, advenedizo.") },
      { id: "r-jueza", nombre: "La Jueza", nivel: "experto", mesa: 2, esBoss: false, plata: 200, habilidad: SIN_ATENUANTES,
        presentacion: "La Jueza condenó a hombres por menos que tu ambición. Te mira por encima de sus lentes. 'A ver si me convences, forastero.'",
        relato: "La Jueza dicta su último veredicto de la noche: 'Culpable… de ser mejor que yo. Pasa.' Se hace un silencio. Tras la última puerta, treinta años de leyenda te esperan.",
        dialogos: d("He condenado a hombres por menos que tu ambición. A ver si me convences.", "Veredicto: culpable… de ser mejor que yo. Pasa.", "Sentencia firme: de vuelta al barro, sin apelación.") },
      { id: "b-rey", nombre: "El Rey del Cacho", nivel: "brutal", mesa: 2, esBoss: true, plata: 1500, habilidad: OJO_HALCON,
        cinematica: [
          { escena: "cap-cumbre", texto: "El Heredero, la Jueza: los últimos peldaños antes del trono. Cada mesa que ganaste en esta ciudad, cada capítulo, te trajo hasta este ventanal con todo Chile encendido a tus pies." },
          { escena: "jefe-rey", texto: "Treinta años sentado en el mismo sillón, contra el mismo ventanal, y ni una vez tuvo que levantarse. El Rey del Cacho no te mira con miedo ni con desprecio: te mira como quien ya ha visto morir a cien iguales a ti." },
          { escena: "retrato-rey", texto: "De cerca, el Rey del Cacho tiene la calma de los que nunca conocieron la derrota. Ni una arruga de miedo: puro oficio. 'Treinta años esperé un rival', dice, y por primera vez en la noche suena sincero. 'Ojalá seas tú.'" },
        ],
        frases: { caza: "Treinta años no se improvisan.", cae: "Vaya… hacía décadas que no sentía esto.", siciliana: "La siciliana. El clásico de los impacientes.", alFilo: "Todos llegan hasta aquí. Y todos caen aquí." },
        presentacion: "Treinta años invicto, sentado contra el ventanal con todo Chile a sus pies. El Rey del Cacho sonríe como quien ya ganó. 'La leyenda termina aquí, mano a mano.'",
        dialogos: d("Subiste desde el barro hasta mi mesa. Eso ya es leyenda. Pero la leyenda termina aquí, mano a mano.", "Treinta años… y un don nadie del puerto me destrona. El cacho es tuyo. Chile es tuyo.", "Yo SOY el cacho, muchacho. Vuelve al barro de donde saliste.") },
    ],
  },
];

// ---------------------------------------------------------------------------
// El jefe final SECRETO y los tres finales
// ---------------------------------------------------------------------------

const LA_BANCA: HabilidadBoss = {
  nombre: "La banca nunca pierde",
  desc: "El verdadero capo: te lee entero y juega con los dados comprados a fondo. Treinta años invicto… de verdad esta vez.",
  dadoCargado: 16,
};

/** El VERDADERO Rey del Cacho: jefe final secreto del final real. */
export const REY_VERDADERO: RivalHistoria = {
  id: "b-patron",
  nombre: "El Patrón del Cacho",
  nivel: "brutal",
  mesa: 2,
  esBoss: true,
  habilidad: LA_BANCA,
  plata: 5000,
  cinematica: [
    { escena: "cap-cumbre", texto: "El giro todavía te zumba en los oídos: el Rey de la vitrina era una fachada. Sigues a tu aliado por un pasillo que el penthouse escondía, hasta una puerta sin número, al fondo de todo." },
    { escena: "jefe-patron", texto: "La puerta se abre a una pieza sin ventanas. No hay aplausos esperándote esta vez, ni ventanal con la ciudad. Sólo una ampolleta, un hombre sin edad, y treinta años de silencio esperando a que alguien cruzara ese umbral." },
          { escena: "retrato-patron", texto: "De cerca… no hay 'de cerca'. La ampolleta le queda encima y aun así la cara del Patrón sigue en sombra, como si la luz le tuviera miedo. Sólo se le ven los dientes cuando dice: 'Treinta años. Juguemos.'" },
  ],
  frases: { caza: "La banca cobra.", cae: "…anota eso, porque nadie lo va a creer.", siciliana: "Siciliana. La banca aplaude a los osados… y después los entierra.", alFilo: "Un dado. La casa espera." },
  presentacion:
    "La pieza no tiene ventanas. Bajo una sola ampolleta, un hombre sin edad baraja un cacho más viejo que Santiago. No te mira: ya sabe cómo termina esto, o eso cree. 'Treinta años esperando a alguien que llegara hasta acá', dice la voz. 'Siéntate. La banca te recibe.'",
  dialogos: d(
    "Bienvenido a la única mesa que importa. De acá nadie sale segundo… nadie sale, en realidad.",
    "Im… imposible. Treinta años. La banca nunca… nunca pierde.",
    "Te lo dije, cabro. La banca siempre gana. Vuelve al barro, que es donde se reparte a los que sueñan.",
  ),
};

/** Marcas "oscuras": acciones turbias que empujan al final malo. */
const MARCAS_OSCURAS = ["delator", "saqueador", "sangre-fria", "asesino", "sin-alma"];

export type TipoFinal = "estandar" | "malo" | "verdadero";

/** Qué final le toca al jugador, según el camino que eligió. */
export function tipoFinal(h: EstadoHistoria): TipoFinal {
  const m = h.marcas ?? [];
  const oscuro = MARCAS_OSCURAS.filter((x) => m.includes(x)).length;
  if (m.includes("verdad") && oscuro === 0) return "verdadero"; // limpio + descubrió el secreto
  if (oscuro >= 2) return "malo"; // se hizo monstruo: lo traicionan
  return "estandar";
}

/** Giro al caer el Rey "público", cuando se desbloqueó el final verdadero. */
export const TWIST_VERDADERO =
  "El Rey, en el suelo, se ríe con la boca llena de sangre. '¿Treinta años invicto… yo? Pobre iluso. Yo soy la cara que ponen en la mesa para los que llegan hasta acá. El que de verdad reparte la baraja de todo Chile nunca se sienta donde lo vean.' Al fondo del penthouse se abre una puerta sin número. Tu aliado te aprieta el hombro: 'Esto te quería mostrar. El verdadero Rey del Cacho. Nadie volvió de esa pieza… pero tú no eres nadie.'";

/** Epílogos de los tres finales: tres pasajes cada uno, de la caída del Rey al cierre. */
export const FINALES: Record<TipoFinal, { titulo: string; beats: FinalBeat[] }> = {
  estandar: {
    titulo: "El mejor de Chile",
    beats: [
      {
        escena: "fin-trono-mesa",
        texto:
          "El Rey del Cacho cae de rodillas antes de caer del todo, con el cacho todavía apretado contra el pecho, como si eso fuera a servirle de algo. Nadie en la mesa habla. El crupier —un viejo que ha visto perder a generaciones enteras— te mira como quien ve algo que no esperaba ver dos veces en la misma vida. Afuera del salón alguien golpea la baranda, despacio, y el golpe se contagia hasta sonar como un aplauso de fierro. Treinta años de leyenda, apagados en cinco tiradas.",
      },
      {
        escena: "fin-trono-calle",
        texto:
          "La noticia baja más rápido que tú por las mismas escaleras que subiste. Para cuando llegas al primer piso ya la sabe medio Santiago; para cuando amanece, la sabe el país entero. En La Trastienda, El Croata levanta una copa que no brinda con nadie. En La Maestranza, alguien graba tu nombre a fierro caliente en la puerta del taller, junto al de El Verdugo, tachado. Doña Berta, allá en el puerto, ya les cuenta a los nuevos —siempre hay nuevos— que a ti también te tembló la mano la primera noche, y que igual llegaste. Eres una historia antes de terminar de vivirla.",
      },
      {
        escena: "fin-trono",
        texto:
          "Partiste en una pocilga del puerto, oliendo a pescado y a fracaso; hoy nadie te reconocería en esa mesa pegajosa de vino. Desde lo más alto de Santiago, no queda un nombre por encima del tuyo. El cacho, por fin, tiene dueño. Y sin embargo, unas noches después, contando tu plata frente al mismo ventanal, una duda no te deja dormir: el Rey cayó demasiado fácil para treinta años de leyenda. Como si alguien, más arriba todavía, te hubiera dejado ganar. Pero estás cansado, y los reyes cansados no hacen preguntas. Te quedas con el trono… y con la incógnita.",
      },
    ],
  },
  malo: {
    titulo: "La banca siempre cobra",
    beats: [
      {
        escena: "fin-traicion-cima",
        texto:
          "Por un segundo —uno solo— es dulce. El Rey del Cacho boquea en el suelo y tú te sientes, por primera vez en tu vida, invencible. Levantas los brazos y el salón entero aplaude, o eso crees oír. Pero el aplauso se corta antes de tiempo: alguien en tu propio séquito —no sabrías decir quién— deja de aplaudir primero, y te mira con una cara que no le habías visto antes. La cara de alguien que ya decidió algo.",
      },
      {
        escena: "fin-traicion-fantasmas",
        texto:
          "La copa que te ponen en la mano sabe a cobre. En el reflejo del ventanal, por una fracción de segundo, ves más gente de la que hay en la sala: un cargador de La Vega que te mira sin parpadear, un viejo de las mesas del puerto con un niño de la mano, un hermano al que le debiste una explicación que nunca diste, un crío al que le sostuviste la mirada cuando debiste apartarla. Nadie más los ve. Tú sí. Llevas sus caras contigo desde que decidiste que la plata y el poder valían más que la cuenta que algún día había que pagar.",
      },
      {
        escena: "fin-traicion",
        texto:
          "Levantaste tu imperio sobre cadáveres: el muerto de los cajones, el viejo del puente, el hermano que te buscó la cara. Subiste pisando a todos y arriba, donde ya no queda nadie a quien traicionar, te traicionan a ti. La copa de la victoria te sabe rara un segundo antes de que las piernas te fallen. Caes frente al ventanal con todo Chile encendido a tus pies, y lo último que oyes es una voz que no reconoces: 'La banca siempre cobra, cabro.' Otro saco de género rumbo al Mapocho. El cacho, esta noche, sigue sin dueño.",
      },
    ],
  },
  verdadero: {
    titulo: "El verdadero Rey del Cacho",
    beats: [
      {
        escena: "fin-amanecer-puerta",
        texto:
          "El Patrón queda tendido sobre su propio cacho, en silencio, en una pieza que nunca tuvo testigos hasta esta noche. No hay aplausos ni copas: solo el zumbido de la ampolleta y tu respiración, todavía agitada. Tu aliado entra despacio, como quien no cree lo que está viendo, y te mira largo antes de hablar. 'Treinta años', dice al fin, 'y nadie había cruzado esa puerta dos veces.' Tú tampoco lo puedes creer del todo. Recién ahí entiendes que ganaste algo que no tiene precio en plata.",
      },
      {
        escena: "fin-amanecer-penthouse",
        texto:
          "Cruzas de vuelta el penthouse con el Rey público todavía tirado donde cayó, humillado dos veces en la misma noche sin saberlo. Nadie ahí adentro sabrá jamás lo que pasó tras la puerta sin número; para ellos, la leyenda sigue siendo el de la vitrina. Tu aliado camina a tu lado y no dice nada más, pero no hace falta: los dos saben una verdad que el resto de Santiago nunca va a conocer, y por primera vez en esta historia, con eso te basta.",
      },
      {
        escena: "fin-amanecer",
        texto:
          "Sales del edificio cuando el cielo recién empieza a cambiar de color. Empezaste en el barro, sin nombre, convencido de que el trono de arriba era lo único que importaba; pero lo que en verdad ganaste pasó lejos de las luces, en una pieza sin ventanas que nadie más va a conocer. El sol asoma sobre el río y, por primera vez, el Mapocho no se lleva a nadie. Hoy ERES el cacho —el de verdad, el que nadie va a destronar con trucos—. Te lo ganaste limpio, y acompañado. Esa, y no el trono, es la parte que cuenta.",
      },
    ],
  },
};

/** La estampa de cierre de un final (para distinguirlos en el Cuaderno/tests). */
export function escenaFinal(tipo: TipoFinal): string {
  const beats = FINALES[tipo].beats;
  return beats[beats.length - 1]!.escena;
}

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

export function costoMejora(clave: ClaveAtributo, nivelActual: number, oficio?: OficioId): number {
  const a = ATRIBUTOS.find((x) => x.clave === clave)!;
  const base = a.costos[nivelActual];
  if (base === undefined) return Infinity;
  // El oficio abarata SU atributo un 25% (el gremio cuida a los suyos).
  return oficio && OFICIO_ATRIBUTO[oficio] === clave ? Math.round(base * 0.75) : base;
}

function atributosLimpios(a: Partial<AtributosJugador> | undefined): AtributosJugador {
  return { ojo: a?.ojo ?? 0, colmillo: a?.colmillo ?? 0, suerte: a?.suerte ?? 0 };
}

function inventarioLimpio(inv: Partial<Inventario> | undefined): Inventario {
  return { cargado: inv?.cargado ?? 0, marcado: inv?.marcado ?? 0, soplon: inv?.soplon ?? 0 };
}

// ---------------------------------------------------------------------------
// El OFICIO del tahúr: cómo te ganabas la vida antes del cacho. Se elige al
// empezar una campaña y marca tu estilo: un atributo de partida y una ventaja
// económica propia. Personalización de verdad, no sólo cosmética.
// ---------------------------------------------------------------------------

export type OficioId = "relojero" | "charlatan" | "cabalista" | "contrabandista" | "buenacuna";

export interface Oficio {
  id: OficioId;
  nombre: string;
  /** Glifo tipográfico para la UI (sin emojis). */
  glifo: string;
  desc: string;
}

export const OFICIOS: Oficio[] = [
  { id: "relojero", nombre: "El Relojero", glifo: "◉", desc: "Ojo clínico: partes con Ojo 1 y afinarlo en la tienda cuesta un cuarto menos." },
  { id: "charlatan", nombre: "El Charlatán", glifo: "♠", desc: "Lengua de oro: partes con Colmillo 1 y afilarlo cuesta un cuarto menos." },
  { id: "cabalista", nombre: "El Cabalista", glifo: "♣", desc: "Cábala propia: partes con Suerte 1 y comprarla cuesta un cuarto menos." },
  { id: "contrabandista", nombre: "El Contrabandista", glifo: "♦", desc: "Bolsillos hondos: partes con un item de cada tipo y te cuestan un quinto menos." },
  { id: "buenacuna", nombre: "De Buena Cuna", glifo: "$", desc: "Apellido con peso: partes con $250 y los desafíos de la casa te pagan un cuarto más." },
];

/** Qué atributo de partida regala cada oficio (si corresponde). */
const OFICIO_ATRIBUTO: Partial<Record<OficioId, ClaveAtributo>> = {
  relojero: "ojo",
  charlatan: "colmillo",
  cabalista: "suerte",
};

/** Costo de un item en la tienda, con el descuento del oficio si aplica. */
export function costoItem(id: ItemId, oficio?: OficioId): number {
  const base = ITEMS.find((x) => x.id === id)!.costo;
  return oficio === "contrabandista" ? Math.round(base * 0.8) : base;
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
  /** Marcas de tu pasado (honrado, saqueador, delator, aliado…): condicionan
   *  eventos de consecuencia más adelante. Tus decisiones cambian el rumbo. */
  marcas: string[];
  /** Ventaja/desventaja para la PRÓXIMA mesa (de una lectura o pelea). */
  efectoPendiente?: EfectoMesa | null;
  /** El oficio elegido al empezar la campaña (estilo del personaje). */
  oficio?: OficioId;
  /** Nueva Partida+: cuántas veces coronaste y volviste a empezar. Cada nivel
   *  de Leyenda sube un escalón la dificultad de TODOS los rivales. */
  leyenda?: number;
  /** Versión del formato (para migrar índices de escenario al crecer la campaña). */
  version?: number;
}

export function historiaNueva(nombre: string, leyenda = 0, oficio?: OficioId): EstadoHistoria {
  const atributos: AtributosJugador = { ojo: 0, colmillo: 0, suerte: 0 };
  const inventario: Inventario = { cargado: 0, marcado: 0, soplon: 0 };
  // La fama abre puertas: cada vuelta de Leyenda parte con un colchón chico.
  let plata = leyenda * 100;
  if (oficio) {
    const atr = OFICIO_ATRIBUTO[oficio];
    if (atr) atributos[atr] = 1;
    if (oficio === "contrabandista") {
      inventario.cargado = 1;
      inventario.marcado = 1;
      inventario.soplon = 1;
    }
    if (oficio === "buenacuna") plata += 250;
  }
  return {
    nombre: nombre.trim() || "Forastero",
    atributos,
    inventario,
    plata,
    escenarioIdx: 0,
    rivalIdx: 0,
    completado: false,
    prologoVisto: false,
    dilemasResueltos: [],
    marcas: [],
    ...(oficio ? { oficio } : {}),
    leyenda,
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

  // Migración de bajada (v4 → lineal): la versión con exploración guardaba el
  // avance como lista de rivales DERROTADOS. Se convierte al puntero lineal:
  // tantos rivales del capítulo vencidos, tantas mesas ya superadas.
  let rivalIdx = h.rivalIdx ?? 0;
  const derrotados = (h as { derrotados?: unknown }).derrotados;
  if (Array.isArray(derrotados)) {
    const esc = CAMPANA[escenarioIdx]!;
    const vencidos = esc.rivales.filter((r) => (derrotados as string[]).includes(r.id)).length;
    rivalIdx = vencidos;
  }
  rivalIdx = Math.max(0, Math.min(rivalIdx, CAMPANA[escenarioIdx]!.rivales.length - 1));

  return {
    ...h,
    escenarioIdx,
    rivalIdx,
    atributos: atributosLimpios(h.atributos),
    inventario: inventarioLimpio(h.inventario),
    dilemasResueltos: Array.isArray(h.dilemasResueltos) ? h.dilemasResueltos : [],
    marcas: Array.isArray(h.marcas) ? h.marcas : [],
    leyenda: Math.max(0, h.leyenda ?? 0),
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

/** El evento de calle que toca antes del rival actual (si hay y sin resolver).
 *  Las MARCAS del jugador pueden abrir o vetar eventos: una decisión pasada
 *  cambia lo que aparece después. */
export function eventoActual(h: EstadoHistoria): Evento | null {
  const esc = escenarioActual(h);
  const marcas = h.marcas ?? [];
  for (const e of esc.eventos ?? []) {
    if (e.antesDe !== h.rivalIdx) continue;
    if (h.dilemasResueltos.includes(e.evento.clave)) continue;
    if (e.requiere && !marcas.includes(e.requiere)) continue;
    if (e.vetadoPor && marcas.includes(e.vetadoPor)) continue;
    return e.evento;
  }
  return null;
}

/** Estampa (viñeta) que ilustra cada evento, por su clave. Ver Escena.tsx. */
const ESCENA_EVENTO: Record<string, string> = {
  "pocilga-cabro": "cabro",
  "vega-billetera": "billetera",
  "vega-pitona": "lectura",
  "maestranza-perro": "perro",
  "maestranza-bronca": "cuchillo",
  "trastienda-prestamo": "notario",
  "trastienda-cobrador": "cobrador",
  "club-madame": "lectura",
  "club-hermano": "cuchillo",
  "club-recado": "carnicero",
  "club-tarot": "lectura",
  "cumbre-oferta": "oferta",
  "cumbre-huerfano": "huerfano",
  "cumbre-aliado": "manoamiga",
};
/** Estampa de ambiente de cada capítulo (por índice). Ver Escena.tsx. */
const ESCENA_CAPITULO = ["cap-muelle", "cap-vega", "cap-maestranza", "cap-trastienda", "cap-club", "cap-cumbre"];
export function escenaCapitulo(idx: number): string {
  return ESCENA_CAPITULO[Math.max(0, Math.min(idx, ESCENA_CAPITULO.length - 1))]!;
}

/** El secreto del capítulo actual, si existe y sigue cerrado. */
export function acertijoPendiente(h: EstadoHistoria): Acertijo | null {
  const a = escenarioActual(h).acertijo;
  if (!a || h.dilemasResueltos.includes(a.clave)) return null;
  return a;
}

/** Nombres y sabor de las MARCAS, para el Cuaderno del Tahúr. */
export const MARCAS_INFO: Record<string, { nombre: string; desc: string }> = {
  honrado: { nombre: "Honrado", desc: "Respetaste a los muertos de La Vega. Alguien lo recordará." },
  saqueador: { nombre: "Saqueador", desc: "Le vaciaste los bolsillos a un finado. Alguien lo vio." },
  "sangre-fria": { nombre: "Sangre fría", desc: "Echaste a un hombre a los fierros y no miraste atrás." },
  delator: { nombre: "Delator", desc: "Señalaste a un inocente. El puente se lo llevó." },
  asesino: { nombre: "Asesino", desc: "Al hermano del finado lo callaste para siempre." },
  "sin-alma": { nombre: "Sin alma", desc: "Le sostuviste la mirada al huérfano sin pestañear." },
  aliado: { nombre: "Aliado del Carnicero", desc: "Hay una mano dura de tu lado en el bajo mundo." },
  verdad: { nombre: "La Verdad", desc: "Sabes que el Rey de la vitrina no es el que reparte." },
  cabro: { nombre: "El cabro del puerto", desc: "Le diste pega al niño de la pocilga. Te eligió, aunque no lo sepas." },
  padrino: { nombre: "Padrino", desc: "Tu campana ve todo y nadie lo ve a él. Alguien te cuida las espaldas." },
};

/** Los SECRETOS del bajo mundo (candados de cifra), para el Cuaderno. */
export const SECRETOS: { clave: string; nombre: string; pista: string }[] = [
  { clave: "sec-charqui", nombre: "El candado del Charqui", pista: "Un cofre bajo un puesto de La Vega." },
  { clave: "sec-notario", nombre: "La caja del Notario", pista: "Fierro viejo tras un estante de San Diego." },
  { clave: "sec-madame", nombre: "El cofre de Madame", pista: "Terciopelo con cerradura, bajo el río." },
];

// ---------------------------------------------------------------------------
// LOGROS: hazañas persistentes (viven en el palmarés, se lucen en el Cuaderno)
// ---------------------------------------------------------------------------

export interface Logro {
  id: string;
  nombre: string;
  desc: string;
}

export const LOGROS: Logro[] = [
  { id: "primera-sangre", nombre: "Primera sangre", desc: "Gana tu primera mesa de la campaña." },
  { id: "sin-un-rasguno", nombre: "Sin un rasguño", desc: "Gana una mesa sin perder ni un dado." },
  { id: "calzo-fino", nombre: "Calzo fino", desc: "Gana una mesa con un calzo acertado." },
  { id: "doblar-o-nada", nombre: "Doblar o nada", desc: "Gana una mesa con la apuesta doblada al máximo." },
  { id: "desde-el-barro", nombre: "Desde el barro", desc: "Gana una mesa habiendo pasado por el obligado." },
  { id: "ganzua", nombre: "Ganzúa", desc: "Abre tu primer candado de cifra." },
  { id: "tres-llaves", nombre: "Las tres llaves", desc: "Abre los tres candados del bajo mundo." },
  { id: "padrino-cumplido", nombre: "Padrino de verdad", desc: "Completa el arco del cabro del puerto, hasta la cumbre." },
  { id: "rey-caido", nombre: "El Rey ha caído", desc: "Corona la campaña, con el final que sea." },
  { id: "detras-vitrina", nombre: "Detrás de la vitrina", desc: "Alcanza el final verdadero." },
  { id: "leyenda-viva", nombre: "Leyenda viva", desc: "Corona la campaña en Nueva Partida+ (Leyenda)." },
];

// ---------------------------------------------------------------------------
// EL FIADOR: el hombre que atiende la tienda entre capítulos. Comenta tu
// camino (y tus marcas) con oficio de prestamista viejo.
// ---------------------------------------------------------------------------

const FIADOR_POR_CAPITULO: Record<number, string> = {
  1: "Primera vez en años que veo a alguien salir de la pocilga con los bolsillos sonando. Gasta con cabeza, forastero: en La Vega los dados pegan más fuerte y los muertos guardan menos silencio.",
  2: "¿Así que la Maestranza? Fierro, hollín y mala leche. Llévate algo bajo la manga, que entre los rieles la honestidad no abriga a nadie.",
  3: "San Diego de noche es una libreta de deudas con patas. Yo que tú invierto en Ojo: en la trastienda, la letra chica mata más gente que el cuchillo.",
  4: "¿Bajas al Subterráneo? Ahí el terciopelo tapa las armas y las sonrisas cobran interés. Ándate elegante… y desconfiado.",
  5: "La Cumbre. Treinta años vendiendo y jamás le vendí dos veces al mismo que subió. Que seas el primero en volver a comprarme, forastero.",
};

/** Extras del Fiador según tus marcas (una sola, la primera que calce). */
const FIADOR_POR_MARCA: [string, string][] = [
  ["aliado", "Ah, y el Carnicero manda saludos. A los amigos de mis amigos les atiendo con las dos manos."],
  ["padrino", "El cabro ese que te sigue vino a comprarme cordones. Tienes buen ojo para la gente, no sólo para los dados."],
  ["saqueador", "Y cuida esa fama tuya: hasta acá llegó el cuento de la billetera de La Vega. Yo no juzgo. Yo cobro."],
  ["delator", "Dicen que en San Diego alguien pagó una deuda ajena bajo el puente. Feo asunto. En fin: ¿qué va a llevar?"],
  ["honrado", "Y me contaron lo del finado de La Vega. Respetar a los muertos sale gratis y paga toda la vida. Bien ahí."],
];

/** Lo que dice el Fiador al recibirte en la tienda (según capítulo y marcas). */
export function fraseFiador(escenarioIdx: number, marcas: string[]): string {
  const base = FIADOR_POR_CAPITULO[escenarioIdx] ?? "Sobreviviste otra cuadra, forastero. Con plata se compra de todo aquí… hasta una vida más larga.";
  const extra = FIADOR_POR_MARCA.find(([marca]) => marcas.includes(marca));
  return extra ? base + " " + extra[1] : base;
}

/** Los ECOS DEL CAMINO: una línea por marca notable, para el cierre del final.
 *  Así el epílogo menciona TUS decisiones, no sólo el tipo de final. */
const ECOS: Record<string, string> = {
  honrado: "Cerraste la mano de un muerto sobre su plata. La Vega no lo olvidó.",
  saqueador: "En La Vega hay una billetera vacía que todavía tiene dueño.",
  cabro: "Un cabro del puerto aprendió de ti que había otro camino que el barro.",
  padrino: "Tu campana ya no necesita padrino: aprendió mirándote.",
  aliado: "El Carnicero cumplió su palabra hasta el final. Los favores, allá abajo, son sagrados.",
  delator: "Bajo un puente del Mapocho, alguien pagó una deuda que era tuya.",
  "sangre-fria": "En la Maestranza quedó un fierro torcido, y un cuento que todavía se cuenta bajito.",
  asesino: "Dos hermanos duermen bajo el río. Tú sabes por qué.",
  "sin-alma": "Hay un mozo en la cumbre que jamás va a olvidar tu mirada.",
  verdad: "Supiste mirar detrás de la vitrina, donde nadie mira.",
};
export function ecosDelCamino(marcas: string[]): string[] {
  return marcas.map((m) => ECOS[m]).filter((x): x is string => Boolean(x));
}

export function escenaDe(clave: string): string {
  return ESCENA_EVENTO[clave] ?? "generico";
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
  dadoCargadoIntentos: number;
  acompanantes: string[];
} {
  const rival = rivalActual(h);
  const leyenda = h.leyenda ?? 0;
  const nivelRival = nivelMas(rival.nivel, leyenda);
  const nivelPorJugador: Record<string, Nivel> = { [rival.id]: nivelRival };
  const jugadores = [
    { id: HUMANO_ID, nombre: h.nombre },
    { id: rival.id, nombre: rival.nombre },
  ];
  const nRelleno = Math.max(0, rival.mesa - 2);
  const nivelR = nivelMenos(nivelRival);
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
    dadoCargadoIntentos: rival.habilidad?.dadoCargado ?? 8,
    acompanantes,
  };
}

// ---------------------------------------------------------------------------
// La apuesta y el desafío de la casa (riesgo y objetivos por mesa)
// ---------------------------------------------------------------------------

/** Objetivo opcional de una mesa. Si lo cumples al ganar, la casa paga el bono. */
export interface Desafio {
  clave: "impecable" | "calzador" | "sobrado" | "manolimpia" | "relampago" | "resucitado" | "alfilo" | "doblete" | "temerario" | "maraton" | "cabalero";
  nombre: string;
  desc: string;
  /** Regla de la casa que este desafío necesita para ser posible (ver ReglasCasa). */
  requiere?: "calzarPermitido" | "obligadoActivo";
}

const DESAFIOS: Desafio[] = [
  { clave: "impecable", nombre: "Impecable", desc: "Gana sin perder ni un solo dado." },
  { clave: "calzador", nombre: "Calzador", desc: "Gana con al menos un calzo acertado.", requiere: "calzarPermitido" },
  { clave: "sobrado", nombre: "Sobrado", desc: "Gana conservando 3 o más dados." },
  { clave: "manolimpia", nombre: "A mano limpia", desc: "Gana sin usar items ni el poder Suerte." },
  { clave: "relampago", nombre: "Relámpago", desc: "Gana rápido, sin dejar que la mesa se alargue." },
  { clave: "resucitado", nombre: "Resucitado", desc: "Gana habiendo pasado por el obligado (remontada desde 1 dado).", requiere: "obligadoActivo" },
  { clave: "alfilo", nombre: "Al filo", desc: "Gana con un solo dado en la mano: te salvaste raspando." },
  { clave: "doblete", nombre: "Doblete", desc: "Gana con dos calzos acertados o más.", requiere: "calzarPermitido" },
  { clave: "temerario", nombre: "Temerario", desc: "Gana con la apuesta de la mesa doblada al máximo." },
  { clave: "maraton", nombre: "Maratón", desc: "Aguanta una mesa larga, de esas que muelen, y gánala igual." },
  { clave: "cabalero", nombre: "Con la cábala", desc: "Gana habiendo usado el poder Suerte." },
];

function hashTexto(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** El desafío de la casa para un rival (determinista por su id). Si la mesa no
 *  cumple lo que ese desafío necesita (p. ej. no se puede calzar, o no hay
 *  obligado), se busca el siguiente desafío posible. */
export function desafioDe(rival: RivalHistoria): Desafio {
  const reglas = rival.habilidad?.reglas ?? {};
  const posible = (d: Desafio) => !d.requiere || reglas[d.requiere] !== false;
  const inicio = hashTexto(rival.id) % DESAFIOS.length;
  for (let i = 0; i < DESAFIOS.length; i++) {
    const d = DESAFIOS[(inicio + i) % DESAFIOS.length]!;
    if (posible(d)) return d;
  }
  return DESAFIOS[0]!; // impecable: siempre posible (red de seguridad)
}

/** Cuántas rondas cuentan como "rápido" para el desafío Relámpago, según el
 *  tamaño de la mesa (calibrado jugando partidas: ronda el 25° percentil). */
export function umbralRelampago(tamMesa: number): number {
  return 5 * (tamMesa - 1) + 2;
}

/** Desde cuántas rondas una mesa cuenta como "Maratón" (la mediana observada
 *  jugando partidas según el tamaño de la mesa). */
export function umbralMaraton(tamMesa: number): number {
  return 5 * tamMesa - 1;
}

/** Bono que paga el desafío: el premio base del rival (De Buena Cuna cobra +25%). */
export function bonoDesafio(rival: RivalHistoria, oficio?: OficioId): number {
  return oficio === "buenacuna" ? Math.round(rival.plata * 1.25) : rival.plata;
}

/** Montos de apuesta disponibles antes de sentarse (doblar o nada): nada, la
 *  mitad del premio, el premio entero o el doble — hasta donde alcance tu plata. */
export function opcionesApuesta(plata: number, premioBase: number): number[] {
  const brutas = [0, Math.floor(premioBase / 2), premioBase, premioBase * 2];
  return [...new Set(brutas.filter((m) => m === 0 || (m > 0 && m <= plata)))];
}

/** Mesa 1v1 contra el jefe final SECRETO (final verdadero). */
export function armarMesaSecreta(nombre: string): {
  jugadores: { id: string; nombre: string }[];
  nivelPorJugador: Record<string, Nivel>;
  reglas: ReglasCasa;
  dadoCargadoId: string | null;
  dadoCargadoIntentos: number;
} {
  const r = REY_VERDADERO;
  return {
    jugadores: [
      { id: HUMANO_ID, nombre },
      { id: r.id, nombre: r.nombre },
    ],
    nivelPorJugador: { [r.id]: r.nivel },
    reglas: crearReglas(r.habilidad?.reglas ?? {}),
    dadoCargadoId: r.habilidad?.dadoCargado ? r.id : null,
    dadoCargadoIntentos: r.habilidad?.dadoCargado ?? 8,
  };
}

// ---------------------------------------------------------------------------
// Vista para la UI
// ---------------------------------------------------------------------------

export type FaseHistoria = "intro" | "evento" | "acertijo" | "mesa" | "victoria" | "derrota" | "tienda" | "final";

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
  /** Clave de la estampa SVG que ilustra la escena (ver Escena.tsx). */
  imagen: string;
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
  /** En la intro: hay un secreto sin abrir en este barrio. */
  acertijoDisponible: { titulo: string } | null;
  /** El candado abierto en pantalla (fase "acertijo"). */
  acertijo: { titulo: string; texto: string; desenlace: string | null; fallo: string | null } | null;
  /** Marcas de tu pasado (lo que tus decisiones dejaron escrito). */
  marcas: string[];
  /** Qué final se está mostrando (fase "final"). */
  finalTipo: TipoFinal | null;
  /** Pasaje actual del epílogo del final (fase "final"): se recorre con historiaContinuar. */
  finalBeat: BeatVista | null;
  /** Pasaje de la cinemática de entrada del jefe (fase "intro"), mientras queden. */
  cinematica: BeatVista | null;
  /** Pasaje del epílogo de capítulo tras vencer al jefe (fase "victoria"), mientras queden. */
  epilogoBeat: BeatVista | null;
  /** En la victoria del Rey "público", se desbloqueó el jefe secreto. */
  haySecreto: boolean;
  /** El jefe te habla EN la mesa (bocadillo): texto y un número que cambia
   *  con cada frase nueva (para re-disparar el aviso en la UI). */
  comentarioMesa: { texto: string; n: number } | null;
  /** Nivel de Nueva Partida+ (0 = primera vuelta). */
  leyenda: number;
  /** El oficio del tahur (estilo elegido al empezar la campana). */
  oficio: Oficio | null;
  /** Logros recién desbloqueados (para el aviso; n cambia con cada tanda). */
  logro: { nombres: string[]; n: number } | null;
  /** La apuesta de la mesa (en la intro): monto elegido y opciones. */
  apuesta: { elegida: number; opciones: number[]; premioBase: number } | null;
  /** El desafío de la casa de esta mesa (intro, mesa y victoria). */
  desafio: { nombre: string; desc: string; bono: number } | null;
  /** Desglose del botín (en victoria): base + apuesta doblada + bono. */
  botin: { premioBase: number; apuestaExtra: number; bono: number; desafioCumplido: boolean | null; total: number } | null;
  /** Plata que se comió la mesa (en derrota, si había apuesta). */
  apuestaPerdida: number;
}
