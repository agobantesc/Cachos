import { agitarCacho, contarPinta, juntarDados, pasoValido, type Aleatorio } from "./dice.js";
import { validarApuesta } from "./bids.js";
import { REGLAS_POR_DEFECTO } from "./config.js";
import type {
  Accion,
  Apuesta,
  EstadoJuego,
  Jugador,
  Pinta,
  ReglasCasa,
  ResolucionRonda,
  Sentido,
} from "./types.js";

export interface JugadorInicial {
  id: string;
  nombre: string;
}

/** Sentidos con nombre, según el mapeo de `Sentido` en types.ts. */
export const IZQUIERDA: Sentido = 1;
export const DERECHA: Sentido = -1;

/** Error de regla: la acción no es legal en el estado actual. */
export class ErrorDeJuego extends Error {}

// ---------------------------------------------------------------------------
// Helpers de consulta (no mutan)
// ---------------------------------------------------------------------------

export function jugadorPorId(estado: EstadoJuego, id: string): Jugador | undefined {
  return estado.jugadores.find((j) => j.id === id);
}

export function jugadoresActivos(estado: EstadoJuego): Jugador[] {
  return estado.jugadores.filter((j) => !j.eliminado);
}

export function jugadorDeTurnoId(estado: EstadoJuego): string | null {
  return estado.ordenAsientos[estado.indiceTurno] ?? null;
}

/** Total de dados en la mesa (de jugadores activos). */
export function totalDadosEnMesa(estado: EstadoJuego): number {
  return jugadoresActivos(estado).reduce((acc, j) => acc + j.dados.length, 0);
}

/** ¿Los ases cuentan como comodín en la ronda actual (fuera de un desafío puntual)? */
export function asesComodinEnRonda(estado: EstadoJuego): boolean {
  if (!estado.reglas.asComodin) return false;
  if (estado.esRondaObligado && estado.reglas.obligadoAsesNoComodin) return false;
  return true;
}

/** ¿Se puede calzar ahora mismo? (regla de la mitad de dados + permiso global). */
export function puedeCalzarse(estado: EstadoJuego): boolean {
  if (!estado.reglas.calzarPermitido) return false;
  if (
    estado.reglas.calzarSoloConMitadDeDados &&
    totalDadosEnMesa(estado) < estado.dadosInicialesTotales / 2
  ) {
    return false;
  }
  return true;
}

/**
 * Vista de un jugador: qué dados puede ver de cada quien DURANTE la ronda.
 * - Ronda normal: ve sólo los suyos.
 * - Ronda cerrada (obligado): ve los suyos sólo si tiene exactamente 1 dado;
 *   con 2+ dados juega a ciegas. Nunca ve los de otros hasta el reveal.
 * Devuelve un mapa id -> caras visibles (o null si están ocultas).
 */
export function vistaDeJugador(
  estado: EstadoJuego,
  observadorId: string,
): Record<string, Pinta[] | null> {
  const vista: Record<string, Pinta[] | null> = {};
  for (const j of estado.jugadores) {
    if (j.id !== observadorId) {
      vista[j.id] = null;
      continue;
    }
    const puedeVerLosSuyos = !estado.esRondaCerrada || j.dados.length === 1;
    vista[j.id] = puedeVerLosSuyos ? [...j.dados] : null;
  }
  return vista;
}

// ---------------------------------------------------------------------------
// Recorrido de la mesa (sensible al sentido)
// ---------------------------------------------------------------------------

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

function indiceDeId(estado: EstadoJuego, id: string): number {
  return estado.ordenAsientos.indexOf(id);
}

/**
 * Busca el primer asiento ACTIVO partiendo de `desde` y avanzando en `sentido`.
 * Si `incluirDesde` es true, considera primero el propio `desde`.
 */
