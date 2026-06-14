/**
 * Tipos del dominio del Cacho (Dudo chileno).
 *
 * Glosario rápido:
 *  - Pinta: la cara del dado (1..6).
 *  - As: la pinta 1; normalmente es comodín y cuenta como cualquier pinta.
 *  - Apuesta: declaración "hay al menos N dados de la pinta P en la mesa".
 *  - Dudar: desafiar la apuesta actual ("creo que no hay tantos").
 *  - Calzar: declarar que la cantidad es EXACTA.
 *  - Obligado: ronda especial que se gatilla cuando un jugador queda con 1 dado.
 */

/** Cara de un dado. 1 = As, 2 = Tonto, 3 = Tren, 4 = Cuadra, 5 = Quina, 6 = Sexta. */
export type Pinta = 1 | 2 | 3 | 4 | 5 | 6;

/** Nombres de las pintas, útil para la UI y los logs. */
export const NOMBRE_PINTA: Record<Pinta, string> = {
  1: "As",
  2: "Tonto",
  3: "Tren",
  4: "Cuadra",
  5: "Quina",
  6: "Sexta",
};

/** Una apuesta: "cantidad" dados mostrando "pinta". Ej: { cantidad: 4, pinta: 5 } = "cuatro quinas". */
export interface Apuesta {
  cantidad: number;
  pinta: Pinta;
}

/** Lo que un jugador "dijo" en la ronda (para la bitácora / globos). */
export type EventoRonda =
  | { tipo: "APUESTA"; jugadorId: string; apuesta: Apuesta }
  | { tipo: "PASO"; jugadorId: string };

/**
 * Sentido del juego alrededor de la mesa. El abridor de cada ronda lo elige.
 *  - 1  = hacia la IZQUIERDA (avanza al siguiente asiento de `ordenAsientos`).
 *  - -1 = hacia la DERECHA (avanza al asiento anterior de `ordenAsientos`).
 */
export type Sentido = 1 | -1;

/** Estadísticas acumuladas de un jugador durante toda la partida. */
export interface EstadisticasJugador {
  /** Total de dados perdidos (dudos perdidos, calzos fallidos, pasos dudados). */
  dadosPerdidos: number;
  /** Calzos acertados (la cantidad era exacta). */
  calzosAcertados: number;
}

export interface Jugador {
  id: string;
  nombre: string;
  /** Caras actuales de los dados de este jugador (información privada). */
  dados: Pinta[];
  /** true cuando el jugador se quedó sin dados. */
  eliminado: boolean;
  /** Número de ronda en que fue eliminado (null si sigue en pie / ganó). */
  eliminadoEnRonda: number | null;
  /**
   * true cuando este jugador ya vivió su ronda de "obligado".
   * (En esta casa el obligado se juega la primera vez que el jugador llega a 1 dado.)
   */
  yaJugoObligado: boolean;
  /** Estadísticas acumuladas para el resumen final. */
  stats: EstadisticasJugador;
}

/** Fase de la máquina de estados del juego. */
export type Fase =
  | "LOBBY" // esperando que empiece la partida
  | "EN_RONDA" // esperando la acción del jugador de turno
  | "FIN_RONDA" // se reveló y resolvió; lista para iniciar la siguiente ronda
  | "FIN_JUEGO"; // queda un solo jugador en pie

/** Acciones que un jugador puede ejecutar en su turno. */
export type Accion =
  | { tipo: "APOSTAR"; jugadorId: string; apuesta: Apuesta }
  | { tipo: "DUDAR"; jugadorId: string }
  | { tipo: "CALZAR"; jugadorId: string }
  /** Pasar el turno (solo con los 5 dados). El siguiente duda el paso o sube. */
  | { tipo: "PASAR"; jugadorId: string }
  /** Dudar el paso del jugador anterior. */
  | { tipo: "DUDAR_PASO"; jugadorId: string };

