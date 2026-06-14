import { describe, it, expect } from "vitest";
import { crearJuego, iniciarRonda, aplicarAccion, jugadorPorId } from "../game.js";
import { proyeccionPublica, vistaJugador } from "../views.js";
import { crearReglas } from "../config.js";
import type { EstadoJuego, Pinta } from "../types.js";

const rng0 = () => 0;

function setDados(estado: EstadoJuego, id: string, dados: Pinta[]) {
  jugadorPorId(estado, id)!.dados = [...dados];
}

function partida() {
  return crearJuego(
    [
      { id: "A", nombre: "Ana" },
      { id: "B", nombre: "Beto" },
    ],
    crearReglas(),
  );
}

describe("proyeccionPublica", () => {
  it("muestra los vasos (cantidad de dados) pero NO las caras secretas", () => {
    let e = iniciarRonda(partida(), { rng: rng0 });
    setDados(e, "A", [5, 5, 3, 4, 6]);
    setDados(e, "B", [2, 2, 6, 6, 4]);
    const pub = proyeccionPublica(e);
    expect(pub.jugadores.map((j) => j.cantidadDados)).toEqual([5, 5]);
    // No existe ninguna propiedad "dados" con caras en la proyección pública.
    expect(JSON.stringify(pub)).not.toContain('"dados"');
    expect(pub.turnoJugadorId).toBe("A");
    expect(pub.ultimaResolucion).toBeNull();
  });

  it("durante la ronda no revela nada; en dudo/calzo revela los dados de todos", () => {
    let e = iniciarRonda(partida(), { rng: rng0 });
    setDados(e, "A", [5, 5, 3, 4, 6]);
    setDados(e, "B", [2, 2, 6, 6, 4]);
    e = aplicarAccion(e, { tipo: "APOSTAR", jugadorId: "A", apuesta: { cantidad: 9, pinta: 5 } });
    e = aplicarAccion(e, { tipo: "DUDAR", jugadorId: "B" });
    const pub = proyeccionPublica(e);
    expect(pub.ultimaResolucion).not.toBeNull();
    expect(pub.ultimaResolucion!.dadosRevelados["A"]).toEqual([5, 5, 3, 4, 6]);
    expect(pub.ultimaResolucion!.dadosRevelados["B"]).toEqual([2, 2, 6, 6, 4]);
  });
});

describe("vistaJugador", () => {
  it("cada jugador ve su propia mano y la mesa pública", () => {
    let e = iniciarRonda(partida(), { rng: rng0 });
    setDados(e, "A", [5, 5, 3, 4, 6]);
    setDados(e, "B", [2, 2, 6, 6, 4]);
    const vistaA = vistaJugador(e, "A");
    expect(vistaA.miMano).toEqual([5, 5, 3, 4, 6]);
    expect(vistaA.publico.jugadores).toHaveLength(2);
    // A no recibe las caras de B en ningún lado (hasta el reveal).
    expect(JSON.stringify(vistaA)).not.toContain('"2,2,6,6,4"'.replace(/,/g, ""));
    expect(vistaA.publico.jugadores.find((j) => j.id === "B")!.cantidadDados).toBe(5);
  });

  it("en ronda cerrada, el jugador con 2+ dados recibe su mano en null (a ciegas)", () => {
    let e = partida();
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 5]);
    e.abridorRondaId = "A";
    e = iniciarRonda(e, { rng: rng0 });
    setDados(e, "A", [1]);
    setDados(e, "B", [5, 5, 1]);
    expect(vistaJugador(e, "A").miMano).toEqual([1]); // 1 dado -> ve
    expect(vistaJugador(e, "B").miMano).toBeNull(); // 3 dados -> a ciegas
  });
});
