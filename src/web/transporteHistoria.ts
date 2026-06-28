// Transporte del MODO HISTORIA. Cumple la interfaz Transporte. Orquesta la
// campaña sobre el motor, ahora con EXPLORACIÓN tipo "Game Boy":
//   - al entrar a un escenario, el jugador camina por el BARRIO (vista cenital):
//     enfrenta a los parroquianos en el orden que quiera, pasa por la tienda,
//     toma decisiones (dilemas) y, cuando cumple la condición, se le abre la
//     PUERTA al jefe;
//   - cada combate se juega en una MESA del tamaño del encuentro, con
//     TransporteLocal y las reglas de la habilidad del boss;
//   - bosses "dado cargado" recargan su mano cada ronda (trampa);
//   - al caer el jefe, epílogo y siguiente barrio;
//   - en la mesa puede usar ITEMS y el poder "Suerte".
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { guardarPrefs } from "./prefs";
import {
  rivalActual,
  escenarioActual,
  rivalesNoBoss,
  armarMesa,
  costoMejora,
  normalizar,
  itemMeta,
  ATRIBUTOS,
  ITEMS,
  CAMPANA,
  PROLOGO,
  HUMANO_ID,
  type EstadoHistoria,
  type FaseHistoria,
  type VistaHistoria,
  type ExplorarVista,
  type EntidadVista,
  type Escenario,
  type ClaveAtributo,
  type ItemId,
  type MejoraVista,
  type ItemTiendaVista,
  type ItemManoVista,
  type OpcionDilema,
} from "./historia";
import { mapaDeEscenario, esPared, entidadEn, type MapaEscenario, type EntidadMapa, type CondicionMapa } from "./mapa";

type Direccion = "arriba" | "abajo" | "izquierda" | "derecha";
const DIRS: Record<Direccion, [number, number]> = {
  arriba: [0, -1],
  abajo: [0, 1],
  izquierda: [-1, 0],
  derecha: [1, 0],
};

export class TransporteHistoria implements Transporte {
  private h: EstadoHistoria;
  private fase: FaseHistoria = "intro";
  private inner: TransporteLocal | null = null;
  private innerUnsub: (() => void) | null = null;
  private subs = new Set<() => void>();
  private detenido = false;
  private suerteUsos = 0;
  private dadoCargadoId: string | null = null;
  /** "El dato del soplón": pistas activas por esta partida. */
  private soplonActivo = false;
  /** Items gastados en el encuentro EN CURSO. No se descuentan del inventario
   *  hasta GANAR: si pierdes y reintentas (o recargas a mitad), los recuperas. */
  private itemsGastados: Record<ItemId, number> = { cargado: 0, marcado: 0, soplon: 0 };
  /** Opción de dilema ya elegida (para mostrar el desenlace antes de seguir). */
  private dilemaElegido: OpcionDilema | null = null;

  // --- Exploración (mapa del barrio) ---
  private mapa: MapaEscenario | null = null;
  private jx = 0;
  private jy = 0;
  private mensaje: string | null = null;

  constructor(estado: EstadoHistoria) {
    this.h = normalizar(estado);
    this.guardar();
  }

  private guardar() {
    guardarPrefs({ historia: this.h });
  }
  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  private emitir() {
    for (const f of this.subs) f();
  }
  detener() {
    this.detenido = true;
    this.desmontar();
    this.subs.clear();
  }
  private desmontar() {
    this.innerUnsub?.();
    this.innerUnsub = null;
    this.inner?.detener();
    this.inner = null;
  }

  // --- Flujo de la campaña ---------------------------------------------------
  private montarPartida() {
    this.desmontar();
    const mesa = armarMesa(this.h);
    this.dadoCargadoId = mesa.dadoCargadoId;
    this.suerteUsos = this.h.atributos.suerte;
    this.soplonActivo = false;
    this.itemsGastados = { cargado: 0, marcado: 0, soplon: 0 };
    this.inner = new TransporteLocal(mesa.jugadores, {
      humanoId: HUMANO_ID,
      nivelPorJugador: mesa.nivelPorJugador,
      reglas: mesa.reglas,
    });
    this.innerUnsub = this.inner.suscribir(() => this.onInner());
    this.aplicarTrampa();
    this.fase = "mesa";
    this.emitir();
  }