function buscarActivo(
  estado: EstadoJuego,
  desde: number,
  sentido: Sentido,
  incluirDesde: boolean,
): number {
  const n = estado.ordenAsientos.length;
  const inicio = incluirDesde ? 0 : 1;
  for (let p = inicio; p <= inicio + n; p++) {
    const idx = mod(desde + p * sentido, n);
    const j = jugadorPorId(estado, estado.ordenAsientos[idx]!);
    if (j && !j.eliminado) return idx;
  }
  return desde;
}

/** Siguiente asiento activo según el sentido del juego (para avanzar el turno). */
function siguienteActivo(estado: EstadoJuego, desde: number): number {
  return buscarActivo(estado, desde, estado.sentido, false);
}

// ---------------------------------------------------------------------------
// Creación e inicio de ronda
// ---------------------------------------------------------------------------

export function crearJuego(
  jugadores: JugadorInicial[],
  reglas: ReglasCasa = REGLAS_POR_DEFECTO,
): EstadoJuego {
  if (jugadores.length < 2) {
    throw new ErrorDeJuego("Se necesitan al menos 2 jugadores.");
  }
  const ids = new Set(jugadores.map((j) => j.id));
  if (ids.size !== jugadores.length) {
    throw new ErrorDeJuego("Hay ids de jugador repetidos.");
  }

  const jugadoresEstado: Jugador[] = jugadores.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    // Se rellenan en iniciarRonda; acá sólo fijamos la cantidad de dados.
    dados: new Array<Pinta>(reglas.dadosIniciales).fill(1),
    eliminado: false,
    yaJugoObligado: false,
  }));

  return {
    reglas,
    jugadores: jugadoresEstado,
    ordenAsientos: jugadores.map((j) => j.id),
    sentido: IZQUIERDA,
    dadosInicialesTotales: jugadores.length * reglas.dadosIniciales,
    indiceTurno: 0,
    abridorRondaId: null,
    apuestaActual: null,
    apuestaActualJugadorId: null,
    apuestasEnRonda: 0,
    pasoPendienteJugadorId: null,
    esRondaObligado: false,
    esRondaCerrada: false,
    fase: "LOBBY",
    numeroRonda: 0,
    ganadorId: null,
    ultimaResolucion: null,
  };
}

export interface OpcionesRonda {
  /** Fuente de aleatoriedad para agitar los cachos (y el primer abridor). */
  rng?: Aleatorio;
  /** Sentido elegido por el abridor para esta ronda. Por defecto mantiene el anterior. */
  sentido?: Sentido;
}

/**
 * Inicia una nueva ronda: fija al abridor, elige sentido, agita los cachos y
 * decide si la ronda es de obligado/cerrada.
 *
 * El abridor es `abridorRondaId` (definido por la resolución anterior). Si es la
 * primera ronda (null), se elige al AZAR. Si el abridor designado quedó
 * eliminado, abre el jugador a su DERECHA.
 */
export function iniciarRonda(estado: EstadoJuego, opciones: OpcionesRonda = {}): EstadoJuego {
  if (estado.fase === "FIN_JUEGO") {
    throw new ErrorDeJuego("El juego ya terminó.");
  }
  const rng = opciones.rng ?? Math.random;
  const e = structuredClone(estado);

  if (opciones.sentido !== undefined) e.sentido = opciones.sentido;

  // Determinar el abridor.
  let idxAbridor: number;
  if (e.abridorRondaId === null) {
    // Primera ronda: abridor al azar.
    const activos = jugadoresActivos(e);
    const elegido = activos[Math.floor(rng() * activos.length)] ?? activos[0]!;
    idxAbridor = indiceDeId(e, elegido.id);
  } else if (!jugadorPorId(e, e.abridorRondaId)?.eliminado) {
    idxAbridor = indiceDeId(e, e.abridorRondaId);
  } else {
    // El perdedor quedó eliminado: abre el jugador a su derecha.
    idxAbridor = buscarActivo(e, indiceDeId(e, e.abridorRondaId), DERECHA, false);
  }

  e.indiceTurno = idxAbridor;
  const abridor = jugadorPorId(e, e.ordenAsientos[idxAbridor]!)!;
  e.abridorRondaId = abridor.id;

  // Re-lanzar los dados de todos los activos (cada uno conserva su cantidad).
  for (const j of e.jugadores) {
    if (!j.eliminado) j.dados = agitarCacho(j.dados.length, rng);
  }

  // Obligado: se gatilla la primera vez que el abridor abre con 1 dado.
  const gatillaObligado =
    e.reglas.obligadoActivo && abridor.dados.length === 1 && !abridor.yaJugoObligado;
  e.esRondaObligado = gatillaObligado;
  e.esRondaCerrada = gatillaObligado && e.reglas.obligadoCerradoParaOtros;
  if (gatillaObligado) abridor.yaJugoObligado = true;

  e.apuestaActual = null;
  e.apuestaActualJugadorId = null;
  e.apuestasEnRonda = 0;
  e.pasoPendienteJugadorId = null;
  e.ultimaResolucion = null;
  e.fase = "EN_RONDA";
  e.numeroRonda += 1;
  return e;
}

