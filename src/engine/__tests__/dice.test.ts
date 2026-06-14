import { describe, it, expect } from "vitest";
import { contarPinta, agitarCacho, lanzarDado } from "../dice.js";
import type { Pinta } from "../types.js";

describe("contarPinta", () => {
  it("cuenta la pinta más los ases cuando el as es comodín", () => {
    const dados: Pinta[] = [5, 5, 1, 3, 1];
    expect(contarPinta(dados, 5, true)).toBe(4); // dos quinas + dos ases
  });

  it("ignora los ases cuando el as NO es comodín (obligado)", () => {
    const dados: Pinta[] = [5, 5, 1, 3, 1];
    expect(contarPinta(dados, 5, false)).toBe(2); // sólo las dos quinas
  });

  it("al contar ases sólo cuenta los unos (el comodín no se auto-suma)", () => {
    const dados: Pinta[] = [1, 1, 5, 1, 3];
    expect(contarPinta(dados, 1, true)).toBe(3);
    expect(contarPinta(dados, 1, false)).toBe(3);
  });
});

describe("agitarCacho", () => {
  it("devuelve la cantidad pedida de caras válidas", () => {
    const dados = agitarCacho(5);
    expect(dados).toHaveLength(5);
    for (const d of dados) expect(d).toBeGreaterThanOrEqual(1);
    for (const d of dados) expect(d).toBeLessThanOrEqual(6);
  });

  it("respeta la fuente de aleatoriedad inyectada", () => {
    expect(lanzarDado(() => 0)).toBe(1);
    expect(lanzarDado(() => 0.999)).toBe(6);
  });
});
