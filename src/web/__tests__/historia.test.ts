import { describe, it, expect } from "vitest";
import {
  CAMPANA,
  ITEMS,
  HISTORIA_VERSION,
  historiaNueva,
  normalizar,
  armarMesa,
  rivalesNoBoss,
  type EstadoHistoria,
} from "../historia";
import { MAPAS, validarMapa } from "../mapa";
import { TransporteHistoria } from "../transporteHistoria";
import { TransporteLocal } from "../transporte";

// Lógica del MODO HISTORIA v3: dilemas, items, migración de saves y la
// EXPLORACIÓN del barrio (mapa cenital). Pruebas deterministas (sin jugar las
// mesas, que dependen del azar).

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

  it("La Maestranza traslada la habilidad 'Puro fierro' (as no comodín) a la mesa", () => {
    const idx = CAMPANA.findIndex((e) => e.clave === "maestranza");
    expect(idx).toBeGreaterThan(0);
    const h = historiaNueva("Tester");
    h.escenarioIdx = idx;
    h.rivalIdx = CAMPANA[idx]!.rivales.length - 1;
    expect(armarMesa(h).reglas.asComodin).toBe(false);
  });
});

describe("normalizar (migración de saves)", () => {
  it("corre los índices de una partida vieja (v1) por La Maestranza y arma derrotados", () => {
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
    expect(n.escenarioIdx).toBe(3); // reubicado
    expect(n.version).toBe(HISTORIA_VERSION);
    expect(n.inventario).toEqual({ cargado: 0, marcado: 0, soplon: 0 });
    // los 2 primeros rivales del escenario (ya reubicado) quedan como derrotados
    expect(n.derrotados).toEqual(CAMPANA[3]!.rivales.slice(0, 2).map((r) => r.id));
    expect(Array.isArray(n.premiosReclamados)).toBe(true);
  });

  it("no toca escenarios tempranos ni re-migra un save ya actual", () => {
    const { version: _omit, ...sinVersion } = historiaNueva("A");
    expect(normalizar({ ...sinVersion, escenarioIdx: 1 }).escenarioIdx).toBe(1);
    expect(normalizar({ ...historiaNueva("B"), escenarioIdx: 4 }).escenarioIdx).toBe(4);
  });
});