// ---------------------------------------------------------------------------
// Aplicar acciones
// ---------------------------------------------------------------------------

export function aplicarAccion(estado: EstadoJuego, accion: Accion): EstadoJuego {
  if (estado.fase !== "EN_RONDA") {
    throw new ErrorDeJuego(`No se pueden aplicar acciones en la fase ${estado.fase}.`);
  }
  if (accion.jugadorId !== jugadorDeTurnoId(estado)) {
    throw new ErrorDeJuego("No es el turno de ese jugador.");
  }

  // Con un paso pendiente, el siguiente solo puede dudar el paso o subir la
  // apuesta: no puede dudar/calzar la apuesta previa al paso, ni volver a pasar.
  if (estado.pasoPendienteJugadorId !== null && accion.tipo !== "APOSTAR" && accion.tipo !== "DUDAR_PASO") {
    throw new ErrorDeJuego("Hay un paso pendiente: solo puedes dudar el paso o subir la apuesta.");
  }

  switch (accion.tipo) {
    case "APOSTAR":
      return aplicarApostar(estado, accion.jugadorId, accion.apuesta);
    case "DUDAR":
      return aplicarDesafio(estado, accion.jugadorId, "DUDO");
    case "CALZAR":
      return aplicarDesafio(estado, accion.jugadorId, "CALZO");
    case "PASAR":
      return aplicarPasar(estado, accion.jugadorId);
    case "DUDAR_PASO":
      return aplicarDudarPaso(estado, accion.jugadorId);
  }
}

function aplicarApostar(estado: EstadoJuego, jugadorId: string, apuesta: Apuesta): EstadoJuego {
  const val = validarApuesta(estado.apuestaActual, apuesta);
  if (!val.valida) {
    throw new ErrorDeJuego(val.motivo ?? "Apuesta inválida.");
  }

  // Obligado: sólo quien tiene 1 dado puede cambiar la pinta; el resto debe
  // mantenerla (sólo agrandar la cantidad).
  if (estado.esRondaObligado && estado.apuestaActual !== null) {
    const jugador = jugadorPorId(estado, jugadorId)!;
    if (jugador.dados.length > 1 && apuesta.pinta !== estado.apuestaActual.pinta) {
      throw new ErrorDeJuego(
        "Obligado: con más de 1 dado no puedes cambiar la pinta, sólo subir la cantidad.",
      );
    }
  }

  const e = structuredClone(estado);
  // Subir la apuesta acepta tácitamente un paso pendiente (queda validado de hecho).
  e.pasoPendienteJugadorId = null;
  e.apuestaActual = { ...apuesta };
  e.apuestaActualJugadorId = jugadorId;
  e.apuestasEnRonda += 1;
  e.indiceTurno = siguienteActivo(e, e.indiceTurno);
  return e;
}

/**
 * Pasar el turno. Solo se permite con los 5 dados, en ronda normal y sin un paso
 * ya pendiente. No toca la apuesta; pasa el turno al siguiente, que deberá dudar
 * el paso o subir la apuesta.
 */
