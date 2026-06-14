import { describe, it, expect, afterEach } from "vitest";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorDeTurnoId,
  vistaJugador,
  type Accion,
} from "../../engine";
import { decidirBot } from "../bots";

// rng determinista (LCG) para que el test sea reproducible.
function hacerRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

describe("decidirBot", () => {
  it("juega partidas completas (solo bots) sin jugadas inválidas y siempre termina", () => {
    for (let partida = 0; partida < 30; partida++) {
      const rng = hacerRng(1000 + partida * 7);
      Math.random = rng; // el ruido de decisión del bot también queda determinista
      let e = crearJuego([
        { id: "a", nombre: "A" },
        { id: "b", nombre: "B" },
        { id: "c", nombre: "C" },
      ]);
      e = iniciarRonda(e, { rng });

      let pasos = 0;
      while (e.fase !== "FIN_JUEGO" && pasos < 5000) {
        pasos++;
        if (e.fase === "FIN_RONDA") {
          e = iniciarRonda(e, { rng });
          continue;
        }
        const turno = jugadorDeTurnoId(e)!;
        const v = vistaJugador(e, turno);
        const jugada = decidirBot(v.publico, v.miMano, turno);
        const accion: Accion =
          jugada.tipo === "APOSTAR"
            ? { tipo: "APOSTAR", jugadorId: turno, apuesta: jugada.apuesta }
            : jugada.tipo === "CALZAR"
              ? { tipo: "CALZAR", jugadorId: turno }
              : { tipo: "DUDAR", jugadorId: turno };
        // No debe lanzar: una jugada inválida haría fallar el test aquí.
        e = aplicarAccion(e, accion);
      }

      expect(e.fase).toBe("FIN_JUEGO");
      expect(e.ganadorId).toBeTruthy();
    }
  });

  it("al abrir ronda siempre apuesta (nunca duda sin apuesta vigente)", () => {
    const e = iniciarRonda(
      crearJuego([
        { id: "a", nombre: "A" },
        { id: "b", nombre: "B" },
      ]),
      { rng: hacerRng(42) },
    );
    const turno = jugadorDeTurnoId(e)!;
    const v = vistaJugador(e, turno);
    const jugada = decidirBot(v.publico, v.miMano, turno);
    expect(jugada.tipo).toBe("APOSTAR");
  });
});
