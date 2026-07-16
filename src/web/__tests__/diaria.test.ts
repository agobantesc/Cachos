import { describe, it, expect, beforeEach } from "vitest";
import {
  claveHoy,
  mesaDelDia,
  rankingDelDia,
  diariaDeHoy,
  registrarIntentoDiaria,
  registrarVictoriaDiaria,
  formatoTiempo,
} from "../diaria";

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

describe("la Mesa del Día", () => {
  it("la clave del día tiene formato AAAA-MM-DD", () => {
    expect(claveHoy(new Date(2026, 6, 16))).toBe("2026-07-16");
    expect(claveHoy(new Date(2026, 0, 3))).toBe("2026-01-03");
  });

  it("misma fecha, misma mesa (para todos); otra fecha, otra mesa", () => {
    const a1 = mesaDelDia("2026-07-16");
    const a2 = mesaDelDia("2026-07-16");
    expect(JSON.stringify(a1)).toBe(JSON.stringify(a2));
    const b = mesaDelDia("2026-07-17");
    expect(JSON.stringify(a1)).not.toBe(JSON.stringify(b));
  });

  it("la mesa del día es brava: capo brutal tramposo, 3 rivales y 2 reglas de la casa", () => {
    for (const clave of ["2026-07-16", "2026-11-01", "2027-02-28"]) {
      const cfg = mesaDelDia(clave);
      expect(cfg.rivales.length).toBe(3);
      expect(cfg.rivales[0]!.nivel).toBe("brutal");
      expect(cfg.trampaIntentos).toBeGreaterThanOrEqual(5);
      expect(cfg.modificadores.length).toBe(2);
      expect(cfg.modificadores[0]!.clave).not.toBe(cfg.modificadores[1]!.clave);
      const nombres = new Set(cfg.rivales.map((r) => r.nombre));
      expect(nombres.size).toBe(3);
    }
  });

  it("las reglas del día reflejan los modificadores sorteados", () => {
    // Buscamos un día con "ley seca" para verificar que la regla llega al motor.
    for (let d = 1; d <= 60; d++) {
      const clave = `2026-08-${String((d % 28) + 1).padStart(2, "0")}`;
      const cfg = mesaDelDia(clave + (d > 28 ? "x" + d : ""));
      if (cfg.modificadores.some((m) => m.clave === "ley-seca")) {
        expect(cfg.reglas.calzarPermitido).toBe(false);
        return;
      }
    }
    throw new Error("ningún día sorteó ley seca (revisar el pool)");
  });

  it("el ranking del día es determinista, viene ordenado y sin los rivales de la mesa", () => {
    const clave = "2026-07-16";
    const r1 = rankingDelDia(clave);
    const r2 = rankingDelDia(clave);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(r1.length).toBe(9); // sin victoria tuya, la pizarra es de la casa
    for (let i = 1; i < r1.length; i++) expect(r1[i]!.ms).toBeGreaterThanOrEqual(r1[i - 1]!.ms);
    const enMesa = new Set(mesaDelDia(clave).rivales.map((x) => x.nombre));
    expect(r1.some((p) => enMesa.has(p.nombre))).toBe(false);
  });

  it("ganar te mete a la pizarra con tu MEJOR tiempo (y el histórico acumula)", () => {
    const clave = "2026-07-16";
    registrarIntentoDiaria(clave);
    registrarVictoriaDiaria(200_000, clave);
    registrarVictoriaDiaria(250_000, clave); // peor: no pisa el mejor
    registrarVictoriaDiaria(150_000, clave); // mejor: manda
    const mio = diariaDeHoy(clave);
    expect(mio.mejorMs).toBe(150_000);
    expect(mio.ganadas).toBe(3);
    const yo = rankingDelDia(clave).find((p) => p.esJugador);
    expect(yo?.ms).toBe(150_000);
    // El puesto respeta el orden por tiempo.
    const r = rankingDelDia(clave);
    const idx = r.findIndex((p) => p.esJugador);
    if (idx > 0) expect(r[idx - 1]!.ms).toBeLessThanOrEqual(150_000);
    if (idx < r.length - 1) expect(r[idx + 1]!.ms).toBeGreaterThanOrEqual(150_000);
  });

  it("otro día parte la pizarra de cero, pero conserva las ganadas históricas", () => {
    registrarVictoriaDiaria(180_000, "2026-07-16");
    const manana = diariaDeHoy("2026-07-17");
    expect(manana.mejorMs).toBeNull();
    expect(manana.intentos).toBe(0);
    expect(manana.ganadas).toBe(1); // el histórico (para el Ropero) no se borra
  });

  it("el cronómetro se muestra como m:ss", () => {
    expect(formatoTiempo(65_000)).toBe("1:05");
    expect(formatoTiempo(140_000)).toBe("2:20");
    expect(formatoTiempo(9_400)).toBe("0:09");
  });
});
