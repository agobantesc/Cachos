import { describe, it, expect } from "vitest";
import { validarApuesta, asesMinimosDesdeNormal, normalMinimoDesdeAses } from "../bids.js";

const ok = (actual: Parameters<typeof validarApuesta>[0], nueva: Parameters<typeof validarApuesta>[1]) =>
  validarApuesta(actual, nueva).valida;

describe("validarApuesta - apertura", () => {
  it("cualquier apuesta bien formada abre la ronda", () => {
    expect(ok(null, { cantidad: 1, pinta: 3 })).toBe(true);
    expect(ok(null, { cantidad: 0, pinta: 3 })).toBe(false);
  });
});

describe("validarApuesta - normal a normal", () => {
  it("subir la cantidad es válido con cualquier pinta", () => {
    expect(ok({ cantidad: 3, pinta: 5 }, { cantidad: 4, pinta: 2 })).toBe(true);
  });
  it("misma cantidad exige subir la pinta", () => {
    expect(ok({ cantidad: 3, pinta: 5 }, { cantidad: 3, pinta: 6 })).toBe(true);
    expect(ok({ cantidad: 3, pinta: 5 }, { cantidad: 3, pinta: 4 })).toBe(false);
    expect(ok({ cantidad: 3, pinta: 5 }, { cantidad: 3, pinta: 5 })).toBe(false);
  });
  it("bajar la cantidad nunca es válido", () => {
    expect(ok({ cantidad: 4, pinta: 2 }, { cantidad: 3, pinta: 6 })).toBe(false);
  });
});

describe("validarApuesta - conversión de ases (estilo Perudo)", () => {
  it("entrar a ases requiere techo(cantidad/2) = 'la mitad más grande'", () => {
    expect(asesMinimosDesdeNormal(6)).toBe(3);
    expect(ok({ cantidad: 6, pinta: 5 }, { cantidad: 3, pinta: 1 })).toBe(true);
    expect(ok({ cantidad: 6, pinta: 5 }, { cantidad: 2, pinta: 1 })).toBe(false);
    expect(asesMinimosDesdeNormal(5)).toBe(3); // techo(2.5)
    // Caso del usuario: de "11 sextas" se baja a "6 ases".
    expect(asesMinimosDesdeNormal(11)).toBe(6);
    expect(ok({ cantidad: 11, pinta: 6 }, { cantidad: 6, pinta: 1 })).toBe(true);
    expect(ok({ cantidad: 11, pinta: 6 }, { cantidad: 5, pinta: 1 })).toBe(false);
  });
  it("salir de ases requiere cantidad*2 + 1", () => {
    expect(normalMinimoDesdeAses(3)).toBe(7);
    expect(ok({ cantidad: 3, pinta: 1 }, { cantidad: 7, pinta: 2 })).toBe(true);
    expect(ok({ cantidad: 3, pinta: 1 }, { cantidad: 6, pinta: 6 })).toBe(false);
  });
  it("ases a ases sólo sube la cantidad", () => {
    expect(ok({ cantidad: 2, pinta: 1 }, { cantidad: 3, pinta: 1 })).toBe(true);
    expect(ok({ cantidad: 2, pinta: 1 }, { cantidad: 2, pinta: 1 })).toBe(false);
  });
});

describe("validarApuesta - obligado (ases sin comodín, As = pinta 1)", () => {
  const okSin = (a: Parameters<typeof validarApuesta>[0], n: Parameters<typeof validarApuesta>[1]) =>
    validarApuesta(a, n, false).valida;
  it("el As es la pinta más baja (1 < 2 < … < 6), sin conversión especial", () => {
    // misma cantidad: subir de as (1) a dos (2) vale; de quina a as no.
    expect(okSin({ cantidad: 2, pinta: 1 }, { cantidad: 2, pinta: 2 })).toBe(true);
    expect(okSin({ cantidad: 2, pinta: 5 }, { cantidad: 2, pinta: 1 })).toBe(false);
    // para ir a ases desde una pinta más alta hay que subir la cantidad.
    expect(okSin({ cantidad: 2, pinta: 5 }, { cantidad: 3, pinta: 1 })).toBe(true);
    // ases a ases: subir la cantidad.
    expect(okSin({ cantidad: 2, pinta: 1 }, { cantidad: 3, pinta: 1 })).toBe(true);
    expect(okSin({ cantidad: 2, pinta: 1 }, { cantidad: 2, pinta: 1 })).toBe(false);
  });
});