  /** Boss "dado cargado": recarga su mano al inicio de cada ronda. */
  private aplicarTrampa() {
    if (this.dadoCargadoId && this.inner) this.inner.cargarMano(this.dadoCargadoId);
  }

  private onInner() {
    if (this.detenido || !this.inner) return;
    const pub = this.inner.instantanea().publico;
    if (this.fase === "mesa" && pub && pub.fase === "FIN_JUEGO") {
      if (pub.ganadorId === HUMANO_ID) {
        // Sólo al ganar se descuentan de verdad los items usados.
        for (const id of ["cargado", "marcado", "soplon"] as ItemId[]) {
          this.h.inventario[id] = Math.max(0, this.h.inventario[id] - this.itemsGastados[id]);
        }
        this.itemsGastados = { cargado: 0, marcado: 0, soplon: 0 };
        const rival = rivalActual(this.h);
        if (!this.h.derrotados.includes(rival.id)) this.h.derrotados.push(rival.id);
        this.h.plata += rival.plata;
        this.guardar();
        this.fase = "victoria";
      } else {
        // Al perder, los items usados se recuperan (no se confirmó la baja).
        this.fase = "derrota";
      }
    }
    this.emitir();
  }

  /** Entra al barrio actual: carga el mapa y deja al jugador en la entrada. */
  private entrarBarrio() {
    const esc = escenarioActual(this.h);
    this.mapa = mapaDeEscenario(esc.clave);
    if (this.mapa) {
      this.jx = this.mapa.entrada.x;
      this.jy = this.mapa.entrada.y;
    }
    this.mensaje = null;
    this.desmontar();
    this.fase = "explorar";
    this.emitir();
  }

  /** Desde la intro del escenario: entra a caminar el barrio. */
  historiaEmpezar() {
    if (this.fase !== "intro") return;
    this.h.prologoVisto = true;
    this.guardar();
    this.entrarBarrio();
  }

  /** Desde la ficha del rival ("reto"): se sienta a la mesa. */
  historiaSentarse() {
    if (this.fase === "reto") this.montarPartida();
  }

  // --- Exploración -----------------------------------------------------------
  historiaMover(dir: string) {
    if (this.fase !== "explorar" || !this.mapa) return;
    const paso = DIRS[dir as Direccion];
    if (!paso) return;
    const nx = this.jx + paso[0];
    const ny = this.jy + paso[1];
    if (esPared(this.mapa, nx, ny)) return; // muro: ni se mueve
    const ent = entidadEn(this.mapa, nx, ny);
    if (!ent) {
      this.jx = nx;
      this.jy = ny;
      this.mensaje = null;
      this.emitir();
      return;
    }
    if (ent.tipo === "puerta") {
      if (this.condCumplida(ent.cond)) {
        // Puerta abierta: se cruza hacia el jefe.
        this.jx = nx;
        this.jy = ny;
        this.mensaje = null;
        this.emitir();
      } else {
        this.mensaje = ent.texto ?? "Está cerrado.";
        this.emitir();
      }
      return;
    }
    this.interactuar(ent);
  }

  /** Interactúa con una entidad por id (lo usa la UI al tocar un token vecino). */
  historiaInteractuar(id: string) {
    if (this.fase !== "explorar" || !this.mapa) return;
    const ent = this.mapa.entidades.find((e) => e.id === id);
    if (!ent) return;
    // Sólo si es adyacente (o donde está parado el jugador).
    const dist = Math.abs(ent.x - this.jx) + Math.abs(ent.y - this.jy);
    if (dist > 1) return;
    if (ent.tipo === "puerta") {
      if (this.condCumplida(ent.cond)) {
        this.jx = ent.x;
        this.jy = ent.y;
        this.mensaje = null;
        this.emitir();
      } else {
        this.mensaje = ent.texto ?? "Está cerrado.";
        this.emitir();
      }
      return;
    }
    this.interactuar(ent);
  }

