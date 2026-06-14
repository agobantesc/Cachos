import { describe, it, expect } from "vitest";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorPorId,
  jugadorDeTurnoId,
  asesComodinEnRonda,
  puedeCalzarse,
  vistaDeJugador,
  totalDadosEnMesa,
  ErrorDeJuego,
  DERECHA,
} from "../game.js";
import { crearReglas } from "../config.js";
import type { EstadoJuego, Pinta } from "../types.js";

const rng0 = () => 0; // primer abridor = índice 0; manos se fijan a mano.

function nuevaPartida(ids = ["A", "B"]) {
  return crearJuego(
    ids.map((id) => ({ id, nombre: id })),
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
  it("reparte la cantidad inicial y calcula el total inicial de dados", () => {
    const e = nuevaPartida(["A", "B", "C", "D"]);
    expect(jugadorPorId(e, "A")!.dados).toHaveLength(5);
    expect(e.dadosInicialesTotales).toBe(20);
    expect(e.fase).toBe("LOBBY");
  });
});

describe("primer abridor al azar y sentido", () => {
  it("elige el abridor inicial según el rng", () => {
    const e0 = iniciarRonda(nuevaPartida(), { rng: () => 0 });
    expect(e0.abridorRondaId).toBe("A");
    const e1 = iniciarRonda(nuevaPartida(), { rng: () => 0.5 }); // floor(0.5*2)=1
    expect(e1.abridorRondaId).toBe("B");
  });

  it("el abridor elige el sentido; hacia la derecha el turno va al asiento anterior", () => {
    let e = iniciarRonda(nuevaPartida(["A", "B", "C"]), { rng: rng0, sentido: DERECHA });
    expect(e.abridorRondaId).toBe("A");
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 1, pinta: 5 } });
    expect(jugadorDeTurnoId(e)).toBe("C"); // a la derecha de A
  });
});

describe("flujo básico de ronda", () => {
  it("el turno avanza al apostar (sentido izquierda por defecto)", () => {
    const e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    expect(jugadorDeTurnoId(e)).toBe("A");
    const e2 = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } });
    expect(jugadorDeTurnoId(e2)).toBe("B");
    expect(e2.apuestaActual).toEqual({ cantidad: 2, pinta: 5 });
  });

  it("no se puede dudar sin apuesta vigente", () => {
    const e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    expect(() => aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" })).toThrow(ErrorDeJuego);
  });

  it("no se puede actuar fuera de turno", () => {
    const e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    expect(() =>
      aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 1, pinta: 2 } }),
    ).toThrow(ErrorDeJuego);
  });
});

describe("resolución de dudo", () => {
  it("si la apuesta NO se cumple, pierde el apostador", () => {
    let e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    setDados(e, "A", [5, 3, 3, 4, 6]); // una quina
    setDados(e, "B", [2, 2, 6, 6, 4]); // cero quinas
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 4, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" });
    expect(e.ultimaResolucion!.cantidadReal).toBe(1);
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(jugadorPorId(e, "A")!.dados.length).toBe(3); // perdió 2 por la siciliana
  });

  it("si la apuesta se cumple, pierde el dudador (sin siciliana tras una subida)", () => {
    let e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    setDados(e, "A", [5, 5, 1, 4, 6]); // dos quinas + un as
    setDados(e, "B", [5, 2, 6, 6, 4]); // una quina
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 4, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" });
    // quinas = 3 reales + 1 as comodín = 4 -> se cumple -> pierde A (dudador).
    expect(e.ultimaResolucion!.cantidadReal).toBe(4);
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(e.ultimaResolucion!.siciliana).toBe(false);
    expect(jugadorPorId(e, "A")!.dados.length).toBe(4);
  });
});

describe("la siciliana", () => {
  it("dudo inmediato al abridor hace perder 2 dados y los ases no valen comodín", () => {
    let e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    setDados(e, "A", [1, 1, 5, 4, 6]); // dos ases + una quina
    setDados(e, "B", [2, 2, 6, 6, 4]);
    // A abre "3 quinas". Con comodín habría 3 (1+1+1); sin comodín (siciliana) sólo 1.
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 3, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" });
    expect(e.ultimaResolucion!.siciliana).toBe(true);
    expect(e.ultimaResolucion!.asesComoComodin).toBe(false);
    expect(e.ultimaResolucion!.cantidadReal).toBe(1); // sólo la quina real
    expect(e.ultimaResolucion!.perdedorId).toBe("A"); // no se cumple -> pierde A
    expect(e.ultimaResolucion!.dadosPerdidos).toBe(2);
    expect(jugadorPorId(e, "A")!.dados.length).toBe(3);
  });
});

