import { describe, it, expect, beforeEach } from "vitest";
import { CONSEJOS, consejoPendiente, marcarConsejo } from "../consejos";

// Shim de localStorage para node.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("consejos del tahúr (tutorial contextual)", () => {
  it("todos los consejos tienen título y texto que enseña de verdad", () => {
    const ids = Object.keys(CONSEJOS);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    for (const id of ids) {
      const c = CONSEJOS[id as keyof typeof CONSEJOS];
      expect(c.titulo, id).toBeTruthy();
      expect(c.texto.length, id).toBeGreaterThan(60); // explica, no decora
    }
  });

  it("cada consejo se muestra UNA vez: marcado queda guardado", () => {
    expect(consejoPendiente("apostar")).toBe(true);
    marcarConsejo("apostar");
    expect(consejoPendiente("apostar")).toBe(false);
    expect(consejoPendiente("dudar")).toBe(true); // los demás siguen pendientes
    // Persistencia real (lo que quedó en el storage se respeta al releer).
    expect(JSON.parse(store.get("cachos.consejos")!)).toEqual(["apostar"]);
  });
});