function aplicarPasar(estado: EstadoJuego, jugadorId: string): EstadoJuego {
  if (estado.esRondaObligado) {
    throw new ErrorDeJuego("No se puede pasar en una ronda de obligado.");
  }
  const jugador = jugadorPorId(estado, jugadorId)!;
  if (jugador.dados.length !== estado.reglas.dadosIniciales) {
    throw new ErrorDeJuego("Solo se puede pasar con los 5 dados.");
  }
  const e = structuredClone(estado);
  e.pasoPendienteJugadorId = jugadorId;
  e.indiceTurno = siguienteActivo(e, e.indiceTurno);
  return e;
}

/**
 * Dudar el paso del jugador anterior. Si el paso estaba validado (5 iguales,
 * todos distintos o full), pierde el que dudó; si no, pierde el que pasó.
 */
function aplicarDudarPaso(estado: EstadoJuego, dudadorId: string): EstadoJuego {
  const pasadorIdPendiente = estado.pasoPendienteJugadorId;
  if (pasadorIdPendiente === null) {
    throw new ErrorDeJuego("No hay ningún paso que dudar.");
  }
  const e = structuredClone(estado);
  const pasador = jugadorPorId(e, pasadorIdPendiente)!;
  const valido = pasoValido(pasador.dados);
  const perdedorId = valido ? dudadorId : pasador.id;

  const resolucion: ResolucionRonda = {
    tipo: "PASO",
    pinta: 1,
    cantidadDeclarada: 0,
    cantidadReal: 0,
    asesComoComodin: false,
    perdedorId,
    dadosPerdidos: 1,
    ganadorDadoId: null,
    siciliana: false,
    dadosRevelados: { [pasador.id]: [...pasador.dados] },
    pasadorId: pasador.id,
    pasoEraValido: valido,
  };

  e.pasoPendienteJugadorId = null;
  aplicarConsecuencias(e, resolucion);
  e.ultimaResolucion = resolucion;

  const activos = jugadoresActivos(e);
  if (activos.length <= 1) {
    e.fase = "FIN_JUEGO";
    e.ganadorId = activos[0]?.id ?? null;
    return e;
  }
  e.fase = "FIN_RONDA";
  return e;
}

function aplicarDesafio(
  estado: EstadoJuego,
  jugadorId: string,
  tipo: "DUDO" | "CALZO",
): EstadoJuego {
  if (estado.apuestaActual === null || estado.apuestaActualJugadorId === null) {
    throw new ErrorDeJuego("No hay apuesta que desafiar; el abridor debe apostar primero.");
  }
  const jugador = jugadorPorId(estado, jugadorId)!;

  if (tipo === "CALZO") {
    if (!puedeCalzarse(estado)) {
      throw new ErrorDeJuego("El calzo no está disponible (regla de la mitad de los dados).");
    }
    // Obligado: con más de 1 dado sólo se puede dudar o agrandar, no calzar.
    if (estado.esRondaObligado && jugador.dados.length > 1) {
      throw new ErrorDeJuego("Obligado: con más de 1 dado no puedes calzar.");
    }
  }

  const e = structuredClone(estado);
  const apuesta = e.apuestaActual!;

  // La siciliana: dudo a la PRIMERA apuesta de la ronda, hecha por el abridor.
  // En ese conteo los ases NO valen como comodín. No aplica en rondas de
  // obligado (cuando alguien está obligando no hay siciliana).
  const siciliana =
    tipo === "DUDO" &&
    e.reglas.sicilianaActiva &&
    !e.esRondaObligado &&
    e.apuestasEnRonda === 1 &&
    e.apuestaActualJugadorId === e.abridorRondaId;

  const asesComodin = asesComodinEnRonda(e) && !siciliana;
  const todos = juntarDados(jugadoresActivos(e).map((j) => j.dados));
  const real = contarPinta(todos, apuesta.pinta, asesComodin);

  const dadosRevelados: Record<string, Pinta[]> = {};
  for (const j of jugadoresActivos(e)) dadosRevelados[j.id] = [...j.dados];

  const resolucion =
    tipo === "DUDO"
      ? resolverDudo(e, jugadorId, apuesta, real, asesComodin, siciliana, dadosRevelados)
      : resolverCalzo(e, jugadorId, apuesta, real, asesComodin, dadosRevelados);

  aplicarConsecuencias(e, resolucion);
  e.ultimaResolucion = resolucion;

  const activos = jugadoresActivos(e);
  if (activos.length <= 1) {
    e.fase = "FIN_JUEGO";
    e.ganadorId = activos[0]?.id ?? null;
    return e;
  }

  e.fase = "FIN_RONDA";
  return e;
}

