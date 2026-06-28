// Transporte del MODO HISTORIA. Cumple la interfaz Transporte. Orquesta la
// campaña sobre el motor:
//   - cada combate se juega en una MESA del tamaño del encuentro (1v1, chica o
//     grande), con TransporteLocal: el rival marcado a su nivel y el relleno más
//     blando, con las reglas de la habilidad del boss;
//   - gana el combate quien queda último con cachos (campeón de la mesa);
//   - bosses "dado cargado" recargan su mano cada ronda (trampa);
//   - al llegar a un escenario puede salir un DILEMA (decisión de calle);
//   - entre escenarios abre la TIENDA para subir atributos y comprar items;
//   - en la mesa puede usar ITEMS (cargar tu mano, marcar al rival, soplón) y el
//     poder "Suerte" (re-tira tu mano).
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { guardarPrefs } from "./prefs";
import {
  rivalActual,
  escenarioActual,
  dilemaActual,
  avanzar,
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
  type ClaveAtributo,
  type MejoraVista,
  type ItemTiendaVista,
  type ItemManoVista,
  type OpcionDilema,
} from "./historia";

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
  /** Opción de dilema ya elegida (para mostrar el desenlace antes de seguir). */
  private dilemaElegido: OpcionDilema | null = null;

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
    this.dilemaElegido = null;
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
        this.h.plata += rivalActual(this.h).plata;
        this.guardar();
        this.fase = "victoria";
      } else {
        this.fase = "derrota";
      }
    }
    this.emitir();
  }

  /** Empieza el encuentro: si hay un dilema pendiente, primero la decisión. */
  historiaEmpezar() {
    if (this.fase !== "intro") return;
    this.h.prologoVisto = true;
    if (dilemaActual(this.h)) {
      this.dilemaElegido = null;
      this.fase = "dilema";
      this.guardar();
      this.emitir();
    } else {
      this.montarPartida();
    }
  }

  /** Resuelve el dilema actual eligiendo una opción. */
  historiaElegir(opcionIdx: number) {
    if (this.fase !== "dilema" || this.dilemaElegido) return;
    const dil = dilemaActual(this.h);
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
    this.h.dilemasResueltos.push(dil.clave);
    this.dilemaElegido = op;
    this.guardar();
    this.emitir();
  }

  historiaReintentar() {
    if (this.fase === "derrota") this.montarPartida();
  }
  historiaContinuar() {
    if (this.fase === "dilema") {
      // Tras ver el desenlace del dilema, a la mesa.
      this.montarPartida();
      return;
    }
    if (this.fase === "victoria") {
      const { tienda, final } = avanzar(this.h);
      this.guardar();
      this.fase = final ? "final" : tienda ? "tienda" : "intro";
      this.desmontar();
    } else if (this.fase === "tienda") {
      this.fase = "intro";
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
    if (!meta || this.h.inventario[meta.id] <= 0) return;
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
    this.h.inventario[meta.id] -= 1;
    this.guardar();
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
      prologo: enIntro && !this.h.prologoVisto && this.h.escenarioIdx === 0 && this.h.rivalIdx === 0 ? PROLOGO : null,
      intro: enIntro && this.h.rivalIdx === 0 ? esc.intro : null,
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

    const itemsEnMano: ItemManoVista[] = ITEMS.filter((it) => this.h.inventario[it.id] > 0).map((it) => ({
      id: it.id,
      nombre: it.nombre,
      corto: it.corto,
      desc: it.desc,
      cantidad: this.h.inventario[it.id],
    }));

    // En la fase de dilema mostramos el del escenario directamente: ya pudo
    // quedar marcado como resuelto al elegir, pero seguimos mostrando su desenlace.
    const dil = this.fase === "dilema" ? esc.dilema ?? null : null;
    const dilema = dil
      ? {
          titulo: dil.titulo,
          texto: dil.texto,
          opciones: dil.opciones.map((o) => ({ etiqueta: o.etiqueta })),
          resultado: this.dilemaElegido?.resultado ?? null,
        }
      : null;

    // El soplón enciende las pistas aunque no tengas el atributo.
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
      progresoRival: { idx: this.h.rivalIdx, total: esc.rivales.length },
      suerteDisponible: this.suerteUsos,
      ojo: ojoEf,
      colmillo: colmilloEf,
      mejoras,
      itemsTienda,
      itemsEnMano,
      dilema,
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
