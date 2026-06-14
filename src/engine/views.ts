/**
 * Proyecciones de la mesa para la red.
 *
 * El estado completo (`EstadoJuego`) tiene las caras de TODOS los dados, así que
 * jamás se manda entero a los clientes. En su lugar derivamos:
 *
 *  - `EstadoPublico`: lo que cualquiera puede ver de la mesa —jugadores, cuántos
 *    dados tiene cada uno (los vasos), de quién es el turno, la apuesta vigente—
 *    SIN las caras secretas. Cuando hay un dudo/calzo, incluye `ultimaResolucion`
 *    con los dados revelados de todos (la revelación es pública).
 *  - `VistaJugador`: lo público + la mano propia del jugador (o null si juega a
 *    ciegas en una ronda cerrada).
 */
import type {
  Apuesta,
  EstadoJuego,
  Fase,
  Pinta,
  ResolucionRonda,
  Sentido,
} from "./types.js";
import {
  jugadorDeTurnoId,
  puedeCalzarse,
  totalDadosEnMesa,
  vistaDeJugador,
} from "./game.js";

/** Jugador tal como lo ve la mesa: el vaso (cuántos dados), no las caras. */
export interface JugadorPublico {
  id: string;
  nombre: string;
  cantidadDados: number;
  eliminado: boolean;
  yaJugoObligado: boolean;
}

/** Estado público de la mesa (sin dados secretos). */
export interface EstadoPublico {
  jugadores: JugadorPublico[];
  ordenAsientos: string[];
  sentido: Sentido;
  dadosInicialesTotales: number;
  indiceTurno: number;
  turnoJugadorId: string | null;
  abridorRondaId: string | null;
  apuestaActual: Apuesta | null;
  apuestaActualJugadorId: string | null;
  apuestasEnRonda: number;
  esRondaObligado: boolean;
  esRondaCerrada: boolean;
  fase: Fase;
  numeroRonda: number;
  ganadorId: string | null;
  totalDadosEnMesa: number;
  /** Dados con que parte cada jugador (para saber quién puede pasar). */
  dadosIniciales: number;
  /** Id de quien dejó un "paso" pendiente, o null. */
  pasoPendienteJugadorId: string | null;
  /** Si en este momento alguien podría calzar (regla de la mitad de dados). */
  calzoDisponible: boolean;
  /** Revelación del último dudo/calzo (dados de todos). null durante la ronda. */
  ultimaResolucion: ResolucionRonda | null;
}

/** Proyección pública: el estado tal como lo ve la mesa, sin caras secretas. */
export function proyeccionPublica(estado: EstadoJuego): EstadoPublico {
  return {
    jugadores: estado.jugadores.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      cantidadDados: j.dados.length,
      eliminado: j.eliminado,
      yaJugoObligado: j.yaJugoObligado,
    })),
    ordenAsientos: [...estado.ordenAsientos],
    sentido: estado.sentido,
    dadosInicialesTotales: estado.dadosInicialesTotales,
    indiceTurno: estado.indiceTurno,
    turnoJugadorId: jugadorDeTurnoId(estado),
    abridorRondaId: estado.abridorRondaId,
    apuestaActual: estado.apuestaActual ? { ...estado.apuestaActual } : null,
    apuestaActualJugadorId: estado.apuestaActualJugadorId,
    apuestasEnRonda: estado.apuestasEnRonda,
    esRondaObligado: estado.esRondaObligado,
    esRondaCerrada: estado.esRondaCerrada,
    fase: estado.fase,
    numeroRonda: estado.numeroRonda,
    ganadorId: estado.ganadorId,
    totalDadosEnMesa: totalDadosEnMesa(estado),
    dadosIniciales: estado.reglas.dadosIniciales,
    pasoPendienteJugadorId: estado.pasoPendienteJugadorId,
    calzoDisponible: estado.fase === "EN_RONDA" && estado.apuestaActual !== null && puedeCalzarse(estado),
    // El reveal es público por naturaleza: en un dudo/calzo todos ven todo.
    ultimaResolucion: estado.ultimaResolucion
      ? structuredClone(estado.ultimaResolucion)
      : null,
  };
}

/** Lo que se le entrega a un cliente concreto: la mesa pública + su mano. */
export interface VistaJugador {
  publico: EstadoPublico;
  /** Caras propias visibles, o null si juega a ciegas (cerrada con 2+ dados). */
  miMano: Pinta[] | null;
  miId: string;
}

export function vistaJugador(estado: EstadoJuego, jugadorId: string): VistaJugador {
  return {
    publico: proyeccionPublica(estado),
    miMano: vistaDeJugador(estado, jugadorId)[jugadorId] ?? null,
    miId: jugadorId,
  };
}
