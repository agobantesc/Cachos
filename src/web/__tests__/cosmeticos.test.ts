import { describe, it, expect, beforeEach } from "vitest";
import { COSMETICOS, leerRopero, revisarDesbloqueos, equipar, tieneCosmetico } from "../cosmeticos";

// Shim de localStorage para node (los módulos fallan en silencio sin él).
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

const sembrarPalmares = (p: Record<string, unknown>) =>
  store.set("cachos.palmares", JSON.stringify(p));

describe("el Ropero (cosméticos y secretos)", () => {
  it("el catálogo tiene ids únicos, metadatos completos y secretos de verdad", () => {
    const ids = COSMETICOS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COSMETICOS) {
      expect(c.nombre, c.id).toBeTruthy();
      expect(c.desc, c.id).toBeTruthy();
      expect(c.condicion, c.id).toBeTruthy();
    }
    // Hay piezas de las cuatro familias, y varios secretos tapados.
    for (const t of ["pano", "dados", "marco", "capacidad"] as const) {
      expect(COSMETICOS.some((c) => c.tipo === t), t).toBe(true);
    }
    expect(COSMETICOS.filter((c) => c.oculto).length).toBeGreaterThanOrEqual(4);
    // Cada familia equipable trae exactamente UNA pieza de serie.
    for (const t of ["pano", "dados", "marco"] as const) {
      expect(COSMETICOS.filter((c) => c.tipo === t && c.deSerie).length, t).toBe(1);
    }
  });

  it("de partida sólo se tiene lo de serie, y queda equipado lo básico", () => {
    const r = leerRopero();
    expect(r.ganados.sort()).toEqual(["dados-clasicos", "marco-ninguno", "pano-casa"]);
    expect(r.equipado).toEqual({ pano: "pano-casa", dados: "dados-clasicos", marco: "marco-ninguno" });
  });

  it("revisarDesbloqueos gana piezas según el progreso, y avisa una sola vez", () => {
    sembrarPalmares({ ganadas: 10, mejorRacha: 3, logros: ["sin-un-rasguno"] });
    const nuevos = revisarDesbloqueos().map((c) => c.id).sort();
    expect(nuevos).toEqual(["dados-obsidiana", "dados-sangre", "pano-burdeos"]);
    expect(revisarDesbloqueos()).toEqual([]); // la segunda pasada no repite el aviso
    expect(tieneCosmetico("dados-obsidiana")).toBe(true);
    expect(tieneCosmetico("dados-oro")).toBe(false);
  });

  it("los secretos caen por finales y logros escondidos", () => {
    sembrarPalmares({ finales: ["malo"], logros: ["de-palabra", "leyenda-viva"] });
    const nuevos = revisarDesbloqueos().map((c) => c.id).sort();
    expect(nuevos).toEqual(["marco-hampa", "marco-leyenda", "pano-banca"]);
  });

  it("equipar exige tener la pieza (y las capacidades no se 'visten')", () => {
    expect(equipar("dados-oro")).toBe(false); // no ganado
    sembrarPalmares({ logros: ["rey-caido"] });
    revisarDesbloqueos();
    expect(equipar("dados-oro")).toBe(true);
    expect(leerRopero().equipado.dados).toBe("dados-oro");
    expect(equipar("cap-sin-piedad")).toBe(false); // capacidad: activa sola
    expect(equipar("no-existe")).toBe(false);
  });

  it("un equipado corrupto (o no ganado) vuelve a lo de serie", () => {
    store.set(
      "cachos.ropero",
      JSON.stringify({ ganados: ["pano-casa"], equipado: { pano: "pano-banca", dados: "brujo", marco: "marco-oro" } }),
    );
    const r = leerRopero();
    expect(r.equipado).toEqual({ pano: "pano-casa", dados: "dados-clasicos", marco: "marco-ninguno" });
  });

  it("la capacidad 'Mesa llena' cae a las 50 ganadas", () => {
    sembrarPalmares({ ganadas: 49 });
    expect(revisarDesbloqueos().some((c) => c.id === "cap-mesa-llena")).toBe(false);
    sembrarPalmares({ ganadas: 50 });
    expect(revisarDesbloqueos().some((c) => c.id === "cap-mesa-llena")).toBe(true);
  });
});