describe("mapas del barrio", () => {
  it("los 6 mapas son válidos (dimensiones, entidades sobre piso, sin choques)", () => {
    expect(Object.keys(MAPAS).length).toBe(6);
    for (const [clave, m] of Object.entries(MAPAS)) {
      expect(validarMapa(m), clave).toEqual([]);
    }
  });

  it("cada barrio tiene a sus rivales, una tienda, un dilema y la puerta del jefe", () => {
    for (const e of CAMPANA) {
      const m = MAPAS[e.clave]!;
      const rivEnts = m.entidades.filter((x) => x.tipo === "rival");
      // todos los rivales del escenario están en el mapa
      expect(rivEnts.length).toBe(e.rivales.length);
      for (const re of rivEnts) {
        const r = e.rivales[re.rivalIdx!];
        expect(r).toBeTruthy();
        expect(re.id).toBe(r!.id);
      }
      expect(m.entidades.some((x) => x.tipo === "tienda")).toBe(true);
      expect(m.entidades.some((x) => x.tipo === "dilema")).toBe(true);
      expect(m.entidades.some((x) => x.tipo === "puerta")).toBe(true);
    }
  });

  // BFS de alcanzabilidad: con la puerta cerrada se llega a todo menos al jefe;
  // con la puerta abierta se llega también al jefe. Garantiza que la campaña es
  // completable (sin soft-locks).
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
        const seen = new Set<string>();
        const q: Array<[number, number]> = [[m.entrada.x, m.entrada.y]];
        seen.add(`${m.entrada.x},${m.entrada.y}`);
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

// --- Navegación por el mapa (helpers deterministas) ------------------------
function ex(th: TransporteHistoria) {
  return th.instantanea().historia!.explorar!;
}
function fase(th: TransporteHistoria) {
  return th.instantanea().historia!.faseHistoria;
}
/** Lista de direcciones desde el jugador hasta una casilla adyacente a (tx,ty). */
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
  it("empezar entra al mapa; la entrada es válida", () => {
    const th = new TransporteHistoria(historiaNueva("Forastero"));
    expect(fase(th)).toBe("intro");
    th.historiaEmpezar();
    expect(fase(th)).toBe("explorar");
    const e = ex(th);
    expect(e.titulo).toBe(MAPAS.pocilga!.titulo);
    expect(e.jugador).toMatchObject(MAPAS.pocilga!.entrada);
    th.detener();
  });

  it("caminar hacia un rival abre su ficha (reto) y de ahí a la mesa", () => {
    const h = historiaNueva("Forastero");
    h.inventario.soplon = 1;
    const th = new TransporteHistoria(h);
    th.historiaEmpezar();
    caminarHacia(th, "r-pulga");
    expect(fase(th)).toBe("reto");
    expect(th.instantanea().historia!.rival.id).toBe("r-pulga");
    th.historiaSentarse();
    expect(fase(th)).toBe("mesa");
    // el soplón enciende las pistas
    expect(th.instantanea().historia!.ojo).toBe(0);
    th.historiaUsarItem("soplon");
    expect(th.instantanea().historia!.ojo).toBeGreaterThanOrEqual(1);
    th.detener();
  });

  it("el dilema vive en el mapa: caminar hacia él, decidir y recibir el premio", () => {
    const th = new TransporteHistoria(historiaNueva("Detective"));
    th.historiaEmpezar();
    caminarHacia(th, "dilema");
    expect(fase(th)).toBe("dilema");
    const v = th.instantanea().historia!;
    expect(v.dilema!.opciones.length).toBe(2);
    th.historiaElegir(1); // soplón
    expect(th.instantanea().historia!.dilema!.resultado).toBeTruthy();
    th.historiaContinuar(); // de vuelta al barrio
    expect(fase(th)).toBe("explorar");
    expect(th.instantanea().historia!.itemsEnMano.some((it) => it.id === "soplon")).toBe(true);
    th.detener();
  });

  it("la puerta del jefe está cerrada hasta vencer a los parroquianos", () => {
    // cerrada
    const th1 = new TransporteHistoria(historiaNueva("X"));
    th1.historiaEmpezar();
    expect(ex(th1).entidades.find((e) => e.tipo === "puerta")!.estado).toBe("bloqueado");
    caminarHacia(th1, "puerta"); // chocar la puerta cerrada deja un aviso
    expect(ex(th1).mensaje).toBeTruthy();
    expect(fase(th1)).toBe("explorar");
    th1.detener();

    // abierta (rivales no-boss ya derrotados) → se llega al jefe
    const h2 = historiaNueva("Y");
    h2.derrotados = rivalesNoBoss(CAMPANA[0]!);
    const th2 = new TransporteHistoria(h2);
    th2.historiaEmpezar();
    expect(ex(th2).entidades.find((e) => e.tipo === "puerta")!.estado).toBe("abierto");
    caminarHacia(th2, "puerta"); // cruza la puerta abierta
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

  it("tocar un token vecino (historiaInteractuar) también funciona", () => {
    const th = new TransporteHistoria(historiaNueva("Tap"));
    th.historiaEmpezar();
    // camina junto a la tienda (sin chocarla) y tócala
    const e = ex(th);
    const tienda = e.entidades.find((x) => x.tipo === "tienda")!;
    const ruta = rutaAdyacente(e, tienda.x, tienda.y)!;
    for (const d of ruta) th.historiaMover(d);
    expect(fase(th)).toBe("explorar");
    th.historiaInteractuar("tienda");
    expect(fase(th)).toBe("tienda");
    th.detener();
  });
});

describe("tienda e items", () => {
  it("comprar items fuera de la tienda no hace nada (guard)", () => {
    const h = historiaNueva("Forastero");
    h.plata = 1000;
    const th = new TransporteHistoria(h);
    th.historiaComprarItem("soplon");
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
