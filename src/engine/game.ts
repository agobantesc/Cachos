import { agitarCacho, contarPinta, juntarDados, type Aleatorio } from "./dice.js";
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
} from "./types.js";

export interface JugadorInicial {
  id: string;
  nombre: string;
}

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

/** ¿Los ases cuentan como comodín en la ronda actual? */
export function asesComodinEnRonda(estado: EstadoJuego): boolean {
  if (!estado.reglas.asComodin) return false;
  if (estado.esRondaObligado && estado.reglas.obligadoAsesNoComodin) return false;
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
    indiceTurno: 0,
    abridorRondaId: null,
    apuestaActual: null,
    apuestaActualJugadorId: null,
    apuestasEnRonda: 0,
    esRondaObligado: false,
    esRondaCerrada: false,
    fase: "LOBBY",
    numeroRonda: 0,
    ganadorId: null,
    ultimaResolucion: null,
  };
}

function indiceDeId(estado: EstadoJuego, id: string): number {
  return estado.ordenAsientos.indexOf(id);
}

function siguienteIndiceActivo(estado: EstadoJuego, desde: number): number {
  const n = estado.ordenAsientos.length;
  for (let paso = 1; paso <= n; paso++) {
    const idx = (desde + paso) % n;
    const j = jugadorPorId(estado, estado.ordenAsientos[idx]!);
    if (j && !j.eliminado) return idx;
  }
  return desde;
}

/** Primer jugador activo a partir de un índice (incluyéndolo). */
function indiceActivoDesde(estado: EstadoJuego, desde: number): number {
  const n = estado.ordenAsientos.length;
  for (let paso = 0; paso < n; paso++) {
    const idx = (desde + paso) % n;
    const j = jugadorPorId(estado, estado.ordenAsientos[idx]!);
    if (j && !j.eliminado) return idx;
  }
  return desde;
}

/**
 * Inicia una nueva ronda: agita los cachos, fija al abridor, decide si la ronda
 * es de obligado/cerrada y resetea la apuesta. El abridor es `abridorRondaId`
 * (definido por la resolución anterior) o, si no hay, el primer asiento activo.
 */
