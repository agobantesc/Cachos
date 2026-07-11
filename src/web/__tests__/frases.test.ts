import { describe, it, expect } from "vitest";
import { FRASES } from "../frases";

// Las frases rápidas de la mesa en línea: el server sólo acepta índices de
// esta lista, así que la lista tiene que ser sana (cortas, sin vacíos).
describe("frases rápidas", () => {
  it("hay una lista sana de frases (cortas, únicas y sin vacíos)", () => {
    expect(FRASES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(FRASES).size).toBe(FRASES.length);
    for (const f of FRASES) {
      expect(f.trim().length).toBeGreaterThan(0);
      expect(f.length).toBeLessThanOrEqual(30); // cabe en un globo sobre el vaso
    }
  });
});
