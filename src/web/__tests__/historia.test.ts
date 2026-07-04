import { describe, it, expect } from "vitest";
import {
  CAMPANA,
  ITEMS,
  HISTORIA_VERSION,
  historiaNueva,
  normalizar,
  armarMesa,
  eventoDisponible,
  estadoEvento,
  rivalesNoBoss,
  tipoFinal,
  desafioDe,
  opcionesApuesta,
  REY_VERDADERO,
  FINALES,
  type EstadoHistoria,
} from "../historia";
import { MAPAS, validarMapa } from "../mapa";
import { TransporteHistoria } from "../transporteHistoria";
import { TransporteLocal } from "../transporte";

// Lógica del MODO HISTORIA: la campaña con EXPLORACIÓN del barrio (mapa
// cenital), eventos con marcas, apuestas, desafíos y los tres finales.
// Pruebas deterministas (sin jugar las mesas, que dependen del azar).

describe("campaña", () => {
  it("tiene 6 escenarios, cada uno terminando en un jefe con habilidad", () => {
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
  });

  it("el desafío es determinista y esquiva 'Calzador' donde no se puede calzar", () => {
    for (const e of CAMPANA) {
      for (const r of e.rivales) {
        const d = desafioDe(r);
        expect(d).toEqual(desafioDe(r));
        if (r.habilidad?.reglas?.calzarPermitido === false) {
          expect(d.clave).not.toBe("calzador");
        }
      }
    }
  });

  it("opcionesApuesta ofrece nada/mitad/entera/doble hasta donde alcanza la plata", () => {
    expect(opcionesApuesta(1000, 100)).toEqual([0, 50, 100, 200]);
    expect(opcionesApuesta(120, 100)).toEqual([0, 50, 100]);
    expect(opcionesApuesta(0, 100)).toEqual([0]);
  });

  it("toda consecuencia (requiere) tiene una causa que la dispara en un capítulo anterior", () => {
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

  it("hay tres finales y un jefe final secreto", () => {
    expect(Object.keys(FINALES).sort()).toEqual(["estandar", "malo", "verdadero"]);
    expect(REY_VERDADERO.esBoss).toBe(true);
    expect(REY_VERDADERO.mesa).toBe(2);
    expect(REY_VERDADERO.habilidad).toBeTruthy();
  });

  it("tipoFinal decide el final según las marcas del camino", () => {
    const con = (marcas: string[]) => ({ ...historiaNueva("X"), marcas });
    expect(tipoFinal(con(["honrado", "aliado", "verdad"]))).toBe("verdadero");
    expect(tipoFinal(con(["verdad", "delator"]))).toBe("estandar");
    expect(tipoFinal(con(["saqueador", "delator"]))).toBe("malo");
    expect(tipoFinal(con([]))).toBe("estandar");
  });
});

describe("mapas del barrio", () => {
  it("los 6 mapas son válidos (dimensiones, entidades sobre piso, sin choques)", () => {
    expect(Object.keys(MAPAS).sort()).toEqual(CAMPANA.map((e) => e.clave).sort());
    for (const [clave, m] of Object.entries(MAPAS)) {
      expect(validarMapa(m), clave).toEqual([]);
    }
  });

  it("cada barrio tiene TODOS sus rivales, la tienda, la puerta y TODOS sus eventos", () => {
    for (const e of CAMPANA) {
      const m = MAPAS[e.clave]!;
      const rivEnts = m.entidades.filter((x) => x.tipo === "rival");
      expect(rivEnts.length, `${e.clave}: rivales en el mapa`).toBe(e.rivales.length);
      for (const re of rivEnts) {
        const r = e.rivales[re.rivalIdx!];
        expect(r, `${e.clave}: rivalIdx ${re.rivalIdx}`).toBeTruthy();
        expect(re.id).toBe(r!.id);
      }
      expect(m.entidades.some((x) => x.tipo === "tienda")).toBe(true);
      expect(m.entidades.some((x) => x.tipo === "puerta")).toBe(true);
      // todos los eventos del capítulo están en el mapa (por clave)
      const clavesMapa = m.entidades.filter((x) => x.tipo === "evento").map((x) => x.eventoClave);
      const clavesCampana = (e.eventos ?? []).map((pe) => pe.evento.clave);
      expect(clavesMapa.sort()).toEqual(clavesCampana.sort());
    }
  });

  // BFS de alcanzabilidad: con la puerta cerrada se llega a todo menos al jefe;
  // con la puerta abierta se llega también al jefe. Todas las entidades cuentan
  // como obstáculos (peor caso). Garantiza campaña completable, sin bloqueos.
  it("todo es alcanzable, y el jefe sólo con la puerta abierta", () => {
    for (const [clave, m] of Object.entries(MAPAS)) {
      const esc = CAMPANA.find((e) => e.clave === clave)!;
      const bossId = esc.rivales[esc.rivales.length - 1]!.id;
      const pared = (x: number, y: number) => x < 0 || y < 0 || x >= m.ancho || y >= m.alto || m.filas[y]![x] === "#";
      const entAt = (x: number, y: number) => m.entidades.find((e) => e.x === x && e.y === y);
      const bfs = (gateOpen: boolean) => {
        const walk = (x: number, y: number) => {
          if (pared(x, y)) return false;
          const e = entAt(x, y);
          if (!e) return true;
          return e.tipo === "puerta" && gateOpen;
        };
        const seen = new Set<string>([`${m.entrada.x},${m.entrada.y}`]);
        const q: Array<[number, number]> = [[m.entrada.x, m.entrada.y]];
        while (q.length) {
          const [x, y] = q.shift()!;
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
            const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
            if (!seen.has(k) && walk(nx, ny)) { seen.add(k); q.push([nx, ny]); }
          }
        }
        return seen;
      };
      const adj = (seen: Set<string>, e: { x: number; y: number }) =>
        ([[0, -1], [0, 1], [-1, 0], [1, 0]] as const).some(([dx, dy]) => seen.has(`${e.x + dx},${e.y + dy}`));
      const cerrada = bfs(false);
      for (const e of m.entidades) {
        if (e.tipo === "rival" && e.id === bossId) continue;
        expect(adj(cerrada, e), `${clave}:${e.id} alcanzable`).toBe(true);
      }
      const abierta = bfs(true);
      const boss = m.entidades.find((e) => e.id === bossId)!;
      expect(adj(abierta, boss), `${clave}: jefe alcanzable con puerta abierta`).toBe(true);
    }
  });
});

describe("normalizar (migración de saves)", () => {
  it("migra un save viejo: corre el índice por La Maestranza y arma derrotados", () => {
    const viejo = {
      nombre: "Antiguo",
      atributos: { ojo: 1 },
      plata: 100,
      escenarioIdx: 2, // antes era La Trastienda
      rivalIdx: 2, // había vencido a 2 rivales
      completado: false,
    } as unknown as EstadoHistoria;
    const n = normalizar(viejo);
    expect(CAMPANA[3]!.clave).toBe("trastienda");
    expect(n.escenarioIdx).toBe(3);
    expect(n.version).toBe(HISTORIA_VERSION);
    expect(n.derrotados).toEqual(CAMPANA[3]!.rivales.slice(0, 2).map((r) => r.id));
    expect(n.inventario).toEqual({ cargado: 0, marcado: 0, soplon: 0 });
    expect(Array.isArray(n.premiosReclamados)).toBe(true);
    expect(Array.isArray(n.marcas)).toBe(true);
  });

  it("no re-migra un save ya actual", () => {
    const nuevo = { ...historiaNueva("B"), escenarioIdx: 4, derrotados: ["r-madame"] };
    const n = normalizar(nuevo);
    expect(n.escenarioIdx).toBe(4);
    expect(n.derrotados).toEqual(["r-madame"]);
  });
});

// --- Navegación por el mapa (helpers deterministas) --------------------------
function ex(th: TransporteHistoria) {
  return th.instantanea().historia!.explorar!;
}
function fase(th: TransporteHistoria) {
  return th.instantanea().historia!.faseHistoria;
}
/** BFS: direcciones desde el jugador hasta una casilla adyacente a (tx,ty). */
function rutaAdyacente(e: ReturnType<typeof ex>, tx: number, ty: number): string[] | null {
  const pared = (x: number, y: number) => x < 0 || y < 0 || x >= e.ancho || y >= e.alto || e.filas[y]![x] === "#";
  const entAt = (x: number, y: number) => e.entidades.find((en) => en.x === x && en.y === y);
  const walk = (x: number, y: number) => !pared(x, y) && !entAt(x, y);
  const adj = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty) === 1;
  const key = (x: number, y: number) => `${x},${y}`;
  const start = e.jugador;
  if (adj(start.x, start.y)) return [];
  const prev = new Map<string, { px: number; py: number; dir: string }>();
  const seen = new Set([key(start.x, start.y)]);
  const q: Array<[number, number]> = [[start.x, start.y]];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy, dir] of [[0, -1, "arriba"], [0, 1, "abajo"], [-1, 0, "izquierda"], [1, 0, "derecha"]] as const) {
      const nx = x + dx, ny = y + dy, k = key(nx, ny);
      if (seen.has(k) || !walk(nx, ny)) continue;
      seen.add(k);
      prev.set(k, { px: x, py: y, dir });
      if (adj(nx, ny)) {
        const dirs: string[] = [];
        let cur = k;
        while (prev.has(cur)) {
          const p = prev.get(cur)!;
          dirs.unshift(p.dir);
          cur = key(p.px, p.py);
        }
        return dirs;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}
function dirHacia(fx: number, fy: number, tx: number, ty: number): string {
  if (ty < fy) return "arriba";
  if (ty > fy) return "abajo";
  if (tx < fx) return "izquierda";
  return "derecha";
}
/** Camina hasta una entidad y "choca" con ella (la interactúa). */
function caminarHacia(th: TransporteHistoria, entId: string) {
  const e = ex(th);
  const ent = e.entidades.find((x) => x.id === entId)!;
  const ruta = rutaAdyacente(e, ent.x, ent.y);
  if (!ruta) throw new Error("sin ruta a " + entId);
  for (const d of ruta) th.historiaMover(d);
  const j = ex(th).jugador;
  th.historiaMover(dirHacia(j.x, j.y, ent.x, ent.y));
}

describe("exploración del barrio (TransporteHistoria)", () => {
  it("empezar entra al mapa por la entrada; caminar hacia un rival abre su reto", () => {
    const th = new TransporteHistoria(historiaNueva("Forastero"));
    expect(fase(th)).toBe("intro");
    th.historiaEmpezar();
    expect(fase(th)).toBe("explorar");
    expect(ex(th).jugador).toMatchObject(MAPAS.pocilga!.entrada);

    caminarHacia(th, "r-pulga");
    expect(fase(th)).toBe("reto");
    const v = th.instantanea().historia!;
    expect(v.rival.id).toBe("r-pulga");
    expect(v.apuesta).toBeTruthy(); // la apuesta se elige en el reto
    expect(v.desafio).toBeTruthy();

    th.historiaSentarse();
    expect(fase(th)).toBe("mesa");
    th.detener();
  });

  it("historiaApostar fija la apuesta en el reto, dentro de las opciones", () => {
    const h = historiaNueva("Tahur");
    h.plata = 100;
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    caminarHacia(th, "r-pulga");
    let v = th.instantanea().historia!;
    expect(v.apuesta!.premioBase).toBe(20);
    expect(v.apuesta!.opciones).toEqual([0, 10, 20, 40]);
    th.historiaApostar(40);
    expect(th.instantanea().historia!.apuesta!.elegida).toBe(40);
    th.historiaApostar(33); // inválido: se ignora
    expect(th.instantanea().historia!.apuesta!.elegida).toBe(40);
    // volver al barrio resetea la apuesta al re-entrar al reto
    th.historiaContinuar();
    expect(fase(th)).toBe("explorar");
    caminarHacia(th, "r-pulga");
    expect(th.instantanea().historia!.apuesta!.elegida).toBe(0);
    th.detener();
  });

  it("los eventos viven en el mapa: caminar hacia el '?' abre la decisión", () => {
    const th = new TransporteHistoria(historiaNueva("Detective"));
    th.historiaEmpezar();
    caminarHacia(th, "pocilga-cabro");
    expect(fase(th)).toBe("evento");
    const v = th.instantanea().historia!;
    expect(v.evento!.tipo).toBe("dilema");
    th.historiaElegir(1); // el soplón
    expect(th.instantanea().historia!.evento!.resultado).toBeTruthy();
    th.historiaContinuar(); // de vuelta al barrio
    expect(fase(th)).toBe("explorar");
    expect(th.instantanea().historia!.itemsEnMano.some((it) => it.id === "soplon")).toBe(true);
    // el token queda "resuelto" y chocarlo ya no abre nada
    const tok = ex(th).entidades.find((e) => e.id === "pocilga-cabro")!;
    expect(tok.estado).toBe("resuelto");
    th.historiaInteractuar("pocilga-cabro");
    expect(fase(th)).toBe("explorar");
    th.detener();
  });

  it("la puerta del jefe se abre sólo al vencer a los parroquianos", () => {
    const th1 = new TransporteHistoria(historiaNueva("X"));
    th1.historiaEmpezar();
    expect(ex(th1).entidades.find((e) => e.tipo === "puerta")!.estado).toBe("bloqueado");
    caminarHacia(th1, "puerta");
    expect(ex(th1).mensaje).toBeTruthy(); // el aviso de la puerta cerrada
    expect(fase(th1)).toBe("explorar");
    th1.detener();

    const h2 = historiaNueva("Y");
    h2.derrotados = rivalesNoBoss(CAMPANA[0]!);
    const th2 = new TransporteHistoria(h2);
    th2.historiaEmpezar();
    expect(ex(th2).entidades.find((e) => e.tipo === "puerta")!.estado).toBe("abierto");
    caminarHacia(th2, "puerta"); // la cruza
    expect(ex(th2).jugador).toMatchObject({ x: 5, y: 2 });
    th2.historiaMover("arriba"); // hacia el jefe
    expect(fase(th2)).toBe("reto");
    expect(th2.instantanea().historia!.rival.esBoss).toBe(true);
    th2.detener();
  });

  it("a un rival ya vencido no se le vuelve a retar", () => {
    const h = historiaNueva("Z");
    h.derrotados = ["r-pulga"];
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    expect(ex(th).entidades.find((e) => e.id === "r-pulga")!.estado).toBe("derrotado");
    caminarHacia(th, "r-pulga");
    expect(ex(th).mensaje).toMatch(/Ya le ganaste/);
    expect(fase(th)).toBe("explorar");
    th.detener();
  });

  it("las consecuencias con marca aparecen u ocultan su token en el mapa", () => {
    // Sin marca: ni el hermano ni el recado se ven en El Subterráneo.
    const sin = historiaNueva("Neutro");
    sin.escenarioIdx = 4;
    const th1 = new TransporteHistoria(sin);
    th1.historiaEmpezar();
    expect(ex(th1).entidades.some((e) => e.id === "club-hermano")).toBe(false);
    expect(ex(th1).entidades.some((e) => e.id === "club-recado")).toBe(false);
    th1.detener();

    // Saqueador: aparece el hermano del finado (y no el recado).
    const saq = historiaNueva("Saqueador");
    saq.escenarioIdx = 4;
    saq.marcas = ["saqueador"];
    const th2 = new TransporteHistoria(saq);
    th2.historiaEmpezar();
    expect(ex(th2).entidades.some((e) => e.id === "club-hermano")).toBe(true);
    expect(ex(th2).entidades.some((e) => e.id === "club-recado")).toBe(false);
    th2.detener();

    // eventoDisponible respeta requiere/vetadoPor
    expect(eventoDisponible(saq, "club-hermano")?.clave).toBe("club-hermano");
    expect(eventoDisponible(sin, "club-hermano")).toBeNull();
    expect(estadoEvento(sin, "club-hermano")).toBe("oculto");
  });

  it("el botín del mapa se reclama una vez y respeta su condición", () => {
    const h = historiaNueva("Botinero");
    h.escenarioIdx = 1; // La Vega: cajón con candado (plata >= 120)
    h.plata = 50;
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    caminarHacia(th, "vega-cajon");
    expect(ex(th).mensaje).toMatch(/candado|propina/); // sin plata: sólo el aviso
    expect(th.instantanea().historia!.itemsEnMano.some((i) => i.id === "marcado")).toBe(false);
    th.detener();

    const h2 = historiaNueva("Botinero2");
    h2.escenarioIdx = 1;
    h2.plata = 200;
    const th2 = new TransporteHistoria(h2);
    th2.historiaEmpezar();
    caminarHacia(th2, "vega-cajon");
    expect(th2.instantanea().historia!.itemsEnMano.some((i) => i.id === "marcado")).toBe(true);
    caminarHacia(th2, "vega-cajon");
    expect(ex(th2).mensaje).toMatch(/no queda nada/);
    th2.detener();
  });

  it("si el jefe ya cayó (app cerrada en la victoria), el capítulo avanza solo", () => {
    // Save con TODO el capítulo 1 vencido (incluido el jefe) pero sin avanzar.
    const h = historiaNueva("Colgado");
    h.derrotados = CAMPANA[0]!.rivales.map((r) => r.id);
    const th = new TransporteHistoria(h);
    th.historiaEmpezar(); // entrar al barrio detecta al jefe caído
    const v = th.instantanea().historia!;
    expect(v.faseHistoria).toBe("intro"); // la intro de La Vega, no un barrio vacío
    expect(v.escenario.idx).toBe(1);
    th.detener();

    // Lo mismo en el último capítulo: cae directo a la decisión del final.
    const h2 = historiaNueva("Colgado2");
    h2.escenarioIdx = 5;
    h2.derrotados = CAMPANA[5]!.rivales.map((r) => r.id);
    h2.marcas = ["saqueador", "delator"]; // camino oscuro
    const th2 = new TransporteHistoria(h2);
    th2.historiaEmpezar();
    const v2 = th2.instantanea().historia!;
    expect(v2.faseHistoria).toBe("final");
    expect(v2.finalTipo).toBe("malo");
    th2.detener();
  });

  it("tocar un token vecino (historiaInteractuar) también funciona", () => {
    const th = new TransporteHistoria(historiaNueva("Tap"));
    th.historiaEmpezar();
    const e = ex(th);
    const tienda = e.entidades.find((x) => x.tipo === "tienda")!;
    const ruta = rutaAdyacente(e, tienda.x, tienda.y)!;
    for (const d of ruta) th.historiaMover(d);
    expect(fase(th)).toBe("explorar");
    th.historiaInteractuar("tienda");
    expect(fase(th)).toBe("tienda");
    th.historiaContinuar(); // de vuelta al barrio
    expect(fase(th)).toBe("explorar");
    th.detener();
  });
});

describe("tienda e items", () => {
  it("el catálogo de items tiene 3 consumibles con costo y tope", () => {
    expect(ITEMS.length).toBe(3);
    for (const it of ITEMS) {
      expect(it.costo).toBeGreaterThan(0);
      expect(it.max).toBeGreaterThan(0);
    }
  });

  it("comprar items fuera de la tienda no hace nada (guard)", () => {
    const h = historiaNueva("Forastero");
    h.plata = 1000;
    const th = new TransporteHistoria(h);
    th.historiaComprarItem("soplon");
    expect(th.instantanea().historia!.plata).toBe(1000);
    th.detener();
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