  private interactuar(ent: EntidadMapa) {
    const esc = escenarioActual(this.h);
    switch (ent.tipo) {
      case "rival": {
        const r = esc.rivales[ent.rivalIdx ?? -1];
        if (!r) return;
        if (this.h.derrotados.includes(r.id)) {
          this.mensaje = `Ya le ganaste a ${r.nombre}.`;
          this.emitir();
          return;
        }
        this.h.rivalIdx = ent.rivalIdx ?? 0;
        this.mensaje = null;
        this.fase = "reto";
        this.emitir();
        return;
      }
      case "tienda":
        this.mensaje = null;
        this.fase = "tienda";
        this.emitir();
        return;
      case "dilema": {
        const clave = esc.dilema?.clave ?? "";
        if (!esc.dilema || this.h.dilemasResueltos.includes(clave)) {
          this.mensaje = "Ya tomaste esa decisión.";
          this.emitir();
          return;
        }
        this.dilemaElegido = null;
        this.mensaje = null;
        this.fase = "dilema";
        this.emitir();
        return;
      }
      case "letrero":
        this.mensaje = ent.texto ?? null;
        this.emitir();
        return;
      case "premio": {
        if (this.h.premiosReclamados.includes(ent.id)) {
          this.mensaje = "Aquí ya no queda nada.";
          this.emitir();
          return;
        }
        if (!this.condCumplida(ent.cond)) {
          this.mensaje = ent.texto ?? "Está cerrado.";
          this.emitir();
          return;
        }
        if (ent.premio?.plata) this.h.plata += ent.premio.plata;
        if (ent.premio?.item) {
          const meta = itemMeta(ent.premio.item);
          this.h.inventario[ent.premio.item] = Math.min(meta.max, this.h.inventario[ent.premio.item] + 1);
        }
        this.h.premiosReclamados.push(ent.id);
        this.mensaje = ent.premio?.item ? `Te llevas: ${itemMeta(ent.premio.item).nombre}.` : "¡Encontraste plata!";
        this.guardar();
        this.emitir();
        return;
      }
    }
  }

  private condCumplida(cond?: CondicionMapa): boolean {
    if (!cond) return true;
    if (cond.tipo === "rivales") {
      const esc = escenarioActual(this.h);
      return rivalesNoBoss(esc).every((id) => this.h.derrotados.includes(id));
    }
    if (cond.tipo === "plata") return this.h.plata >= cond.monto;
    if (cond.tipo === "item") return this.h.inventario[cond.item] > 0;
    return true;
  }

  // --- Decisiones, tienda y avance -------------------------------------------
  historiaElegir(opcionIdx: number) {
    if (this.fase !== "dilema" || this.dilemaElegido) return;
    const dil = escenarioActual(this.h).dilema;
    const op = dil?.opciones[opcionIdx];
    if (!dil || !op) return;
    if (op.plata) this.h.plata = Math.max(0, this.h.plata + op.plata);
    if (op.item) {
      const meta = itemMeta(op.item);
      this.h.inventario[op.item] = Math.min(meta.max, this.h.inventario[op.item] + 1);
    }
    if (op.atributo) {
      const meta = ATRIBUTOS.find((a) => a.clave === op.atributo)!;
      this.h.atributos[op.atributo] = Math.min(meta.max, this.h.atributos[op.atributo] + 1);
    }
    if (!this.h.dilemasResueltos.includes(dil.clave)) this.h.dilemasResueltos.push(dil.clave);
    this.dilemaElegido = op;
    this.guardar();
    this.emitir();
  }

  historiaReintentar() {
    if (this.fase === "derrota") this.montarPartida();
  }

  historiaContinuar() {
    if (this.fase === "dilema" || this.fase === "tienda" || this.fase === "reto") {
      // De vuelta al barrio.
      this.fase = "explorar";
    } else if (this.fase === "derrota") {
      this.desmontar();
      this.fase = "explorar";
    } else if (this.fase === "victoria") {
      const rival = rivalActual(this.h);
      this.desmontar();
      if (rival.esBoss) {
        if (this.h.escenarioIdx < CAMPANA.length - 1) {
          this.h.escenarioIdx += 1;
          this.h.rivalIdx = 0;
          this.fase = "intro";
        } else {
          this.h.completado = true;
          this.fase = "final";
        }
        this.guardar();
      } else {
        // Vuelve al barrio (el rival queda marcado como derrotado en el mapa).
        this.fase = "explorar";
      }
    }
    this.emitir();
  }