function resolverDudo(
  estado: EstadoJuego,
  dudadorId: string,
  apuesta: Apuesta,
  real: number,
  asesComodin: boolean,
  siciliana: boolean,
  dadosRevelados: Record<string, Pinta[]>,
): ResolucionRonda {
  // Dudo: "no hay tantos". Si real >= cantidad, la apuesta era buena y pierde el
  // dudador; si no, pierde el apostador.
  const apuestaSeCumple = real >= apuesta.cantidad;
  const perdedorId = apuestaSeCumple ? dudadorId : estado.apuestaActualJugadorId!;
  const dadosPerdidos = siciliana ? estado.reglas.sicilianaDadosPerdidos : 1;

  return {
    tipo: "DUDO",
    pinta: apuesta.pinta,
    cantidadDeclarada: apuesta.cantidad,
    cantidadReal: real,
    asesComoComodin: asesComodin,
    perdedorId,
    dadosPerdidos,
    ganadorDadoId: null,
    siciliana,
    dadosRevelados,
  };
}

function resolverCalzo(
  estado: EstadoJuego,
  calzadorId: string,
  apuesta: Apuesta,
  real: number,
  asesComodin: boolean,
  dadosRevelados: Record<string, Pinta[]>,
): ResolucionRonda {
  const exacto = real === apuesta.cantidad;
  const calzador = jugadorPorId(estado, calzadorId)!;
  const puedeRecuperar =
    estado.reglas.calzarRecuperaDado && calzador.dados.length < estado.reglas.dadosIniciales;

  const base = {
    tipo: "CALZO" as const,
    pinta: apuesta.pinta,
    cantidadDeclarada: apuesta.cantidad,
    cantidadReal: real,
    asesComoComodin: asesComodin,
    siciliana: false,
    dadosRevelados,
  };

  if (exacto) {
    return {
      ...base,
      perdedorId: null,
      dadosPerdidos: 0,
      ganadorDadoId: puedeRecuperar ? calzadorId : null,
    };
  }
  return { ...base, perdedorId: calzadorId, dadosPerdidos: 1, ganadorDadoId: null };
}

/** Aplica pérdida/ganancia de dados y define quién abre la próxima ronda. */
function aplicarConsecuencias(estado: EstadoJuego, r: ResolucionRonda): void {
  let proximoAbridor: string | null = null;

  if (r.ganadorDadoId) {
    const ganador = jugadorPorId(estado, r.ganadorDadoId)!;
    if (ganador.dados.length < estado.reglas.dadosIniciales) ganador.dados.push(1);
    proximoAbridor = r.ganadorDadoId; // el que calza acertando abre la siguiente.
  }

  if (r.perdedorId) {
    const perdedor = jugadorPorId(estado, r.perdedorId)!;
    for (let i = 0; i < r.dadosPerdidos && perdedor.dados.length > 0; i++) {
      perdedor.dados.pop();
    }
    if (perdedor.dados.length === 0) perdedor.eliminado = true;
    // El perdedor abre la siguiente ronda. Si quedó eliminado, iniciarRonda
    // pasa el turno al jugador a su derecha.
    proximoAbridor = r.perdedorId;
  }

  estado.abridorRondaId = proximoAbridor;
}
