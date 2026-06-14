import { describe, it, expect } from "vitest";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorPorId,
  jugadorDeTurnoId,
  ErrorDeJuego,
} from "../game.js";
import { pasoValido } from "../dice.js";
import { crearReglas } from "../config.js";
import type { EstadoJuego, Pinta } from "../types.js";

const rng0 = () => 0; // abridor = índice 0 (A)

function partida(ids = ["A", "B", "C"]) {
  let e = crearJuego(
    ids.map((id) => ({ id, nombre: id })),
    crearReglas(),
  );
  e = iniciarRonda(e, { rng: rng0 });
  return e;
}
function setDados(e: EstadoJuego, id: string, dados: Pinta[]) {
  jugadorPorId(e, id)!.dados = [...dados];
}

describe("pasoValido", () => {
  it("acepta 5 iguales, todos distintos y full (3+2)", () => {
    expect(pasoValido([4, 4, 4, 4, 4])).toBe(true);
    expect(pasoValido([1, 2, 3, 4, 5])).toBe(true);
    expect(pasoValido([6, 6, 6, 2, 2])).toBe(true);
  });
  it("rechaza el resto y manos que no son de 5 dados", () => {
    expect(pasoValido([2, 2, 3, 4, 6])).toBe(false); // par suelto
    expect(pasoValido([5, 5, 5, 5, 1])).toBe(false); // poker (4+1)
    expect(pasoValido([1, 2, 3, 4])).toBe(false); // 4 dados
  });
});

describe("pasar", () => {
  it("solo se permite con los 5 dados", () => {
    const e = partida();
    setDados(e, "A", [3, 3, 3, 4]); // A con 4 dados
    expect(() => aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" })).toThrow(ErrorDeJuego);
  });

  it("pasa el turno al siguiente y deja el paso pendiente", () => {
    let e = partida();
    setDados(e, "A", [2, 3, 3, 4, 6]);
    e = aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" });
    expect(e.pasoPendienteJugadorId).toBe("A");
    expect(jugadorDeTurnoId(e)).toBe("B");
  });

  it("dudar un paso INVÁLIDO hace perder un dado al que pasó", () => {
    let e = partida();
    setDados(e, "A", [2, 3, 3, 4, 6]); // inválido
    e = aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" });
    e = aplicarAccion(e, { tipo: "DUDAR_PASO", jugadorId: "B" });
    expect(e.ultimaResolucion!.tipo).toBe("PASO");
    expect(e.ultimaResolucion!.pasoEraValido).toBe(false);
    expect(e.ultimaResolucion!.perdedorId).toBe("A");
    expect(jugadorPorId(e, "A")!.dados.length).toBe(4);
    expect(jugadorPorId(e, "B")!.dados.length).toBe(5);
  });

  it("dudar un paso VÁLIDO hace perder un dado al que dudó", () => {
    let e = partida();
    setDados(e, "A", [1, 2, 3, 4, 5]); // todos distintos -> válido
    e = aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" });
    e = aplicarAccion(e, { tipo: "DUDAR_PASO", jugadorId: "B" });
    expect(e.ultimaResolucion!.pasoEraValido).toBe(true);
    expect(e.ultimaResolucion!.perdedorId).toBe("B");
    expect(jugadorPorId(e, "B")!.dados.length).toBe(4);
    expect(jugadorPorId(e, "A")!.dados.length).toBe(5);
  });

  it("subir la apuesta acepta el paso y sigue la ronda", () => {
    let e = partida();
    setDados(e, "A", [2, 3, 3, 4, 6]);
    e = aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" });
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "B", apuesta: { cantidad: 2, pinta: 5 } });
    expect(e.pasoPendienteJugadorId).toBeNull();
    expect(e.apuestaActual).toEqual({ cantidad: 2, pinta: 5 });
    expect(jugadorDeTurnoId(e)).toBe("C");
  });

  it("con un paso pendiente no se puede dudar ni calzar la apuesta previa", () => {
    let e = partida();
    setDados(e, "A", [2, 3, 3, 4, 6]);
    e = aplicarAccion(e, { tipo: "PASAR", jugadorId: "A" });
    expect(() => aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" })).toThrow(ErrorDeJuego);
    expect(() => aplicarAccion(e, { tipo: "CALZAR", jugadorId: "B" })).toThrow(ErrorDeJuego);
    expect(() => aplicarAccion(e, { tipo: "PASAR", jugadorId: "B" })).toThrow(ErrorDeJuego);
  });

  it("no se puede pasar en una ronda de obligado", () => {
    let e = crearJuego(
      [
        { id: "A", nombre: "A" },
        { id: "B", nombre: "B" },
      ],
      crearReglas(),
    );
    setDados(e, "A", [1]); // A obligará con 1 dado
    e.abridorRondaId = "A";
    e = iniciarRonda(e, { rng: rng0 });
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 5, 5, 5]);
    expect(e.esRondaObligado).toBe(true);
    // A abre; el turno pasa a B (5 dados), que intenta pasar -> prohibido en obligado.
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 1, pinta: 5 } });
    expect(() => aplicarAccion(e, { tipo: "PASAR", jugadorId: "B" })).toThrow(ErrorDeJuego);
  });
});