  historiaMejorar(clave: string) {
    if (this.fase !== "tienda") return;
    const c = clave as ClaveAtributo;
    const meta = ATRIBUTOS.find((a) => a.clave === c);
    if (!meta) return;
    const nivel = this.h.atributos[c];
    if (nivel >= meta.max) return;
    const costo = costoMejora(c, nivel);
    if (this.h.plata < costo) return;
    this.h.plata -= costo;
    this.h.atributos[c] = nivel + 1;
    this.guardar();
    this.emitir();
  }
  historiaComprarItem(id: string) {
    if (this.fase !== "tienda") return;
    const meta = ITEMS.find((x) => x.id === id);
    if (!meta) return;
    const cantidad = this.h.inventario[meta.id];
    if (cantidad >= meta.max || this.h.plata < meta.costo) return;
    this.h.plata -= meta.costo;
    this.h.inventario[meta.id] = cantidad + 1;
    this.guardar();
    this.emitir();
  }
  historiaUsarItem(id: string) {
    if (this.fase !== "mesa") return;
    const meta = ITEMS.find((x) => x.id === id);
    if (!meta) return;
    if (this.h.inventario[meta.id] - this.itemsGastados[meta.id] <= 0) return;
    let usado = false;
    if (meta.id === "cargado") {
      usado = !!this.inner?.cargarMano(HUMANO_ID);
    } else if (meta.id === "marcado") {
      usado = !!this.inner?.descargarMano(rivalActual(this.h).id);
    } else if (meta.id === "soplon") {
      this.soplonActivo = true;
      usado = true;
    }
    if (!usado) return;
    this.itemsGastados[meta.id] += 1;
    this.emitir();
  }
  historiaSuerte() {
    if (this.fase !== "mesa" || this.suerteUsos <= 0 || !this.inner) return;
    if (this.inner.rerollarMano(HUMANO_ID)) {
      this.suerteUsos -= 1;
      this.emitir();
    }
  }

  // --- Acciones de la mesa: se delegan al combate en curso -------------------
  async iniciar() {
    /* el combate arranca solo */
  }
  async apostar(apuesta: Parameters<Transporte["apostar"]>[0]) {
    await this.inner?.apostar(apuesta);
  }
  async dudar() {
    await this.inner?.dudar();
  }
  async calzar() {
    await this.inner?.calzar();
  }
  async pasar() {
    await this.inner?.pasar();
  }
  async dudarPaso() {
    await this.inner?.dudarPaso();
  }
  async siguienteRonda(sentido?: Parameters<Transporte["siguienteRonda"]>[0]) {
    await this.inner?.siguienteRonda(sentido);
    this.aplicarTrampa(); // recarga la mano del boss tramposo en la nueva ronda
  }
  async terminarSolo() {
    await this.inner?.terminarSolo();
  }

  // --- Vista -----------------------------------------------------------------
  private vistaExplorar(): ExplorarVista | null {
    if (this.fase !== "explorar" || !this.mapa) return null;
    const m = this.mapa;
    const esc = escenarioActual(this.h);
    return {
      titulo: m.titulo,
      pista: m.pista,
      ancho: m.ancho,
      alto: m.alto,
      filas: m.filas,
      jugador: { x: this.jx, y: this.jy, nombre: this.h.nombre },
      entidades: m.entidades.map((e) => this.entidadVista(e, esc)),
      mensaje: this.mensaje,
    };
  }

  private entidadVista(e: EntidadMapa, esc: Escenario): EntidadVista {
    const base = { id: e.id, x: e.x, y: e.y };
    if (e.tipo === "rival") {
      const r = esc.rivales[e.rivalIdx ?? -1];
      const derrotado = r ? this.h.derrotados.includes(r.id) : false;
      return {
        ...base,
        tipo: "rival",
        ...(r ? { rivalId: r.id, rivalNombre: r.nombre, esBoss: r.esBoss, etiqueta: r.nombre } : {}),
        estado: derrotado ? "derrotado" : "activo",
      };
    }
    if (e.tipo === "puerta") {
      return { ...base, tipo: "puerta", estado: this.condCumplida(e.cond) ? "abierto" : "bloqueado" };
    }
    if (e.tipo === "premio") {
      const reclamado = this.h.premiosReclamados.includes(e.id);
      return { ...base, tipo: "premio", estado: reclamado ? "reclamado" : this.condCumplida(e.cond) ? "activo" : "bloqueado" };
    }
    if (e.tipo === "dilema") {
      const resuelto = this.h.dilemasResueltos.includes(esc.dilema?.clave ?? "");
      return { ...base, tipo: "dilema", estado: resuelto ? "reclamado" : "activo", etiqueta: "?" };
    }
    if (e.tipo === "tienda") {
      return { ...base, tipo: "tienda", estado: "activo", etiqueta: "Tienda" };
    }
    return { ...base, tipo: "letrero", estado: "activo" };
  }