export function iniciarRonda(estado: EstadoJuego, rng: Aleatorio = Math.random): EstadoJuego {
  if (estado.fase === "FIN_JUEGO") {
    throw new ErrorDeJuego("El juego ya terminó.");
  }
  const e = structuredClone(estado);

  // Determinar el abridor.
  let idxAbridor: number;
  if (e.abridorRondaId && !jugadorPorId(e, e.abridorRondaId)?.eliminado) {
    idxAbridor = indiceActivoDesde(e, indiceDeId(e, e.abridorRondaId));
  } else if (e.abridorRondaId) {
    // El abridor designado quedó eliminado: pasa al siguiente activo.
    idxAbridor = siguienteIndiceActivo(e, indiceDeId(e, e.abridorRondaId));
  } else {
    idxAbridor = indiceActivoDesde(e, 0);
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
  e.ultimaResolucion = null;
  e.fase = "EN_RONDA";
  e.numeroRonda += 1;
  return e;
}

// ---------------------------------------------------------------------------
// Aplicar acciones
// ---------------------------------------------------------------------------

export function aplicarAccion(
  estado: EstadoJuego,
  accion: Accion,
  rng: Aleatorio = Math.random,
): EstadoJuego {
  if (estado.fase !== "EN_RONDA") {
    throw new ErrorDeJuego(`No se pueden aplicar acciones en la fase ${estado.fase}.`);
  }
  const turnoId = jugadorDeTurnoId(estado);
  if (accion.jugadorId !== turnoId) {
    throw new ErrorDeJuego("No es el turno de ese jugador.");
  }

  switch (accion.tipo) {
    case "APOSTAR":
      return aplicarApostar(estado, accion.jugadorId, accion.apuesta);
    case "DUDAR":
      return aplicarDesafio(estado, accion.jugadorId, "DUDO", rng);
    case "CALZAR":
      return aplicarDesafio(estado, accion.jugadorId, "CALZO", rng);
  }
}

function aplicarApostar(estado: EstadoJuego, jugadorId: string, apuesta: Apuesta): EstadoJuego {
  const val = validarApuesta(estado.apuestaActual, apuesta);
  if (!val.valida) {
    throw new ErrorDeJuego(val.motivo ?? "Apuesta inválida.");
  }
  const e = structuredClone(estado);
  e.apuestaActual = { ...apuesta };
  e.apuestaActualJugadorId = jugadorId;
  e.apuestasEnRonda += 1;
  e.indiceTurno = siguienteIndiceActivo(e, e.indiceTurno);
  return e;
}

function aplicarDesafio(
  estado: EstadoJuego,
  jugadorId: string,
  tipo: "DUDO" | "CALZO",
  rng: Aleatorio,
): EstadoJuego {
  if (estado.apuestaActual === null || estado.apuestaActualJugadorId === null) {
    throw new ErrorDeJuego("No hay apuesta que desafiar; el abridor debe apostar primero.");
  }
  if (tipo === "CALZO" && !estado.reglas.calzarPermitido) {
    throw new ErrorDeJuego("El calzo no está permitido en esta partida.");
  }

  const e = structuredClone(estado);
  const apuesta = e.apuestaActual!;
  const asesComodin = asesComodinEnRonda(e);
  const todos = juntarDados(jugadoresActivos(e).map((j) => j.dados));
  const real = contarPinta(todos, apuesta.pinta, asesComodin);

  const dadosRevelados: Record<string, Pinta[]> = {};
  for (const j of jugadoresActivos(e)) dadosRevelados[j.id] = [...j.dados];

  let resolucion: ResolucionRonda;
  if (tipo === "DUDO") {
    resolucion = resolverDudo(e, jugadorId, apuesta, real, asesComodin, dadosRevelados);
  } else {
    resolucion = resolverCalzo(e, jugadorId, apuesta, real, asesComodin, dadosRevelados);
  }

  aplicarConsecuencias(e, resolucion);
  e.ultimaResolucion = resolucion;

  // ¿Terminó el juego?
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
  dadosRevelados: Record<string, Pinta[]>,
): ResolucionRonda {
  // Dudo: "no hay tantos". Si real >= cantidad, la apuesta era buena y pierde el
  // dudador; si no, pierde el apostador.
  const apuestaSeCumple = real >= apuesta.cantidad;
  const perdedorId = apuestaSeCumple ? dudadorId : estado.apuestaActualJugadorId!;

  // La siciliana: dudo a la PRIMERA apuesta de la ronda, hecha por el abridor.
  const siciliana =
    estado.reglas.sicilianaActiva &&
    estado.apuestasEnRonda === 1 &&
    estado.apuestaActualJugadorId === estado.abridorRondaId;
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

  if (exacto) {
    return {
      tipo: "CALZO",
      pinta: apuesta.pinta,
      cantidadDeclarada: apuesta.cantidad,
      cantidadReal: real,
      asesComoComodin: asesComodin,
      perdedorId: null,
      dadosPerdidos: 0,
      ganadorDadoId: puedeRecuperar ? calzadorId : null,
      siciliana: false,
      dadosRevelados,
    };
  }
  return {
    tipo: "CALZO",
    pinta: apuesta.pinta,
    cantidadDeclarada: apuesta.cantidad,
    cantidadReal: real,
    asesComoComodin: asesComodin,
    perdedorId: calzadorId,
    dadosPerdidos: 1,
    ganadorDadoId: null,
    siciliana: false,
    dadosRevelados,
  };
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
    // El perdedor abre la siguiente ronda (si quedó eliminado, iniciarRonda
    // avanza al siguiente activo).
    proximoAbridor = r.perdedorId;
  }

  estado.abridorRondaId = proximoAbridor;
}
