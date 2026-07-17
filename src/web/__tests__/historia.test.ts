import { describe, it, expect } from "vitest";
import {
  CAMPANA,
  ITEMS,
  HISTORIA_VERSION,
  historiaNueva,
  normalizar,
  armarMesa,
  armarMesaSecreta,
  eventoActual,
  tipoFinal,
  desafioDe,
  umbralRelampago,
  opcionesApuesta,
  REY_VERDADERO,
  FINALES,
  SECRETOS,
  MARCAS_INFO,
  escenaCapitulo,
  escenaFinal,
  ecosDelCamino,
  presagio,
  MARCAS_OSCURAS,
  OFICIOS,
  costoMejora,
  costoItem,
  bonoDesafio,
  umbralMaraton,
  ENCARGOS,
  type EstadoHistoria,
  type TipoFinal,
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

  it("cada rival trae narrativa: presentación, y relato si no es jefe", () => {
    for (const e of CAMPANA) {
      for (const r of e.rivales) {
        expect(r.presentacion, `${r.id} presentación`).toBeTruthy();
        if (!r.esBoss) expect(r.relato, `${r.id} relato`).toBeTruthy();
      }
    }
  });

  it("la intro del rival expone su presentación en la vista", () => {
    const th = new TransporteHistoria(historiaNueva("Narrador"));
    const v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("intro");
    expect(v.narrativa.presentacion).toBe(CAMPANA[0]!.rivales[0]!.presentacion);
    th.detener();
  });

  it("ofrece variedad de mesas (1v1 y mesas grandes hasta 6)", () => {
    const tam = new Set(CAMPANA.flatMap((e) => e.rivales.map((r) => r.mesa)));
    expect(tam.has(2)).toBe(true);
    expect(tam.has(6)).toBe(true);
  });

  it("los ids de rival son únicos y los eventos no repiten clave", () => {
    const ids = CAMPANA.flatMap((e) => e.rivales.map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    const claves = CAMPANA.flatMap((e) => (e.eventos ?? []).map((x) => x.evento.clave));
    expect(claves.length).toBeGreaterThan(6); // 6 dilemas + lecturas/peleas nuevas
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("toda consecuencia (requiere) tiene una causa que la dispara en un capítulo anterior", () => {
    // marca -> índice de escenario donde se PUEDE obtener
    const producidaEn = new Map<string, number[]>();
    CAMPANA.forEach((e, ei) =>
      (e.eventos ?? []).forEach((pe) => {
        const premios = pe.evento.tipo === "lectura" ? pe.evento.cartas : pe.evento.opciones;
        premios.forEach((p) => {
          if (p.marca) producidaEn.set(p.marca, [...(producidaEn.get(p.marca) ?? []), ei]);
        });
      }),
    );
    CAMPANA.forEach((e, ei) =>
      (e.eventos ?? []).forEach((pe) => {
        if (!pe.requiere) return;
        const fuentes = producidaEn.get(pe.requiere) ?? [];
        expect(fuentes.length, `la marca ${pe.requiere} se produce en algún lado`).toBeGreaterThan(0);
        expect(fuentes.some((idx) => idx < ei), `la marca ${pe.requiere} se obtiene antes del cap. ${ei}`).toBe(true);
      }),
    );
  });

  it("las reglas de mesa de rivales comunes llegan al motor", () => {
    const buscar = (id: string) => {
      for (let ei = 0; ei < CAMPANA.length; ei++) {
        const ri = CAMPANA[ei]!.rivales.findIndex((r) => r.id === id);
        if (ri >= 0) return { ei, ri };
      }
      throw new Error("no está " + id);
    };
    const reglasDe = (id: string) => {
      const { ei, ri } = buscar(id);
      const h = historiaNueva("X");
      h.escenarioIdx = ei;
      h.rivalIdx = ri;
      return armarMesa(h).reglas;
    };
    expect(reglasDe("r-comisario").calzarPermitido).toBe(false); // Ley seca
    expect(reglasDe("r-jueza").asComodin).toBe(false); // Sin atenuantes
    expect(reglasDe("r-viuda").obligadoActivo).toBe(false); // Sin velorio
    expect(reglasDe("r-quintrala").calzarRecuperaDado).toBe(false); // Calzo seco
    expect(reglasDe("r-mecha").sicilianaDadosPerdidos).toBe(3); // Pólvora
    expect(reglasDe("r-cabrera").calzarSoloConMitadDeDados).toBe(false); // Calzo libre
    expect(reglasDe("r-notario").sicilianaActiva).toBe(false); // Letra chica
    expect(reglasDe("r-madame").obligadoCerradoParaOtros).toBe(false); // Cartas sobre la mesa
    expect(reglasDe("r-turco").obligadoAsesNoComodin).toBe(false); // Cortesía de la casa
  });

  it("Sapo Reyes juega soplado: trampa suave de dado cargado (5 tiradas)", () => {
    const h = historiaNueva("X");
    h.escenarioIdx = 1;
    h.rivalIdx = 2; // Sapo Reyes
    const mesa = armarMesa(h);
    expect(mesa.dadoCargadoId).toBe("r-sapo");
    expect(mesa.dadoCargadoIntentos).toBe(5);
  });

  it("la mayoría de las mesas tiene su propia regla o trampa (variedad de casas)", () => {
    const rivales = CAMPANA.flatMap((e) => e.rivales);
    const conHabilidad = rivales.filter((r) => r.habilidad).length;
    expect(conHabilidad).toBeGreaterThanOrEqual(16); // de 23 rivales
  });

  it("los jefes tramposos escalan la intensidad de la trampa (más tiradas, más ventaja)", () => {
    const buscar = (id: string) => {
      for (let ei = 0; ei < CAMPANA.length; ei++) {
        const ri = CAMPANA[ei]!.rivales.findIndex((r) => r.id === id);
        if (ri >= 0) return { ei, ri };
      }
      throw new Error("no está " + id);
    };
    const mesaDe = (id: string) => {
      const { ei, ri } = buscar(id);
      const h = historiaNueva("X");
      h.escenarioIdx = ei;
      h.rivalIdx = ri;
      return armarMesa(h);
    };
    const senador = mesaDe("b-senador"); // Dado cargado
    expect(senador.dadoCargadoId).toBe("b-senador");
    expect(senador.dadoCargadoIntentos).toBe(8);
    const rey = mesaDe("b-rey"); // Ojo de halcón: además lee el farol
    expect(rey.dadoCargadoId).toBe("b-rey");
    expect(rey.dadoCargadoIntentos).toBeGreaterThan(senador.dadoCargadoIntentos);
    const patron = armarMesaSecreta("X"); // La banca nunca pierde: el tope
    expect(patron.dadoCargadoId).toBe("b-patron");
    expect(patron.dadoCargadoIntentos).toBeGreaterThan(rey.dadoCargadoIntentos);
    // Un boss SIN esa habilidad no recarga su mano.
    expect(mesaDe("b-berta").dadoCargadoId).toBeNull();
  });

  it("Témpano, el Rey y el Patrón juegan 'brutal' (leen el farol); los demás jefes no", () => {
    const nivelDe = (id: string) => {
      for (const e of CAMPANA) {
        const r = e.rivales.find((x) => x.id === id);
        if (r) return r.nivel;
      }
      throw new Error("no está " + id);
    };
    expect(nivelDe("b-croata")).toBe("brutal");
    expect(nivelDe("b-rey")).toBe("brutal");
    expect(REY_VERDADERO.nivel).toBe("brutal");
    for (const id of ["b-berta", "b-carnicero", "b-verdugo", "b-senador"]) {
      expect(nivelDe(id)).not.toBe("brutal");
    }
  });

  it("cada jefe de capítulo tiene una identidad mecánica distinta (sin repetir la misma trampa)", () => {
    const huella = (r: (typeof CAMPANA)[number]["rivales"][number]) =>
      JSON.stringify({ nivel: r.nivel, reglas: r.habilidad?.reglas ?? null, dadoCargado: r.habilidad?.dadoCargado ?? null });
    const bosses = CAMPANA.map((e) => e.rivales[e.rivales.length - 1]!);
    const huellas = bosses.map(huella);
    expect(new Set(huellas).size).toBe(bosses.length);
  });

  it("todos los jefes traen cinemática que cierra en primer plano (el Patrón, la más larga)", () => {
    const bosses = [...CAMPANA.map((e) => e.rivales[e.rivales.length - 1]!), REY_VERDADERO];
    for (const b of bosses) {
      expect(b.cinematica, `${b.id} cinemática`).toBeTruthy();
      // Los jefes de barrio: plano general -> plano medio -> primer plano.
      // El jefe SECRETO carga además su leyenda: 5 pasajes.
      expect(b.cinematica!.length).toBe(b.id === "b-patron" ? 5 : 3);
      for (const beat of b.cinematica!) {
        expect(beat.escena, `${b.id} escena`).toBeTruthy();
        expect(beat.texto, `${b.id} texto`).toBeTruthy();
      }
      const cierre = b.cinematica![b.cinematica!.length - 1]!;
      expect(cierre.escena.startsWith("retrato-"), `${b.id} cierra en retrato`).toBe(true);
    }
  });

  it("cada capítulo trae un epílogo de 2 pasajes antes del cierre, cada uno con su estampa", () => {
    for (const e of CAMPANA) {
      expect(e.epilogoBeats, `${e.clave} epilogoBeats`).toBeTruthy();
      expect(e.epilogoBeats!.length).toBe(2);
      for (const beat of e.epilogoBeats!) {
        expect(beat.escena, `${e.clave} escena`).toBeTruthy();
        expect(beat.texto, `${e.clave} texto`).toBeTruthy();
      }
    }
  });

  it("todos los jefes (y el Patrón) tienen frases de mesa completas (los 4 gatillos)", () => {
    const bosses = [...CAMPANA.map((e) => e.rivales[e.rivales.length - 1]!), REY_VERDADERO];
    for (const b of bosses) {
      expect(b.frases, `${b.id} frases`).toBeTruthy();
      for (const g of ["caza", "cae", "siciliana", "alFilo"] as const) {
        expect(b.frases![g], `${b.id} frase ${g}`).toBeTruthy();
      }
    }
  });

  it("el cabro del puerto vuelve: pocilga deja la marca, La Vega la usa y la Cumbre paga el arco", () => {
    // La opción de darle pega al cabro deja la marca "cabro".
    const pocilga = CAMPANA[0]!.eventos!.find((e) => e.evento.clave === "pocilga-cabro")!.evento;
    expect(pocilga.tipo !== "lectura" && pocilga.opciones[0]!.marca).toBe("cabro");
    // Con la marca, en La Vega aparece el evento del reencuentro…
    const h = historiaNueva("Padrino");
    h.escenarioIdx = 1;
    h.rivalIdx = 1;
    h.marcas = ["cabro"];
    expect(eventoActual(h)?.clave).toBe("vega-cabro");
    // …y sin la marca, no.
    h.marcas = [];
    expect(eventoActual(h)?.clave).not.toBe("vega-cabro");
    // Tomarlo de campana deja "padrino", que gatilla el cierre del arco en la Cumbre.
    const vega = CAMPANA[1]!.eventos!.find((e) => e.evento.clave === "vega-cabro")!.evento;
    expect(vega.tipo !== "lectura" && vega.opciones[0]!.marca).toBe("padrino");
    const cumbre = CAMPANA[5]!.eventos!.find((e) => e.evento.clave === "cumbre-campana")!;
    expect(cumbre.requiere).toBe("padrino");
  });

  it("ecosDelCamino traduce las marcas notables a líneas del epílogo (e ignora las desconocidas)", () => {
    const ecos = ecosDelCamino(["honrado", "verdad", "marca-inventada"]);
    expect(ecos.length).toBe(2);
    for (const linea of ecos) expect(linea.length).toBeGreaterThan(10);
    expect(ecosDelCamino([])).toEqual([]);
  });

  it("los OFICIOS: 5 estilos, cada uno con su bono de partida", () => {
    expect(OFICIOS.length).toBe(5);
    expect(new Set(OFICIOS.map((o) => o.id)).size).toBe(5);
    for (const o of OFICIOS) {
      expect(o.nombre).toBeTruthy();
      expect(o.glifo).toBeTruthy();
      expect(o.desc).toBeTruthy();
    }
    // Atributo de partida
    expect(historiaNueva("X", 0, "relojero").atributos.ojo).toBe(1);
    expect(historiaNueva("X", 0, "charlatan").atributos.colmillo).toBe(1);
    expect(historiaNueva("X", 0, "cabalista").atributos.suerte).toBe(1);
    // Items y plata
    const contra = historiaNueva("X", 0, "contrabandista");
    expect(contra.inventario).toEqual({ cargado: 1, marcado: 1, soplon: 1 });
    expect(historiaNueva("X", 0, "buenacuna").plata).toBe(250);
    // Sin oficio: todo en cero, como siempre
    const plano = historiaNueva("X");
    expect(plano.atributos).toEqual({ ojo: 0, colmillo: 0, suerte: 0 });
    expect(plano.plata).toBe(0);
    // La leyenda y el oficio se suman (colchón de fama + apellido)
    expect(historiaNueva("X", 2, "buenacuna").plata).toBe(450);
  });

  it("el oficio abarata lo suyo: mejoras un 25% menos, items un 20% menos, desafíos +25%", () => {
    // El Relojero: el Ojo cuesta 60 -> 45; los demás atributos, precio normal.
    expect(costoMejora("ojo", 0)).toBe(60);
    expect(costoMejora("ojo", 0, "relojero")).toBe(45);
    expect(costoMejora("colmillo", 0, "relojero")).toBe(80);
    expect(costoMejora("suerte", 0, "cabalista")).toBe(Math.round(50 * 0.75));
    // El Contrabandista: items al 80%.
    expect(costoItem("soplon")).toBeGreaterThan(costoItem("soplon", "contrabandista"));
    expect(costoItem("cargado", "relojero")).toBe(costoItem("cargado"));
    // De Buena Cuna: el bono del desafío paga +25%.
    const rival = CAMPANA[0]!.rivales[0]!;
    expect(bonoDesafio(rival, "buenacuna")).toBe(Math.round(rival.plata * 1.25));
    expect(bonoDesafio(rival)).toBe(rival.plata);
  });

  it("los desafíos nuevos entran a la rotación y el umbral Maratón crece con la mesa", () => {
    const claves = new Set<string>();
    for (let i = 0; i < 400; i++) {
      claves.add(desafioDe({ ...CAMPANA[0]!.rivales[0]!, id: "fake-" + i }).clave);
    }
    for (const c of ["temerario", "maraton", "cabalero"]) expect(claves.has(c), c).toBe(true);
    expect(umbralMaraton(2)).toBe(9);
    expect(umbralMaraton(6)).toBe(29);
    expect(umbralMaraton(6)).toBeGreaterThan(umbralRelampago(6));
  });

  it("Nueva Partida+ (Leyenda): endurece a todos los rivales un escalón y parte con un colchón", () => {
    const h0 = historiaNueva("Novato");
    expect(h0.leyenda).toBe(0);
    expect(armarMesa(h0).nivelPorJugador["r-pulga"]).toBe("facil");

    const h1 = historiaNueva("Leyenda", 1);
    expect(h1.leyenda).toBe(1);
    expect(h1.plata).toBe(100);
    expect(armarMesa(h1).nivelPorJugador["r-pulga"]).toBe("medio"); // facil + 1

    const h2 = historiaNueva("Doble", 2);
    expect(armarMesa(h2).nivelPorJugador["r-pulga"]).toBe("avanzado"); // facil + 2
    h2.escenarioIdx = 5;
    h2.rivalIdx = 2;
    expect(armarMesa(h2).nivelPorJugador["b-rey"]).toBe("brutal"); // ya estaba al tope

    // normalizar preserva la leyenda y le pone 0 a los saves viejos.
    expect(normalizar(h1).leyenda).toBe(1);
    const viejo = historiaNueva("Viejo");
    delete (viejo as { leyenda?: number }).leyenda;
    expect(normalizar(viejo).leyenda).toBe(0);
  });

  it("la cinemática del jefe se recorre pasaje a pasaje antes de mostrar su presentación", () => {
    const idxVerdugo = CAMPANA.findIndex((e) => e.clave === "maestranza");
    const h = historiaNueva("Curioso");
    h.escenarioIdx = idxVerdugo;
    h.rivalIdx = CAMPANA[idxVerdugo]!.rivales.length - 1; // El Verdugo
    const th = new TransporteHistoria(h);
    let v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("intro");
    expect(v.cinematica).toBeTruthy();
    expect(v.cinematica!.idx).toBe(0);
    expect(v.cinematica!.total).toBe(3);
    expect(v.cinematica!.esUltimo).toBe(false);

    th.historiaContinuar!();
    th.historiaContinuar!();
    v = th.instantanea().historia!;
    expect(v.cinematica!.idx).toBe(2);
    expect(v.cinematica!.esUltimo).toBe(true);

    th.historiaContinuar!(); // se acabó la cinemática: no quedan más pasajes
    v = th.instantanea().historia!;
    expect(v.cinematica).toBeNull();
    expect(v.faseHistoria).toBe("intro"); // sigue en la intro, ahora con la ficha normal
    th.detener();
  });

  it("el desafío es determinista y esquiva los que la mesa no permite cumplir", () => {
    for (const e of CAMPANA) {
      for (const r of e.rivales) {
        const d = desafioDe(r);
        expect(d).toEqual(desafioDe(r)); // determinista
        if (r.habilidad?.reglas?.calzarPermitido === false) {
          expect(["calzador", "doblete"]).not.toContain(d.clave); // imposible sin calzo
        }
        if (r.habilidad?.reglas?.obligadoActivo === false) {
          expect(d.clave).not.toBe("resucitado"); // sin obligado, nunca se cumple
        }
      }
    }
  });

  it("hay variedad real de desafíos entre todos los rivales (no siempre los mismos 2)", () => {
    const claves = new Set(CAMPANA.flatMap((e) => e.rivales.map((r) => desafioDe(r).clave)));
    expect(claves.size).toBeGreaterThanOrEqual(5); // de los 8 tipos, se ven al menos 5 distintos
  });

  it("umbralRelampago crece con el tamaño de la mesa (calibrado jugando partidas)", () => {
    expect(umbralRelampago(2)).toBe(7);
    expect(umbralRelampago(6)).toBe(27);
    expect(umbralRelampago(6)).toBeGreaterThan(umbralRelampago(2));
  });

  it("opcionesApuesta ofrece nada/mitad/entera/doble hasta donde alcanza la plata", () => {
    expect(opcionesApuesta(1000, 100)).toEqual([0, 50, 100, 200]);
    expect(opcionesApuesta(120, 100)).toEqual([0, 50, 100]); // el doble no alcanza
    expect(opcionesApuesta(0, 100)).toEqual([0]); // sin plata, sin riesgo
  });

  it("historiaApostar fija la apuesta sólo en la intro y dentro de las opciones", () => {
    const h = historiaNueva("Tahur");
    h.plata = 100;
    h.dilemasResueltos = ["pocilga-cabro"];
    const th = new TransporteHistoria(h);
    let v = th.instantanea().historia!;
    expect(v.apuesta).toBeTruthy();
    expect(v.apuesta!.premioBase).toBe(20); // El Pulguita
    expect(v.apuesta!.opciones).toEqual([0, 10, 20, 40]);

    th.historiaApostar!(40);
    v = th.instantanea().historia!;
    expect(v.apuesta!.elegida).toBe(40);

    th.historiaApostar!(33); // monto inválido: se ignora
    expect(th.instantanea().historia!.apuesta!.elegida).toBe(40);

    th.historiaEmpezar!(); // ya en la mesa no se cambia
    th.historiaApostar!(0);
    expect(th.instantanea().historia!.faseHistoria).toBe("mesa");
    th.detener();
  });

  it("hay tres finales y un jefe final secreto", () => {
    expect(Object.keys(FINALES).sort()).toEqual(["estandar", "malo", "verdadero"]);
    expect(REY_VERDADERO.esBoss).toBe(true);
    expect(REY_VERDADERO.mesa).toBe(2); // duelo 1v1 secreto
    expect(REY_VERDADERO.habilidad).toBeTruthy();
  });

  it("tipoFinal decide el final según las marcas del camino", () => {
    const con = (marcas: string[]) => ({ ...historiaNueva("X"), marcas });
    // verdadero: limpio + descubrió el secreto (verdad), sin marcas oscuras
    expect(tipoFinal(con(["honrado", "aliado", "verdad"]))).toBe("verdadero");
    // verdad pero con una mancha oscura -> NO verdadero (cae a estándar)
    expect(tipoFinal(con(["verdad", "delator"]))).toBe("estandar");
    // dos acciones oscuras -> malo (traición y muerte)
    expect(tipoFinal(con(["saqueador", "delator"]))).toBe("malo");
    expect(tipoFinal(con(["asesino", "sin-alma"]))).toBe("malo");
    // camino tibio -> estándar
    expect(tipoFinal(con([]))).toBe("estandar");
    expect(tipoFinal(con(["honrado"]))).toBe("estandar");
  });

  it("aceptar la ayuda del aliado deja la marca 'verdad' (la llave del final real)", () => {
    const cumbre = CAMPANA.find((e) => e.clave === "cumbre")!;
    const aliado = cumbre.eventos!.find((pe) => pe.evento.clave === "cumbre-aliado")!.evento;
    expect(aliado.tipo === "lectura" ? [] : aliado.opciones[0]!.marca).toBe("verdad");
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

  it("baja un save de la versión con exploración (v4): derrotados → puntero lineal", () => {
    // Jugó la versión RPG: en La Vega venció a 2 rivales (en cualquier orden).
    const v4 = {
      ...historiaNueva("Explorador"),
      escenarioIdx: 1,
      rivalIdx: 0, // en v4 esto era "último retado", no avance
      version: 4,
      derrotados: ["r-quintrala", "r-charqui", "r-pulga", "r-roto", "r-cabrera", "b-berta"],
    } as EstadoHistoria & { derrotados: string[] };
    const n = normalizar(v4);
    expect(n.escenarioIdx).toBe(1);
    expect(n.rivalIdx).toBe(2); // 2 rivales de La Vega vencidos → va por el 3º

    // Capítulo completo vencido (incluido el jefe): queda apuntando al jefe.
    const v4b = {
      ...historiaNueva("Explorador2"),
      escenarioIdx: 0,
      version: 4,
      derrotados: ["r-pulga", "r-roto", "r-cabrera", "b-berta"],
    } as EstadoHistoria & { derrotados: string[] };
    expect(normalizar(v4b).rivalIdx).toBe(3);
  });
});

describe("eventos e items (TransporteHistoria)", () => {
  it("empezar entra al evento (dilema); elegir entrega el premio y muestra el desenlace", () => {
    const th = new TransporteHistoria(historiaNueva("Detective"));
    th.historiaEmpezar();
    let v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("evento");
    expect(v.evento!.tipo).toBe("dilema");
    expect(v.evento!.opciones.length).toBe(2);
    expect(v.evento!.resultado).toBeNull();

    // Opción del soplón (índice 1 en La Pocilga).
    th.historiaElegir!(1);
    v = th.instantanea().historia!;
    expect(v.evento!.resultado).toBeTruthy();
    expect(v.itemsEnMano.some((it) => it.id === "soplon" && it.cantidad === 1)).toBe(true);

    th.historiaContinuar!();
    expect(th.instantanea().historia!.faseHistoria).toBe("mesa");
    th.detener();
  });

  it("la lectura de suerte da vuelta una carta y aplica su efecto (ventaja a la mesa)", () => {
    const h = historiaNueva("Pitona");
    h.escenarioIdx = 1; // La Vega
    h.rivalIdx = 2; // la lectura está antesDe 2
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    let v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("evento");
    expect(v.evento!.tipo).toBe("lectura");
    expect(v.evento!.cartas.length).toBe(3);
    expect(v.evento!.cartas.every((c) => !c.volteada)).toBe(true);

    th.historiaSacarCarta!(0); // El Sol -> suerte_extra
    v = th.instantanea().historia!;
    expect(v.evento!.resultado).toBeTruthy();
    expect(v.evento!.efecto?.bueno).toBe(true);
    expect(v.evento!.cartas[0]!.elegida).toBe(true);

    th.historiaContinuar!(); // a la mesa: la ventaja suma +1 a la Suerte
    v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("mesa");
    expect(v.suerteDisponible).toBe(1); // atributo 0 + 1 de la ventaja
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

  it("una decisión deja marca, y la marca ramifica eventos futuros", () => {
    // En La Vega, robarle al muerto deja la marca "saqueador".
    const h = historiaNueva("Saq");
    h.escenarioIdx = 1; // La Vega
    h.rivalIdx = 0; // la billetera está antesDe 0
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    expect(th.instantanea().historia!.evento!.tipo).toBe("dilema");
    th.historiaElegir!(0); // "Quédatela"
    expect(th.instantanea().historia!.marcas).toContain("saqueador");
    th.detener();

    // Más adelante (El Subterráneo), esa marca abre la consecuencia "el hermano".
    const idxClub = CAMPANA.findIndex((e) => e.clave === "club");
    const base = () => {
      const x = historiaNueva("X");
      x.escenarioIdx = idxClub;
      x.rivalIdx = 1;
      return x;
    };
    const conSaqueador = base();
    conSaqueador.marcas = ["saqueador"];
    expect(eventoActual(conSaqueador)?.clave).toBe("club-hermano");

    const conHonrado = base();
    conHonrado.marcas = ["honrado"];
    expect(eventoActual(conHonrado)?.clave).toBe("club-recado");

    const sinMarca = base();
    sinMarca.marcas = [];
    expect(eventoActual(sinMarca)).toBeNull(); // sin pasado, no hay consecuencia
  });

  it("eventoActual aparece antes del rival indicado y no si ya fue resuelto", () => {
    const h = historiaNueva("X");
    const ev0 = CAMPANA[0]!.eventos![0]!.evento;
    expect(eventoActual(h)?.clave).toBe(ev0.clave); // antesDe 0
    h.rivalIdx = 1;
    expect(eventoActual(h)).toBeNull(); // La Pocilga no tiene evento antesDe 1
    h.rivalIdx = 0;
    h.dilemasResueltos = [ev0.clave];
    expect(eventoActual(h)).toBeNull(); // ya resuelto
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

// Los ACERTIJOS (candados de cifra): secretos opcionales por barrio, sin
// castigo al fallar, con premio de una sola vez. Y el Cuaderno del Tahúr.
describe("acertijos (candados de cifra)", () => {
  it("los candados: soluciones con pintas 1..6, claves únicas y ficha en el cuaderno", () => {
    const acertijos = CAMPANA.flatMap((e) => (e.acertijo ? [e.acertijo] : []));
    expect(acertijos.length).toBe(3);
    const claves = acertijos.map((a) => a.clave);
    expect(new Set(claves).size).toBe(claves.length);
    for (const a of acertijos) {
      expect(a.solucion.length).toBe(3);
      for (const n of a.solucion) {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(6);
      }
      expect(a.texto, `${a.clave} texto`).toBeTruthy();
      expect(a.fallo, `${a.clave} fallo`).toBeTruthy();
      expect(a.desenlace, `${a.clave} desenlace`).toBeTruthy();
      expect(SECRETOS.some((s) => s.clave === a.clave), `${a.clave} en SECRETOS`).toBe(true);
    }
    expect(SECRETOS.length).toBe(acertijos.length);
  });

  it("toda marca que reparte la campaña tiene ficha en MARCAS_INFO", () => {
    const marcas = new Set<string>();
    for (const e of CAMPANA) {
      for (const ev of e.eventos ?? []) {
        const premios = ev.evento.tipo === "lectura" ? ev.evento.cartas : ev.evento.opciones;
        for (const op of premios) {
          if (op.marca) marcas.add(op.marca);
        }
      }
    }
    expect(marcas.size).toBeGreaterThan(0);
    for (const m of marcas) {
      expect(MARCAS_INFO[m], `marca ${m} sin ficha`).toBeTruthy();
    }
  });

  it("cada capítulo y cada final tienen su estampa (Escena)", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < CAMPANA.length; i++) {
      const e = escenaCapitulo(i);
      expect(e).toBeTruthy();
      vistas.add(e);
    }
    expect(vistas.size).toBe(CAMPANA.length); // ninguna repetida
    for (const tf of ["estandar", "malo", "verdadero"] as TipoFinal[]) {
      expect(escenaFinal(tf)).toBeTruthy();
    }
    expect(new Set([escenaFinal("estandar"), escenaFinal("malo"), escenaFinal("verdadero")]).size).toBe(3);
  });

  it("cada final trae un epílogo de varios pasajes, cada uno con su propia estampa", () => {
    const todasLasEscenas = new Set<string>();
    let totalBeats = 0;
    // El verdadero es el final más largo: es el que carga el lore del Patrón.
    expect(FINALES.verdadero.beats.length).toBeGreaterThan(FINALES.estandar.beats.length);
    expect(FINALES.verdadero.beats.length).toBeGreaterThan(FINALES.malo.beats.length);
    for (const tf of ["estandar", "malo", "verdadero"] as TipoFinal[]) {
      const beats = FINALES[tf].beats;
      expect(beats.length).toBeGreaterThanOrEqual(4);
      totalBeats += beats.length;
      for (const b of beats) {
        expect(b.texto, `${tf} texto`).toBeTruthy();
        expect(b.escena, `${tf} escena`).toBeTruthy();
        todasLasEscenas.add(b.escena);
      }
      // el pasaje de cierre coincide con escenaFinal (la estampa del Cuaderno).
      expect(beats[beats.length - 1]!.escena).toBe(escenaFinal(tf));
    }
    expect(todasLasEscenas.size).toBe(totalBeats); // ninguna estampa se repite entre pasajes
  });

  it("los finales incompletos avisan que la Banca sigue invicta; el verdadero cuenta la historia del Patrón", () => {
    // El estándar y el malo cierran nombrando a la Banca sin dueño nuevo.
    for (const tf of ["estandar", "malo"] as TipoFinal[]) {
      const cierre = FINALES[tf].beats[FINALES[tf].beats.length - 1]!.texto.toLowerCase();
      expect(cierre, `${tf} nombra a la banca`).toContain("banca");
      expect(cierre, `${tf} deja claro el invicto`).toContain("invicta");
    }
    // …y sueltan la pista del camino: llegar limpio, y con un amigo.
    const cartaEstandar = FINALES.estandar.beats[FINALES.estandar.beats.length - 1]!.texto.toLowerCase();
    expect(cartaEstandar).toContain("limpias");
    expect(cartaEstandar).toContain("amigo");
    // El verdadero revela el ciclo: la confesión del Patrón y su nombre en la libreta.
    const textoVerdadero = FINALES.verdadero.beats.map((b) => b.texto).join(" ");
    expect(textoVerdadero).toContain("Yo también subí desde un muelle");
    expect(textoVerdadero.toLowerCase()).toContain("libreta");
  });

  it("la cinemática del jefe secreto cuenta su leyenda (5 pasajes, estampas propias)", () => {
    const beats = REY_VERDADERO.cinematica!;
    expect(beats.length).toBe(5);
    expect(new Set(beats.map((b) => b.escena)).size).toBe(beats.length);
    const relato = beats.map((b) => b.texto).join(" ");
    expect(relato).toContain("treinta años"); // el mito del ciclo
    expect(relato.toLowerCase()).toContain("libreta"); // los que llegaron antes
  });

  it("abrir el candado: fallar no castiga, acertar premia una sola vez y el secreto se cierra", () => {
    const h = historiaNueva("Curioso");
    h.escenarioIdx = 1; // La Vega: el candado del Charqui [4,3,3]
    const th = new TransporteHistoria(h);
    let v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("intro");
    expect(v.acertijoDisponible).toBeTruthy();

    th.historiaAbrirAcertijo!();
    v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("acertijo");
    expect(v.acertijo!.desenlace).toBeNull();
    const plataAntes = v.plata;

    // Cifra equivocada: burla, sin castigo, se puede volver a intentar.
    th.historiaProbarCifra!([1, 1, 1]);
    v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("acertijo");
    expect(v.acertijo!.fallo).toBeTruthy();
    expect(v.acertijo!.desenlace).toBeNull();
    expect(v.plata).toBe(plataAntes);

    // La cifra correcta abre el cofre: desenlace + premio.
    th.historiaProbarCifra!([4, 3, 3]);
    v = th.instantanea().historia!;
    expect(v.acertijo!.desenlace).toBeTruthy();
    expect(v.plata).toBe(plataAntes + 100);
    expect(v.itemsEnMano.some((it) => it.id === "marcado" && it.cantidad === 1)).toBe(true);

    // Probar de nuevo con el cofre abierto no duplica el premio.
    th.historiaProbarCifra!([4, 3, 3]);
    expect(th.instantanea().historia!.plata).toBe(plataAntes + 100);

    // Continuar vuelve a la puerta del barrio, y el secreto ya no se ofrece.
    th.historiaContinuar!();
    v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("intro");
    expect(v.acertijoDisponible).toBeNull();
    th.detener();
  });

  it("el candado sólo se abre desde la puerta del barrio (guard de fase)", () => {
    const h = historiaNueva("Apurado");
    h.escenarioIdx = 1;
    const th = new TransporteHistoria(h);
    th.historiaEmpezar(); // deja atrás la intro
    const fase = th.instantanea().historia!.faseHistoria;
    expect(fase).not.toBe("intro");
    th.historiaAbrirAcertijo!();
    expect(th.instantanea().historia!.faseHistoria).toBe(fase);
    th.detener();
  });

  it("un secreto ya resuelto (guardado en dilemasResueltos) no vuelve a ofrecerse", () => {
    const h = historiaNueva("Memorioso");
    h.escenarioIdx = 1;
    h.dilemasResueltos = ["sec-charqui"];
    const th = new TransporteHistoria(h);
    expect(th.instantanea().historia!.faseHistoria).toBe("intro");
    expect(th.instantanea().historia!.acertijoDisponible).toBeNull();
    th.detener();
  });

  it("los barrios sin candado no ofrecen secreto (La Pocilga)", () => {
    const th = new TransporteHistoria(historiaNueva("Turista"));
    expect(th.instantanea().historia!.acertijoDisponible).toBeNull();
    th.detener();
  });
});

describe("encargos del barrio (contratos por capítulo)", () => {
  it("cada barrio tiene su encargo, con patrón, contrato y pago válidos", () => {
    for (const esc of CAMPANA) {
      const e = ENCARGOS[esc.clave];
      expect(e, `encargo de ${esc.clave}`).toBeTruthy();
      expect(e!.patron, esc.clave).toBeTruthy();
      expect(e!.texto, esc.clave).toBeTruthy();
      expect(e!.plata, esc.clave).toBeGreaterThan(0);
      if (e!.tipo === "cosecha") expect(e!.meta ?? 0, esc.clave).toBeGreaterThan(0);
    }
    // Hay variedad de contratos, no siempre el mismo truco.
    const tipos = new Set(Object.values(ENCARGOS).map((e) => e.tipo));
    expect(tipos.size).toBeGreaterThanOrEqual(3);
  });

  it("la oferta aparece en la puerta del barrio; aceptar la deja en curso", () => {
    const th = new TransporteHistoria(historiaNueva("Contratista"));
    let v = th.instantanea().historia!;
    expect(v.encargo?.estado).toBe("ofrecido");
    th.historiaEncargo!(true);
    v = th.instantanea().historia!;
    expect(v.encargo?.estado).toBe("encurso");
    expect(v.encargo?.patron).toBe("Doña Berta");
    th.detener();
  });

  it("dejarla pasar la borra, y no se vuelve a ofrecer en el barrio", () => {
    const th = new TransporteHistoria(historiaNueva("Esquivo"));
    th.historiaEncargo!(false);
    expect(th.instantanea().historia!.encargo).toBeNull();
    th.detener();
  });

  it("sentarse a la mesa sin firmar hace caducar la oferta", () => {
    const th = new TransporteHistoria(historiaNueva("Distraído"));
    th.historiaEmpezar(); // al evento del cabro, sin decidir el encargo
    expect(th.instantanea().historia!.encargo).toBeNull();
    // Y de vuelta en una intro del mismo barrio, tampoco reaparece.
    th.detener();
  });

  it("en un barrio de 'manos quietas', usar un item rompe el contrato", () => {
    const h = historiaNueva("Tramposo");
    h.escenarioIdx = 2; // La Maestranza: el encargo de La Trenza
    h.inventario.soplon = 1;
    const th = new TransporteHistoria(h);
    expect(ENCARGOS["maestranza"]!.tipo).toBe("manos-quietas");
    th.historiaEncargo!(true);
    th.historiaEmpezar(); // el quiltro entre los fierros
    th.historiaElegir!(0);
    th.historiaContinuar!(); // a la mesa
    expect(th.instantanea().historia!.faseHistoria).toBe("mesa");
    th.historiaUsarItem!("soplon");
    expect(th.instantanea().historia!.encargo?.estado).toBe("roto");
    th.detener();
  });

  it("la vista de la oferta trae el pago completo (plata + item si lo hay)", () => {
    const th = new TransporteHistoria(historiaNueva("Lector"));
    const v = th.instantanea().historia!;
    expect(v.encargo?.plata).toBe(ENCARGOS["pocilga"]!.plata);
    expect(v.encargo?.item).toBe("El dato del soplón"); // soplon, con nombre humano
    expect(v.encargo?.meta).toBeNull(); // "sin-caer" no es cosecha
    th.detener();
  });

  it("el encargo aceptado persiste en el estado (capítulo y progreso)", () => {
    const th = new TransporteHistoria(historiaNueva("Firme"));
    th.historiaEncargo!(true);
    th.detener();
    // El estado quedó guardado en prefs vía guardarPrefs (sin storage acá,
    // pero el objeto en memoria del transporte ya lo refleja en la vista).
    const th2 = new TransporteHistoria({ ...historiaNueva("Firme"), encargo: { capitulo: 0, aceptado: true, roto: false, pagado: false, progreso: 0 } });
    expect(th2.instantanea().historia!.encargo?.estado).toBe("encurso");
    th2.detener();
  });
});

describe("la corrida en números (cuentas)", () => {
  it("una campaña nueva parte con los contadores en cero", () => {
    const h = historiaNueva("Contable");
    expect(h.cuentas).toEqual({ ganadas: 0, caidas: 0, plataJuntada: 0, desafios: 0, encargos: 0 });
  });

  it("normalizar repone cuentas y encargo en saves viejos", () => {
    const viejo = { ...historiaNueva("Antiguo") } as EstadoHistoria & { cuentas?: unknown; encargo?: unknown };
    delete viejo.cuentas;
    delete viejo.encargo;
    const n = normalizar(viejo as EstadoHistoria);
    expect(n.cuentas).toEqual({ ganadas: 0, caidas: 0, plataJuntada: 0, desafios: 0, encargos: 0 });
    expect(n.encargo).toBeNull();
    // y respeta contadores parciales de un save a medio migrar
    const parcial = { ...historiaNueva("Parcial"), cuentas: { ganadas: 7 } } as unknown as EstadoHistoria;
    expect(normalizar(parcial).cuentas).toEqual({ ganadas: 7, caidas: 0, plataJuntada: 0, desafios: 0, encargos: 0 });
  });

  it("la vista siempre expone las cuentas", () => {
    const th = new TransporteHistoria(historiaNueva("Vista"));
    expect(th.instantanea().historia!.cuentas.ganadas).toBe(0);
    th.detener();
  });
});

describe("la historia oscura: presagios y el peso de las marcas", () => {
  it("con el alma limpia el río calla; con 2+ marcas oscuras, se anuncia", () => {
    const h = historiaNueva("Limpio");
    expect(presagio(h)).toBeNull();
    h.marcas = ["honrado", "aliado"]; // claras: no cuentan
    expect(presagio(h)).toBeNull();
    h.marcas = ["saqueador"];
    expect(presagio(h)).toBeNull(); // una sola todavía no
    h.marcas = ["saqueador", "profanador"];
    expect(presagio(h)).toContain("Mapocho");
    h.marcas = ["saqueador", "profanador", "asesino"];
    expect(presagio(h)!.length).toBeGreaterThan(presagio({ ...h, marcas: ["saqueador", "profanador"] })!.length);
  });

  it("profanar al muerto del velorio cuenta para el final malo (el jugador muere)", () => {
    expect(MARCAS_OSCURAS).toContain("profanador");
    const h = { ...historiaNueva("Oscuro"), marcas: ["profanador", "delator"] };
    expect(tipoFinal(h)).toBe("malo");
    // …y el deudo, en cambio, no ensucia el camino al final verdadero.
    const limpio = { ...historiaNueva("Deudo"), marcas: ["deudo", "verdad"] };
    expect(tipoFinal(limpio)).toBe("verdadero");
  });

  it("toda marca nueva tiene su ficha en el Cuaderno y su eco en el final", () => {
    for (const m of ["deudo", "profanador"]) {
      expect(MARCAS_INFO[m], m).toBeTruthy();
      expect(ecosDelCamino([m]).length, m).toBe(1);
    }
  });

  it("la reliquia del Chinchorro sólo llega si pagaste el respeto (deudo)", () => {
    const h = historiaNueva("Viudo");
    h.escenarioIdx = 5;
    h.rivalIdx = 1;
    h.marcas = ["deudo"];
    expect(eventoActual(h)?.clave).toBe("cumbre-reliquia");
    h.marcas = [];
    expect(eventoActual(h)?.clave).not.toBe("cumbre-reliquia");
    // …y el aparecido de los fierros te sigue hasta el Subterráneo.
    const h2 = historiaNueva("Perseguido");
    h2.escenarioIdx = 4;
    h2.rivalIdx = 3;
    h2.marcas = ["sangre-fria"];
    expect(eventoActual(h2)?.clave).toBe("club-aparecido");
  });
});
