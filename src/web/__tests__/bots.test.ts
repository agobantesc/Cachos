import { describe, it, expect, afterEach } from "vitest";
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorDeTurnoId,
  vistaJugador,
  type Accion,
} from "../../engine";
import { decidirBot, type Nivel } from "../bots";

function accionDe(jugada: ReturnType<typeof decidirBot>, turno: string): Accion {
  switch (jugada.tipo) {
    case "APOSTAR":
      return { tipo: "APOSTAR", jugadorId: turno, apuesta: jugada.apuesta };
    case "CALZAR":
      return { tipo: "CALZAR", jugadorId: turno };
    case "PASAR":
      return { tipo: "PASAR", jugadorId: turno };
    case "DUDAR_PASO":
      return { tipo: "DUDAR_PASO", jugadorId: turno };
    default:
      return { tipo: "DUDAR", jugadorId: turno };
  }
}

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
  const niveles: Nivel[] = ["facil", "medio", "avanzado", "experto"];

  it("juega partidas completas (solo bots) sin jugadas inválidas y siempre termina", () => {
    for (let partida = 0; partida < 30; partida++) {
      const nivel = niveles[partida % niveles.length]!;
      const rng = hacerRng(1000 + partida * 7);
      Math.random = rng; // el ruido de decisión del bot también queda determinista
      let e = crearJuego([
        { id: "a", nombre: "A" },
        { id: "b", nombre: "B" },
        { id: "c", nombre: "C" },
      ]);
      e = iniciarRonda(e, { rng });

      let pasos = 0;
      while (e.fase !== "FIN_JUEGO" && pasos < 6000) {
        pasos++;
        if (e.fase === "FIN_RONDA") {
          e = iniciarRonda(e, { rng });
          continue;
        }
        const turno = jugadorDeTurnoId(e)!;
        const v = vistaJugador(e, turno);
        const jugada = decidirBot(v.publico, v.miMano, turno, nivel);
        // No debe lanzar: una jugada inválida haría fallar el test aquí.
        e = aplicarAccion(e, accionDe(jugada, turno));
      }

      expect(e.fase).toBe("FIN_JUEGO");
      expect(e.ganadorId).toBeTruthy();
    }
  });

  it("al abrir ronda solo apuesta o pasa (nunca duda/calza sin apuesta vigente)", () => {
    for (let s = 0; s < 50; s++) {
      const rng = hacerRng(7 + s);
      Math.random = rng;
      const e = iniciarRonda(
        crearJuego([
          { id: "a", nombre: "A" },
          { id: "b", nombre: "B" },
        ]),
        { rng },
      );
      const turno = jugadorDeTurnoId(e)!;
      const v = vistaJugador(e, turno);
      const jugada = decidirBot(v.publico, v.miMano, turno, "medio");
      expect(["APOSTAR", "PASAR"]).toContain(jugada.tipo);
    }
  });
});
