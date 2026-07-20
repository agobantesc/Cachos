import { describe, it, expect, beforeEach } from "vitest";
import { leerPalmares, registrarPartida, registrarFinal, registrarLogro } from "../palmares";

// Shim de localStorage para node (el módulo falla en silencio sin él).
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("palmarés", () => {
  it("cuenta partidas, victorias y racha (con su mejor marca)", () => {
    registrarPartida(true);
    registrarPartida(true);
    registrarPartida(false);
    registrarPartida(true);
    const p = leerPalmares();
    expect(p.jugadas).toBe(4);
    expect(p.ganadas).toBe(3);
    expect(p.racha).toBe(1); // la derrota cortó la racha
    expect(p.mejorRacha).toBe(2);
  });

  it("acumula finales sin repetir el mismo final", () => {
    registrarFinal("estandar");
    registrarFinal("estandar");
    registrarFinal("verdadero");
    const p = leerPalmares();
    expect(p.finales.sort()).toEqual(["estandar", "verdadero"]);
  });

  it("sin almacenamiento no revienta (falla en silencio)", () => {
    delete (globalThis as Record<string, unknown>).localStorage;
    expect(() => registrarPartida(true)).not.toThrow();
    expect(leerPalmares().jugadas).toBe(0);
  });

  it("sin almacenamiento, cada lectura llega en blanco (nada se filtra entre lecturas)", () => {
    delete (globalThis as Record<string, unknown>).localStorage;
    // registrarLogro muta el palmarés que leyó; si el "vacío" compartiera sus
    // arrays, este logro quedaría pegado para la próxima lectura.
    expect(registrarLogro("fantasma")).toBe(true);
    expect(leerPalmares().logros).toEqual([]);
    expect(registrarLogro("fantasma")).toBe(true); // sigue "nuevo": no hay dónde guardarlo
  });
});

describe("el torneo", () => {
  it("cada corona suma una copa al palmarés", async () => {
    const { registrarCopa } = await import("../palmares");
    registrarCopa();
    registrarCopa();
    expect(leerPalmares().copas).toBe(2);
  });
});
