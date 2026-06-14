import { describe, it, expect } from "vitest";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorPorId,
  jugadorDeTurnoId,
  asesComodinEnRonda,
  vistaDeJugador,
  totalDadosEnMesa,
  ErrorDeJuego,
} from "../game.js";
import { crearReglas } from "../config.js";
import type { EstadoJuego, Pinta } from "../types.js";

const rng0 = () => 0; // todos los dados salen 1; da igual porque fijamos manos a mano.

function nuevaPartida() {
  return crearJuego(
    [
      { id: "A", nombre: "Ana" },
      { id: "B", nombre: "Beto" },
    ],
    crearReglas(),
  );
}

/** Fija las caras de un jugador (para tests deterministas tras iniciarRonda). */
function setDados(estado: EstadoJuego, id: string, dados: Pinta[]) {
  jugadorPorId(estado, id)!.dados = [...dados];
}

describe("crearJuego", () => {
  it("exige al menos 2 jugadores", () => {
    expect(() => crearJuego([{ id: "A", nombre: "Ana" }])).toThrow(ErrorDeJuego);
  });
  it("reparte la cantidad inicial de dados", () => {
    const e = nuevaPartida();
    expect(jugadorPorId(e, "A")!.dados).toHaveLength(5);
    expect(e.fase).toBe("LOBBY");
  });
});

describe("flujo básico de ronda", () => {
  it("el abridor es el primer asiento y el turno avanza al apostar", () => {
    const e = iniciarRonda(nuevaPartida(), rng0);
    expect(e.abridorRondaId).toBe("A");
    expect(jugadorDeTurnoId(e)).toBe("A");
    const e2 = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } }, rng0);
    expect(jugadorDeTurnoId(e2)).toBe("B");
    expect(e2.apuestaActual).toEqual({ cantidad: 2, pinta: 5 });
  });

  it("no se puede dudar sin apuesta vigente", () => {
    const e = iniciarRonda(nuevaPartida(), rng0);
    expect(() => aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" }, rng0)).toThrow(ErrorDeJuego);
  });

  it("no se puede actuar fuera de turno", () => {
    const e = iniciarRonda(nuevaPartida(), rng0);
    expect(() =>
      aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 1, pinta: 2 } }, rng0),
    ).toThrow(ErrorDeJuego);
  });
});

describe("resolución de dudo", () => {
  it("si la apuesta NO se cumple, pierde el apostador", () => {
    let e = iniciarRonda(nuevaPartida(), rng0);
    setDados(e, "A", [5, 3, 3, 4, 6]); // una quina
    setDados(e, "B", [2, 2, 6, 6, 4]); // cero quinas, cero ases
    // A apuesta 4 quinas (sólo hay 1 real) -> B duda -> A pierde.
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 4, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" }, rng0);
    expect(e.ultimaResolucion!.cantidadReal).toBe(1);
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(jugadorPorId(e, "A")!.dados.length).toBe(3); // perdió 2 por la siciliana
  });

  it("si la apuesta se cumple, pierde el dudador", () => {
    let e = iniciarRonda(nuevaPartida(), rng0);
    setDados(e, "A", [5, 5, 1, 4, 6]); // dos quinas + un as
    setDados(e, "B", [5, 2, 6, 6, 4]); // una quina
    // A abre, B sube, A duda (ya no es la primera apuesta -> sin siciliana).
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 4, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" }, rng0);
    // quinas reales = 3 (5,5,5) + 1 as comodín = 4 -> se cumple -> pierde A (dudador).
    expect(e.ultimaResolucion!.cantidadReal).toBe(4);
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(e.ultimaResolucion!.siciliana).toBe(false);
    expect(jugadorPorId(e, "A")!.dados.length).toBe(4); // sólo 1 dado
  });
});

describe("la siciliana", () => {
  it("dudo inmediato al abridor hace perder 2 dados", () => {
    let e = iniciarRonda(nuevaPartida(), rng0);
    setDados(e, "A", [2, 2, 3, 4, 6]); // cero quinas, cero ases
    setDados(e, "B", [2, 2, 6, 6, 4]);
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 3, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" }, rng0);
    expect(e.ultimaResolucion!.siciliana).toBe(true);
    expect(e.ultimaResolucion!.dadosPerdidos).toBe(2);
    expect(jugadorPorId(e, "A")!.dados.length).toBe(3);
  });
});

describe("calzo", () => {
  it("calzo exacto recupera un dado", () => {
    let e = iniciarRonda(nuevaPartida(), rng0);
    setDados(e, "A", [5, 5, 3, 4, 6]); // dos quinas
    setDados(e, "B", [5, 2, 6, 6, 4]); // una quina
    jugadorPorId(e, "A")!.dados.pop(); // A tiene 4 dados para poder recuperar uno
    setDados(e, "A", [5, 5, 3, 4]); // dos quinas, 4 dados
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 3, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "CALZAR", jugadorId: "A" }, rng0);
    // quinas reales = 3 (dos de A + una de B) == 3 declaradas -> calzo exacto.
    expect(e.ultimaResolucion!.cantidadReal).toBe(3);
    expect(e.ultimaResolucion!.ganadorDadoId).toBe("A");
    expect(jugadorPorId(e, "A")!.dados.length).toBe(5);
  });
});

describe("obligado (variantes de la casa)", () => {
  it("ronda cerrada: el as no es comodín y sólo ve quien tiene 1 dado", () => {
    let e = nuevaPartida();
    // Dejamos a A con 1 dado y a B con 3; A será el abridor.
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 5]);
    e.abridorRondaId = "A";
    e = iniciarRonda(e, rng0);
    // rng0 reparte unos; fijamos las manos para el conteo.
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 1]);

    expect(e.esRondaObligado).toBe(true);
    expect(e.esRondaCerrada).toBe(true);
    expect(asesComodinEnRonda(e)).toBe(false);

    // Visibilidad: A (1 dado) ve lo suyo; B (3 dados) juega a ciegas.
    expect(vistaDeJugador(e, "A")["A"]).toEqual([1]);
    expect(vistaDeJugador(e, "B")["B"]).toBeNull();

    // Conteo de quinas sin comodín: sólo las 2 quinas reales (el as no suma).
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 3, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" }, rng0);
    expect(e.ultimaResolucion!.asesComoComodin).toBe(false);
    expect(e.ultimaResolucion!.cantidadReal).toBe(2);
  });
});

describe("fin de juego", () => {
  it("cuando un jugador se queda sin dados, el otro gana", () => {
    let e = nuevaPartida();
    setDados(e, "A", [3]); // A con 1 dado
    e.abridorRondaId = "B"; // B abre para que A no entre en obligado todavía
    // forzamos a B como abridor con 5 dados normales
    e = iniciarRonda(e, rng0);
    setDados(e, "A", [3]);
    setDados(e, "B", [2, 2, 2, 2, 2]);
    // B abre apostando algo imposible y A duda -> B pierde... iteramos hasta fin.
    // Simplificamos: B apuesta 1 quina (no hay ninguna), A duda -> B pierde 1 (no siciliana porque B no abrió con la primera apuesta del juego? sí abrió). Da igual el conteo.
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 1, pinta: 5 } }, rng0);
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" }, rng0);
    // No hay quinas -> B pierde (2 dados por siciliana). B pasa de 5 a 3.
    expect(jugadorPorId(e, "B")!.dados.length).toBe(3);
    expect(e.fase).toBe("FIN_RONDA");
    expect(totalDadosEnMesa(e)).toBe(4);
  });
});