describe("calzo", () => {
  it("calzo exacto recupera un dado", () => {
    let e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    setDados(e, "A", [5, 5, 3, 4]); // dos quinas, 4 dados (para poder recuperar)
    setDados(e, "B", [5, 2, 6, 6, 4]); // una quina
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 2, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 3, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "CALZAR", jugadorId: "A" });
    expect(e.ultimaResolucion!.cantidadReal).toBe(3); // 2 de A + 1 de B
    expect(e.ultimaResolucion!.ganadorDadoId).toBe("A");
    expect(jugadorPorId(e, "A")!.dados.length).toBe(5);
  });

  it("no se puede calzar bajo la mitad de los dados iniciales", () => {
    const e = nuevaPartida(); // total inicial = 10, mitad = 5
    setDados(e, "A", [5, 5]);
    setDados(e, "B", [5]);
    expect(totalDadosEnMesa(e)).toBe(3);
    expect(puedeCalzarse(e)).toBe(false);

    setDados(e, "A", [5, 5, 5]); // ahora 4 -> sigue < 5
    expect(puedeCalzarse(e)).toBe(false);
    setDados(e, "B", [5, 5]); // ahora 5 -> permitido
    expect(puedeCalzarse(e)).toBe(true);
  });
});

describe("obligado (variantes de la casa)", () => {
  function partidaObligado() {
    let e = nuevaPartida();
    setDados(e, "A", [1]); // A con 1 dado será el abridor obligado
    setDados(e, "B", [5, 5, 5]);
    e.abridorRondaId = "A";
    e = iniciarRonda(e, { rng: rng0 });
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 1]);
    return e;
  }

  it("ronda cerrada: as no es comodín, sólo ve quien tiene 1 dado", () => {
    let e = partidaObligado();
    expect(e.esRondaObligado).toBe(true);
    expect(e.esRondaCerrada).toBe(true);
    expect(asesComodinEnRonda(e)).toBe(false);
    expect(vistaDeJugador(e, "A")["A"]).toEqual([1]); // A ve su dado (tiene 1)
    expect(vistaDeJugador(e, "B")["B"]).toBeNull(); // B juega a ciegas (3 dados)

    // A abre, B sube manteniendo la pinta, A duda (no siciliana).
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 3, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 4, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" });
    expect(e.ultimaResolucion!.asesComoComodin).toBe(false);
    expect(e.ultimaResolucion!.cantidadReal).toBe(2); // sólo las 2 quinas, el as no suma
  });

  it("con más de 1 dado no se puede cambiar la pinta ni calzar", () => {
    let e = partidaObligado();
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 3, pinta: 5 } });
    // B (3 dados) intenta cambiar la pinta -> error
    expect(() =>
      aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 3, pinta: 6 } }),
    ).toThrow(ErrorDeJuego);
    // B intenta calzar -> error (con más de 1 dado no puede)
    expect(() => aplicarAccion(e, { tipo: "CALZAR", jugadorId: "B" })).toThrow(ErrorDeJuego);
    // B sube manteniendo la pinta -> permitido
    const e2 = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 4, pinta: 5 } });
    expect(e2.apuestaActual).toEqual({ cantidad: 4, pinta: 5 });
  });

  it("no hay siciliana cuando la ronda es de obligado", () => {
    let e = partidaObligado(); // A obliga (1 dado), B tiene [5,5,1]
    // A abre "1 quina" y B duda de inmediato (sería siciliana en ronda normal).
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 1, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" });
    expect(e.ultimaResolucion!.siciliana).toBe(false);
    expect(e.ultimaResolucion!.cantidadReal).toBe(2); // dos quinas (el as no es comodín)
    expect(e.ultimaResolucion!.perdedorId).toBe("B"); // la apuesta se cumple -> pierde el dudador
    expect(e.ultimaResolucion!.dadosPerdidos).toBe(1); // 1 dado, no 2
    expect(jugadorPorId(e, "B")!.dados.length).toBe(2);
  });
});

describe("apertura de la siguiente ronda", () => {
  it("si el perdedor queda eliminado, abre el de su derecha", () => {
    const e = nuevaPartida(["A", "B", "C"]);
    jugadorPorId(e, "B")!.eliminado = true;
    e.abridorRondaId = "B"; // como si B (eliminado) debiera abrir
    const e2 = iniciarRonda(e, { rng: rng0 });
    expect(e2.abridorRondaId).toBe("A"); // a la derecha de B (índice anterior)
  });

  it("el perdedor de la ronda abre la siguiente", () => {
    let e = iniciarRonda(nuevaPartida(), { rng: rng0 });
    setDados(e, "A", [2, 2, 3, 4, 6]); // cero quinas
    setDados(e, "B", [2, 2, 6, 6, 4]);
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 1, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" });
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(e.abridorRondaId).toBe("A"); // A abrirá la siguiente
  });
});

describe("fin de juego", () => {
  it("cuando un jugador se queda sin dados, el otro gana", () => {
    let e = nuevaPartida();
    setDados(e, "A", [3, 3]); // A con 2 dados
    e.abridorRondaId = "B";
    e = iniciarRonda(e, { rng: rng0 });
    setDados(e, "A", [3, 3]);
    setDados(e, "B", [2, 2]); // B con 2 dados, cero quinas
    // B abre 1 quina, A duda -> B pierde 2 (siciliana) -> B eliminado.
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 1, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "A" });
    expect(jugadorPorId(e, "B")!.eliminado).toBe(true);
    expect(e.fase).toBe("FIN_JUEGO");
    expect(e.ganadorId).toBe("A");
  });
});
