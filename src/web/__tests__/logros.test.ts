import { describe, it, expect, beforeEach } from "vitest";
import { LOGROS, fraseFiador, historiaNueva } from "../historia";
import { leerPalmares, registrarLogro } from "../palmares";
import { TransporteHistoria } from "../transporteHistoria";

// Shim de localStorage para node (palmares y prefs fallan en silencio sin él).
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

describe("logros", () => {
  it("el catálogo es sano: ids únicos, nombre y descripción en todos", () => {
    expect(LOGROS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(LOGROS.map((l) => l.id)).size).toBe(LOGROS.length);
    for (const l of LOGROS) {
      expect(l.nombre, l.id).toBeTruthy();
      expect(l.desc, l.id).toBeTruthy();
    }
  });

  it("registrarLogro persiste, avisa sólo la primera vez y sobrevive a saves viejos", () => {
    expect(registrarLogro("ganzua")).toBe(true); // nuevo: avisa
    expect(registrarLogro("ganzua")).toBe(false); // repetido: en silencio
    expect(leerPalmares().logros).toEqual(["ganzua"]);
    // Un palmarés viejo (sin campo logros) se normaliza sin romper.
    store.set("cachos.palmares", JSON.stringify({ jugadas: 3, ganadas: 1 }));
    expect(leerPalmares().logros).toEqual([]);
  });

  it("abrir un candado de cifra desbloquea 'Ganzúa' y avisa en la vista", () => {
    const h = historiaNueva("Curioso");
    h.escenarioIdx = 1; // La Vega: el candado del Charqui [4,3,3]
    const th = new TransporteHistoria(h);
    th.historiaAbrirAcertijo!();
    th.historiaProbarCifra!([4, 3, 3]);
    const v = th.instantanea().historia!;
    expect(leerPalmares().logros).toContain("ganzua");
    expect(v.logro).toBeTruthy();
    expect(v.logro!.nombres).toContain("Ganzúa");
    th.detener();
  });
});

describe("el Fiador de la tienda", () => {
  it("tiene una frase propia para cada parada de la tienda (capítulos 1 a 5)", () => {
    const frases = new Set<string>();
    for (let i = 1; i <= 5; i++) {
      const f = fraseFiador(i, []);
      expect(f.length).toBeGreaterThan(30);
      frases.add(f);
    }
    expect(frases.size).toBe(5); // ninguna repetida
  });

  it("comenta tus marcas (una sola, la primera que calce)", () => {
    const base = fraseFiador(2, []);
    const conAliado = fraseFiador(2, ["aliado"]);
    expect(conAliado.startsWith(base)).toBe(true);
    expect(conAliado.length).toBeGreaterThan(base.length);
    expect(conAliado).toContain("Carnicero");
    // aliado tiene prioridad sobre saqueador (va primero en la lista)
    expect(fraseFiador(2, ["saqueador", "aliado"])).toBe(conAliado);
    expect(fraseFiador(2, ["saqueador"])).toContain("billetera");
  });
});