  private vista(): VistaHistoria {
    const esc = escenarioActual(this.h);
    const rival = rivalActual(this.h);
    const dialogo =
      this.fase === "victoria"
        ? rival.dialogos.derrota
        : this.fase === "derrota"
          ? rival.dialogos.victoria
          : rival.dialogos.entrada;

    const enIntro = this.fase === "intro";
    const narrativa = {
      prologo: enIntro && !this.h.prologoVisto && this.h.escenarioIdx === 0 ? PROLOGO : null,
      intro: enIntro ? esc.intro : null,
      epilogo: this.fase === "victoria" && rival.esBoss ? esc.epilogo : null,
    };

    const mejoras: MejoraVista[] =
      this.fase === "tienda"
        ? ATRIBUTOS.map((a) => {
            const nivel = this.h.atributos[a.clave];
            const costo = costoMejora(a.clave, nivel);
            return { clave: a.clave, nombre: a.nombre, desc: a.desc, nivel, max: a.max, costo, alcanzable: nivel < a.max && this.h.plata >= costo };
          })
        : [];

    const itemsTienda: ItemTiendaVista[] =
      this.fase === "tienda"
        ? ITEMS.map((it) => {
            const cantidad = this.h.inventario[it.id];
            return { id: it.id, nombre: it.nombre, desc: it.desc, costo: it.costo, cantidad, max: it.max, alcanzable: cantidad < it.max && this.h.plata >= it.costo };
          })
        : [];

    const itemsEnMano: ItemManoVista[] = ITEMS.map((it) => ({
      id: it.id,
      nombre: it.nombre,
      corto: it.corto,
      desc: it.desc,
      cantidad: this.h.inventario[it.id] - this.itemsGastados[it.id],
    })).filter((it) => it.cantidad > 0);

    const dil = this.fase === "dilema" ? esc.dilema ?? null : null;
    const dilema = dil
      ? {
          titulo: dil.titulo,
          texto: dil.texto,
          opciones: dil.opciones.map((o) => ({ etiqueta: o.etiqueta })),
          resultado: this.dilemaElegido?.resultado ?? null,
        }
      : null;

    const ojoEf = this.soplonActivo ? Math.max(1, this.h.atributos.ojo) : this.h.atributos.ojo;
    const colmilloEf = this.soplonActivo ? Math.max(1, this.h.atributos.colmillo) : this.h.atributos.colmillo;

    return {
      faseHistoria: this.fase,
      nombreJugador: this.h.nombre,
      plata: this.h.plata,
      atributos: { ...this.h.atributos },
      escenario: { nombre: esc.nombre, lugar: esc.lugar, ambiente: esc.ambiente, idx: this.h.escenarioIdx, total: CAMPANA.length },
      narrativa,
      rival: {
        id: rival.id,
        nombre: rival.nombre,
        nivel: rival.nivel,
        esBoss: rival.esBoss,
        habilidad: rival.habilidad ? { nombre: rival.habilidad.nombre, desc: rival.habilidad.desc } : null,
        plata: rival.plata,
        dialogo,
      },
      mesa: rival.mesa,
      acompanantes: armarMesa(this.h).acompanantes,
      progresoRival: { idx: this.h.derrotados.filter((id) => esc.rivales.some((r) => r.id === id)).length, total: esc.rivales.length },
      suerteDisponible: this.suerteUsos,
      ojo: ojoEf,
      colmillo: colmilloEf,
      mejoras,
      itemsTienda,
      itemsEnMano,
      dilema,
      explorar: this.vistaExplorar(),
    };
  }

  instantanea(): Instantanea {
    const base: Instantanea = this.inner
      ? this.inner.instantanea()
      : {
          faseApp: "juego",
          codigo: null,
          anfitrionId: null,
          jugadoresLobby: [],
          publico: null,
          miMano: null,
          miId: HUMANO_ID,
          esLocal: true,
          esSolo: true,
        };
    return { ...base, esLocal: true, esSolo: true, historia: this.vista() };
  }
}