/** Resultado de revelar la mesa tras un Dudo, un Calzo o un Paso dudado. */
export interface ResolucionRonda {
  tipo: "DUDO" | "CALZO" | "PASO";
  /** Pinta sobre la que se contó (la de la apuesta vigente; sin uso en PASO). */
  pinta: Pinta;
  /** Cantidad declarada en la apuesta vigente. */
  cantidadDeclarada: number;
  /** Cantidad real contada en la mesa (con/sin comodín según la ronda). */
  cantidadReal: number;
  /** Si los ases contaron como comodín en este conteo. */
  asesComoComodin: boolean;
  /** Jugador que perdió dados (null si nadie perdió, p.ej. calzo acertado). */
  perdedorId: string | null;
  /** Cuántos dados perdió el perdedor (1 normal, 2 con "la siciliana"). */
  dadosPerdidos: number;
  /** Jugador que ganó un dado (sólo en calzo acertado), si aplica. */
  ganadorDadoId: string | null;
  /** true si se aplicó la regla "la siciliana". */
  siciliana: boolean;
  /** Caras de todos los dados reveladas, por jugador, para mostrar en la UI. */
  dadosRevelados: Record<string, Pinta[]>;
  /** (Solo PASO) jugador que pasó. */
  pasadorId?: string | null;
  /** (Solo PASO) si el paso estaba validado (5 iguales, todos distintos o full). */
  pasoEraValido?: boolean;
}

export interface EstadoJuego {
  reglas: ReglasCasa;
  jugadores: Jugador[];
  /** Orden de los asientos en la mesa (ids). El turno avanza según `sentido`. */
  ordenAsientos: string[];
  /** Sentido del juego en la ronda actual (lo elige el abridor). */
  sentido: Sentido;
  /** Total de dados con que partió la mesa (jugadores iniciales · dadosIniciales). Constante. */
  dadosInicialesTotales: number;
  /** Índice dentro de ordenAsientos del jugador con el turno. */
  indiceTurno: number;
  /** Id del jugador que abrió (inició) la ronda actual. */
  abridorRondaId: string | null;
  /** Apuesta vigente, o null si nadie ha apostado aún en la ronda. */
  apuestaActual: Apuesta | null;
  /** Id del jugador dueño de la apuesta vigente. */
  apuestaActualJugadorId: string | null;
  /** Cuántas apuestas se han hecho en la ronda actual (para "la siciliana"). */
  apuestasEnRonda: number;
  /** Si hay un "paso" pendiente de resolver, el id de quien pasó; si no, null. */
  pasoPendienteJugadorId: string | null;
  /** Lo que cada jugador declaró en la ronda actual, en orden (apuestas y pasos). */
  historialRonda: EventoRonda[];
  /** Ronda "obligado": gatillada cuando el abridor tiene 1 dado. */
  esRondaObligado: boolean;
  /** Ronda "cerrada": los jugadores no ven sus propios dados (salvo excepciones). */
  esRondaCerrada: boolean;
  fase: Fase;
  numeroRonda: number;
  ganadorId: string | null;
  /** Ids en el orden en que fueron eliminados (para calcular el puesto final). */
  ordenEliminacion: string[];
  /** Detalle de la última resolución (para que la UI muestre el reveal). */
  ultimaResolucion: ResolucionRonda | null;
}

/**
 * Reglas de la casa. Todo lo que varía entre grupos vive acá, para poder
 * ajustarlo sin tocar la lógica. Los defaults están en config.ts.
 */
export interface ReglasCasa {
  /** Dados con los que parte cada jugador. */
  dadosIniciales: number;
  /** El As es comodín en rondas normales. */
  asComodin: boolean;

  // --- Obligado ---
  /** Activar la ronda especial de "obligado" cuando un jugador llega a 1 dado. */
  obligadoActivo: boolean;
  /**
   * Variante de la casa: cuando alguien obliga, la ronda es CERRADA para los
   * demás (juegan a ciegas), salvo los jugadores que también tengan 1 dado,
   * que sí pueden ver el suyo.
   */
  obligadoCerradoParaOtros: boolean;
  /**
   * Variante de la casa: en la ronda de obligado los ases NO son comodín;
   * cuentan sólo como la pinta 1.
   */
  obligadoAsesNoComodin: boolean;

  // --- La siciliana ---
  /**
   * Variante de la casa: si un jugador DUDA de inmediato la apuesta con que el
   * abridor abrió la ronda (primera apuesta de la ronda), el perdedor pierde 2
   * dados en vez de 1.
   */
  sicilianaActiva: boolean;
  /** Dados que pierde el perdedor cuando aplica la siciliana. */
  sicilianaDadosPerdidos: number;

  // --- Calzar ---
  /** Permitir la acción de calzar. */
  calzarPermitido: boolean;
  /** Un calzo acertado recupera un dado (hasta el máximo de dadosIniciales). */
  calzarRecuperaDado: boolean;
  /**
   * Sólo se puede calzar mientras en la mesa quede al menos la MITAD de los dados
   * iniciales totales. Ej: 4 jugadores · 5 dados = 20; se puede calzar con ≥ 10.
   */
  calzarSoloConMitadDeDados: boolean;
}
