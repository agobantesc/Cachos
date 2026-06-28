import { describe, it, expect } from "vitest";
import {
  CAMPANA,
  ITEMS,
  HISTORIA_VERSION,
  historiaNueva,
  normalizar,
  armarMesa,
  dilemaActual,
  type EstadoHistoria,
} from "../historia";
import { TransporteHistoria } from "../transporteHistoria";
import { TransporteLocal } from "../transporte";

// Lógica del MODO HISTORIA v3: dilemas, items y la migración de partidas viejas
// al insertar el capítulo nuevo. Pruebas deterministas (sin jugar la mesa).

describe("campaña", () => {
  it("tiene 6 escenarios, cada uno terminando en un boss con habilidad", () => {
    expect(CAMPANA.length).toBe(6);
    for (const e of CAMPANA) {
      const boss = e.rivales[e.rivales.length - 1]!;
      expect(boss.esBoss).toBe(true);
      expect(boss.habilidad).toBeTruthy();
    }
  });

  it("ofrece variedad de mesas (1v1 y mesas grandes hasta 6)", () => {
    const tam = new Set(CAMPANA.flatMap((e) => e.rivales.map((r) => r.mesa)));
    expect(tam.has(2)).toBe(true);
    expect(tam.has(6)).toBe(true);
  });

  it("los ids de rival son únicos y los dilemas no se repiten de clave", () => {
    const ids = CAMPANA.flatMap((e) => e.rivales.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    const claves = CAMPANA.map((e) => e.dilema?.clave).filter(Boolean);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("La Maestranza traslada la habilidad 'Puro fierro' (as no comodín) a la mesa", () => {
    const idx = CAMPANA.findIndex((e) => e.clave === "maestranza");
    expect(idx).toBeGreaterThan(0);
    const h = historiaNueva("Tester");
    h.escenarioIdx = idx;
    h.rivalIdx = CAMPANA[idx]!.rivales.length - 1; // el boss
    expect(armarMesa(h).reglas.asComodin).toBe(false);
  });

  it("hay relleno suficiente para la mesa más grande (sin nombres vacíos)", () => {
    const h = historiaNueva("Tester");
    // mesa de 6 = 4 acompañantes; deben venir todos con nombre
    const grande = CAMPANA.flatMap((e, ei) =>
      e.rivales.map((r, ri) => ({ ei, ri, mesa: r.mesa })),
    ).find((x) => x.mesa === 6)!;
    h.escenarioIdx = grande.ei;
    h.rivalIdx = grande.ri;
    const mesa = armarMesa(h);
    expect(mesa.acompanantes.length).toBe(4);
    expect(mesa.acompanantes.every((n) => n && n.length > 0)).toBe(true);
  });
});

describe("normalizar (migración de saves)", () => {
  it("corre los índices de escenario de una partida vieja (v1) por La Maestranza", () => {
    // Save viejo: estaba en La Trastienda, que antes era el índice 2.
    const viejo = {
      nombre: "Antiguo",
      atributos: { ojo: 1 },
      plata: 100,
      escenarioIdx: 2,
      rivalIdx: 0,
      completado: false,
    } as unknown as EstadoHistoria;
    const n = normalizar(viejo);
    // La Trastienda ahora vive en el índice 3 (Maestranza se insertó en el 2).
    expect(CAMPANA[3]!.clave).toBe("trastienda");
    expect(n.escenarioIdx).toBe(3);
    expect(n.version).toBe(HISTORIA_VERSION);
    // y agrega las estructuras nuevas
    expect(n.inventario).toEqual({ cargado: 0, marcado: 0, soplon: 0 });
    expect(Array.isArray(n.dilemasResueltos)).toBe(true);
    expect(n.atributos).toEqual({ ojo: 1, colmillo: 0, suerte: 0 });
  });

  it("no toca los primeros escenarios ni re-migra un save ya v2", () => {
    // Save v1 (sin 'version') en un escenario temprano: no se corre.
    const { version: _omit, ...sinVersion } = historiaNueva("A");
    const viejoTemprano = { ...sinVersion, escenarioIdx: 1 };
    expect(normalizar(viejoTemprano).escenarioIdx).toBe(1);
    const nuevo = { ...historiaNueva("B"), escenarioIdx: 4 };
    // ya trae version actual -> no se corre
    expect(normalizar(nuevo).escenarioIdx).toBe(4);
  });
});

describe("dilemas e items (TransporteHistoria)", () => {
  it("empezar entra al dilema; elegir entrega el premio y muestra el desenlace", () => {
    const th = new TransporteHistoria(historiaNueva("Detective"));
    th.historiaEmpezar();
    let v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("dilema");
    expect(v.dilema).toBeTruthy();
    expect(v.dilema!.opciones.length).toBe(2);
    expect(v.dilema!.resultado).toBeNull();

    // Opción del soplón (índice 1 en La Pocilga).
    th.historiaElegir!(1);
    v = th.instantanea().historia!;
    expect(v.dilema!.resultado).toBeTruthy();
    expect(v.itemsEnMano.some((it) => it.id === "soplon" && it.cantidad === 1)).toBe(true);

    th.historiaContinuar!();
    expect(th.instantanea().historia!.faseHistoria).toBe("mesa");
    th.detener();
  });

  it("usar el soplón enciende las pistas y lo consume (de forma transitoria)", () => {
    const h = historiaNueva("Forastero");
    h.inventario.soplon = 1;
    h.dilemasResueltos = ["pocilga-cabro"]; // saltar el dilema
    const th = new TransporteHistoria(h);
    th.historiaEmpezar(); // -> mesa (sin dilema)
    expect(th.instantanea().historia!.faseHistoria).toBe("mesa");
    expect(th.instantanea().historia!.ojo).toBe(0);

    th.historiaUsarItem!("soplon");
    const v = th.instantanea().historia!;
    expect(v.ojo).toBeGreaterThanOrEqual(1);
    expect(v.colmillo).toBeGreaterThanOrEqual(1);
    expect(v.itemsEnMano.some((it) => it.id === "soplon")).toBe(false);
    th.detener();
  });

  it("comprar items fuera de la tienda no hace nada (guard)", () => {
    const h = historiaNueva("Forastero");
    h.plata = 1000;
    h.dilemasResueltos = ["pocilga-cabro"];
    const th = new TransporteHistoria(h);
    // en 'intro' aún no es tienda
    th.historiaComprarItem!("soplon");
    expect(th.instantanea().historia!.plata).toBe(1000);
    th.detener();
  });

  it("el catálogo de items tiene 3 consumibles con costo y tope", () => {
    expect(ITEMS.length).toBe(3);
    for (const it of ITEMS) {
      expect(it.costo).toBeGreaterThan(0);
      expect(it.max).toBeGreaterThan(0);
    }
  });

  it("dilemaActual sólo aparece en el primer rival y no si ya fue resuelto", () => {
    const h = historiaNueva("X");
    expect(dilemaActual(h)).toBeTruthy();
    h.rivalIdx = 1;
    expect(dilemaActual(h)).toBeNull();
    h.rivalIdx = 0;
    h.dilemasResueltos = [CAMPANA[0]!.dilema!.clave];
    expect(dilemaActual(h)).toBeNull();
  });
});

describe("trampas de dados (TransporteLocal)", () => {
  const concentracion = (caras: number[]) => {
    const m = new Map<number, number>();
    let max = 0;
    for (const c of caras) {
      const n = (m.get(c) ?? 0) + 1;
      m.set(c, n);
      if (n > max) max = n;
    }
    return max;
  };

  it("cargarMano no reduce la concentración; descargarMano corre sin romper", () => {
    const tl = new TransporteLocal(
      [
        { id: "humano", nombre: "Yo" },
        { id: "b", nombre: "Bot" },
      ],
      { humanoId: "humano" },
    );
    const antes = tl.instantanea().miMano!;
    tl.cargarMano("humano");
    const despues = tl.instantanea().miMano!;
    expect(concentracion(despues)).toBeGreaterThanOrEqual(concentracion(antes));
    expect(tl.descargarMano("b")).toBe(true);
    tl.detener();
  });
});
