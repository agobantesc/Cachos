// Transporte del MODO HISTORIA. Cumple la interfaz Transporte. Orquesta la
// campaña sobre el motor, con EXPLORACIÓN del barrio (vista cenital tipo RPG):
//   - al entrar a un capítulo, el jugador CAMINA el barrio: reta a los
//     parroquianos en el orden que quiera, pasa por la tienda, se topa con los
//     eventos de calle y, al vencer a todos, se abre la PUERTA del jefe;
//   - antes de cada mesa (fase "reto") elige su APUESTA y ve el DESAFÍO;
//   - cada combate se juega en una MESA del tamaño del encuentro, con
//     TransporteLocal y las reglas de la habilidad del rival;
//   - bosses "dado cargado" recargan su mano cada ronda (trampa);
//   - al caer el jefe: epílogo y siguiente barrio (o el final que toque).
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { guardarPrefs } from "./prefs";
import {
  rivalActual,
  escenarioActual,
  eventoDisponible,
  estadoEvento,
  rivalesNoBoss,
  bossDe,
  etiquetaEfecto,
  escenaDe,
  armarMesa,
  costoMejora,
  normalizar,
  itemMeta,
  tipoFinal,
  armarMesaSecreta,
  desafioDe,
  bonoDesafio,
  opcionesApuesta,
  ATRIBUTOS,
  ITEMS,
  CAMPANA,
  PROLOGO,
  HUMANO_ID,
  REY_VERDADERO,
  TWIST_VERDADERO,
  type EstadoHistoria,
  type FaseHistoria,
  type VistaHistoria,
  type EventoVista,
  type ExplorarVista,
  type EntidadVista,
  type Escenario,
  type Evento,
  type EfectoMesa,
  type PremioEvento,
  type RivalHistoria,
  type TipoFinal,
  type ClaveAtributo,
  type ItemId,
  type MejoraVista,
  type ItemTiendaVista,
  type ItemManoVista,
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
  /** Evento de calle en curso (dilema, pelea o lectura) y su desenlace. */
  private eventoEnCurso: Evento | null = null;
  private eventoResultado: string | null = null;
  private eventoEfecto: EfectoMesa | null = null;
  /** Lectura: índice de la carta elegida (para revelarla). */
  private cartaElegida: number | null = null;
  /** Combate contra el jefe final SECRETO (final verdadero) en curso. */
  private secretoActivo = false;
  /** Qué final mostrar (en fase "final"). */
  private finalTipo: TipoFinal | null = null;
  /** La apuesta de la mesa en curso (doblar o nada) y el botín de la victoria. */
  private apuestaMonto = 0;
  private suerteUsadaEnMesa = false;
  private botin: VistaHistoria["botin"] = null;
  private apuestaPerdida = 0;

  // --- Exploración (el barrio, vista cenital) ---
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

  /** El rival que se está enfrentando (el de la campaña, o el jefe secreto). */
  private rivalEnCurso(): RivalHistoria {
    return this.secretoActivo ? REY_VERDADERO : rivalActual(this.h);
  }

  // --- Flujo de la campaña ---------------------------------------------------
  private montarPartida() {
    this.desmontar();
    const rival = this.rivalEnCurso();
    const mesa = this.secretoActivo ? armarMesaSecreta(this.h.nombre) : armarMesa(this.h);
    this.dadoCargadoId = mesa.dadoCargadoId;
    this.suerteUsos = this.h.atributos.suerte;
    this.soplonActivo = false;
    this.suerteUsadaEnMesa = false;
    this.itemsGastados = { cargado: 0, marcado: 0, soplon: 0 };
    this.eventoEnCurso = null;
    this.botin = null;
    this.apuestaPerdida = 0;
    // La apuesta no puede superar la plata en mano (p.ej. tras una derrota cara).
    this.apuestaMonto = Math.min(this.apuestaMonto, this.h.plata);

    // Efecto pendiente (de una lectura o pelea): se consume en esta mesa.
    const ef = this.h.efectoPendiente ?? null;
    let cargarHumanoAlInicio = false;
    if (ef) {
      if (ef === "suerte_extra") this.suerteUsos += 1;
      else if (ef === "sin_suerte") this.suerteUsos = 0;
      else if (ef === "rival_cargado") this.dadoCargadoId = rival.id;
      else if (ef === "mano_cargada") cargarHumanoAlInicio = true;
      this.h.efectoPendiente = null;
      this.guardar();
    }

    this.inner = new TransporteLocal(mesa.jugadores, {
      humanoId: HUMANO_ID,
      nivelPorJugador: mesa.nivelPorJugador,
      reglas: mesa.reglas,
    });
    this.innerUnsub = this.inner.suscribir(() => this.onInner());
    this.aplicarTrampa(); // dado cargado del rival (boss tramposo o efecto rival_cargado)
    if (cargarHumanoAlInicio) this.inner.cargarMano(HUMANO_ID); // ventaja "mano cargada"
    this.fase = "mesa";
    this.emitir();
  }

  /** Boss "dado cargado": recarga su mano al inicio de cada ronda. */
  private aplicarTrampa() {
    if (this.dadoCargadoId && this.inner) this.inner.cargarMano(this.dadoCargadoId);
  }

  /** ¿Se cumplió el desafío de la casa? (se evalúa sobre la mesa ya ganada) */
  private evaluarDesafio(pub: NonNullable<Instantanea["publico"]>): boolean | null {
    if (this.secretoActivo) return null; // con el Patrón no hay desafíos: es a muerte
    const d = desafioDe(rivalActual(this.h));
    const yo = pub.jugadores.find((j) => j.id === HUMANO_ID);
    if (!yo) return null;
    switch (d.clave) {
      case "impecable":
        return yo.stats.dadosPerdidos === 0;
      case "calzador":
        return yo.stats.calzosAcertados >= 1;
      case "sobrado":
        return yo.cantidadDados >= 3;
      case "manolimpia":
        return (
          !this.suerteUsadaEnMesa &&
          this.itemsGastados.cargado + this.itemsGastados.marcado + this.itemsGastados.soplon === 0
        );
    }
  }

  private onInner() {
    if (this.detenido || !this.inner) return;
    const pub = this.inner.instantanea().publico;
    if (this.fase === "mesa" && pub && pub.fase === "FIN_JUEGO") {
      if (pub.ganadorId === HUMANO_ID) {
        const desafioCumplido = this.evaluarDesafio(pub);
        // Sólo al ganar se descuentan de verdad los items usados.
        for (const id of ["cargado", "marcado", "soplon"] as ItemId[]) {
          this.h.inventario[id] = Math.max(0, this.h.inventario[id] - this.itemsGastados[id]);
        }
        this.itemsGastados = { cargado: 0, marcado: 0, soplon: 0 };
        // El botín: premio base + la apuesta doblada + el bono del desafío.
        const rival = this.rivalEnCurso();
        const bono = desafioCumplido ? bonoDesafio(rival) : 0;
        const total = rival.plata + this.apuestaMonto + bono;
        this.botin = { premioBase: rival.plata, apuestaExtra: this.apuestaMonto, bono, desafioCumplido, total };
        this.h.plata += total;
        // El rival queda vencido en el barrio (la puerta del jefe se va abriendo).
        if (!this.secretoActivo && !this.h.derrotados.includes(rival.id)) this.h.derrotados.push(rival.id);
        this.guardar();
        this.fase = "victoria";
      } else {
        // Al perder, los items usados se recuperan (no se confirmó la baja)…
        // pero la apuesta se la queda la mesa. Perder ahora duele.
        this.apuestaPerdida = Math.min(this.apuestaMonto, this.h.plata);
        if (this.apuestaPerdida > 0) {
          this.h.plata -= this.apuestaPerdida;
          this.guardar();
        }
        this.fase = "derrota";
      }
    }
    this.emitir();
  }

  /** Fija la apuesta de la mesa (sólo en el reto, dentro de las opciones). */
  historiaApostar(monto: number) {
    if (this.fase !== "reto") return;
    const base = this.rivalEnCurso().plata;
    if (!opcionesApuesta(this.h.plata, base).includes(monto)) return;
    this.apuestaMonto = monto;
    this.emitir();
  }

  /** Entra al barrio actual: carga el mapa y deja al jugador en la entrada. */
  private entrarBarrio() {
    const esc = escenarioActual(this.h);
    // Si el jefe del barrio ya cayó (p.ej. la app se cerró en la pantalla de
    // victoria antes de continuar), el capítulo avanza solo: sin esto, el
    // jugador volvería a un barrio sin rivales — un callejón sin salida.
    if (this.h.derrotados.includes(bossDe(esc).id)) {
      this.desmontar();
      if (this.h.escenarioIdx < CAMPANA.length - 1) {
        this.h.escenarioIdx += 1;
        this.h.rivalIdx = 0;
        this.guardar();
        this.fase = "intro";
      } else {
        const tipo = tipoFinal(this.h);
        if (tipo === "verdadero") {
          this.secretoActivo = true;
          this.fase = "reto"; // la ficha del Patrón
        } else {
          this.h.completado = true;
          this.finalTipo = tipo;
          this.guardar();
          this.fase = "final";
        }
      }
      this.emitir();
      return;
    }
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

  /** Desde la intro del capítulo: a caminar el barrio. */
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

  // --- Exploración: caminar el barrio ---------------------------------------

  /** ¿La puerta del jefe está abierta? (todos los parroquianos vencidos) */
  private puertaAbierta(esc: Escenario): boolean {
    return rivalesNoBoss(esc).every((id) => this.h.derrotados.includes(id));
  }

  /** ¿Se cumple la condición de un botín del mapa? */
  private condCumplida(cond?: CondicionMapa): boolean {
    if (!cond) return true;
    if (cond.tipo === "plata") return this.h.plata >= cond.monto;
    return this.h.inventario[cond.item] > 0;
  }

  /** Un evento oculto (su marca no acompaña) no se dibuja ni estorba el paso. */
  private entidadVisible(e: EntidadMapa): boolean {
    if (e.tipo !== "evento") return true;
    return estadoEvento(this.h, e.eventoClave ?? "") !== "oculto";
  }

  historiaMover(dir: string) {
    if (this.fase !== "explorar" || !this.mapa) return;
    const paso = DIRS[dir as Direccion];
    if (!paso) return;
    const nx = this.jx + paso[0];
    const ny = this.jy + paso[1];
    if (esPared(this.mapa, nx, ny)) return; // muro: ni se mueve
    const ent = entidadEn(this.mapa, nx, ny);
    if (!ent || !this.entidadVisible(ent)) {
      this.jx = nx;
      this.jy = ny;
      this.mensaje = null;
      this.emitir();
      return;
    }
    if (ent.tipo === "puerta") {
      if (this.puertaAbierta(escenarioActual(this.h))) {
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

  /** Interactúa con una entidad por id (la UI también deja tocar un token vecino). */
  historiaInteractuar(id: string) {
    if (this.fase !== "explorar" || !this.mapa) return;
    const ent = this.mapa.entidades.find((e) => e.id === id);
    if (!ent || !this.entidadVisible(ent)) return;
    const dist = Math.abs(ent.x - this.jx) + Math.abs(ent.y - this.jy);
    if (dist > 1) return; // sólo lo que tienes al lado
    if (ent.tipo === "puerta") {
      if (this.puertaAbierta(escenarioActual(this.h))) {
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
        this.apuestaMonto = 0;
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
      case "evento": {
        const ev = eventoDisponible(this.h, ent.eventoClave ?? "");
        if (!ev) {
          this.mensaje = "Eso ya quedó atrás.";
          this.emitir();
          return;
        }
        this.eventoEnCurso = ev;
        this.eventoResultado = null;
        this.eventoEfecto = null;
        this.cartaElegida = null;
        this.mensaje = null;
        this.fase = "evento";
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
        this.mensaje = ent.premio?.item
          ? `Te llevas: ${itemMeta(ent.premio.item).nombre}.`
          : `¡Encontraste $${(ent.premio?.plata ?? 0).toLocaleString("es-CL")}!`;
        this.guardar();
        this.emitir();
        return;
      }
    }
  }

  /** Aplica el premio de una opción/carta (plata, item, atributo o efecto). */
  private aplicarPremio(p: PremioEvento) {
    if (p.plata) this.h.plata = Math.max(0, this.h.plata + p.plata);
    if (p.item) {
      const meta = itemMeta(p.item);
      this.h.inventario[p.item] = Math.min(meta.max, this.h.inventario[p.item] + 1);
    }
    if (p.atributo) {
      const meta = ATRIBUTOS.find((a) => a.clave === p.atributo)!;
      this.h.atributos[p.atributo] = Math.min(meta.max, this.h.atributos[p.atributo] + 1);
    }
    if (p.efecto) this.h.efectoPendiente = p.efecto;
    if (p.marca && !this.h.marcas.includes(p.marca)) this.h.marcas.push(p.marca);
  }

  /** Resuelve un evento de DECISIÓN (dilema/pelea) eligiendo una opción. */
  historiaElegir(opcionIdx: number) {
    if (this.fase !== "evento" || this.eventoResultado || !this.eventoEnCurso) return;
    const ev = this.eventoEnCurso;
    if (ev.tipo === "lectura") return;
    const op = ev.opciones[opcionIdx];
    if (!op) return;
    this.aplicarPremio(op);
    this.eventoResultado = op.resultado;
    this.eventoEfecto = op.efecto ?? null;
    if (!this.h.dilemasResueltos.includes(ev.clave)) this.h.dilemasResueltos.push(ev.clave);
    this.guardar();
    this.emitir();
  }

  /** Resuelve una LECTURA dando vuelta una carta. */
  historiaSacarCarta(cartaIdx: number) {
    if (this.fase !== "evento" || this.eventoResultado || !this.eventoEnCurso) return;
    const ev = this.eventoEnCurso;
    if (ev.tipo !== "lectura") return;
    const c = ev.cartas[cartaIdx];
    if (!c) return;
    this.aplicarPremio(c);
    this.cartaElegida = cartaIdx;
    this.eventoResultado = c.resultado;
    this.eventoEfecto = c.efecto ?? null;
    if (!this.h.dilemasResueltos.includes(ev.clave)) this.h.dilemasResueltos.push(ev.clave);
    this.guardar();
    this.emitir();
  }

  historiaReintentar() {
    if (this.fase === "derrota") this.montarPartida();
  }
  historiaContinuar() {
    if (this.fase === "evento" || this.fase === "tienda" || this.fase === "reto") {
      // De vuelta al barrio (del evento resuelto, la tienda o arrepentido del reto).
      if (this.fase === "reto" && this.secretoActivo) return; // del Patrón no se huye
      this.entrarBarrio();
      return;
    }
    if (this.fase === "derrota") {
      // Sales de la mesa con la cola entre las piernas: de vuelta al barrio.
      if (this.secretoActivo) return; // con el Patrón: revancha o nada
      this.entrarBarrio();
      return;
    }
    if (this.fase === "victoria") {
      // La mesa quedó atrás: la apuesta y el botín se limpian para la próxima.
      this.apuestaMonto = 0;
      this.botin = null;
      if (this.secretoActivo) {
        // Cayó el jefe SECRETO: final verdadero.
        this.h.completado = true;
        this.finalTipo = "verdadero";
        this.secretoActivo = false;
        this.desmontar();
        this.fase = "final";
        this.guardar();
      } else if (rivalActual(this.h).esBoss) {
        // Cayó el jefe del barrio: al siguiente capítulo (o el final que toque).
        if (this.h.escenarioIdx < CAMPANA.length - 1) {
          this.h.escenarioIdx += 1;
          this.h.rivalIdx = 0;
          this.desmontar();
          this.fase = "intro";
        } else {
          const tipo = tipoFinal(this.h);
          if (tipo === "verdadero") {
            // El giro: aún falta el verdadero Rey. La campaña no termina aquí.
            this.secretoActivo = true;
            this.desmontar();
            this.fase = "reto"; // la ficha del Patrón (rivalEnCurso = REY_VERDADERO)
          } else {
            this.h.completado = true;
            this.finalTipo = tipo;
            this.desmontar();
            this.fase = "final";
          }
        }
        this.guardar();
      } else {
        // Un parroquiano menos: de vuelta al barrio (queda vencido en el mapa).
        this.entrarBarrio();
        return;
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
    // Disponibles = en inventario menos los ya gastados en este encuentro.
    if (this.h.inventario[meta.id] - this.itemsGastados[meta.id] <= 0) return;
    let usado = false;
    if (meta.id === "cargado") {
      usado = !!this.inner?.cargarMano(HUMANO_ID);
    } else if (meta.id === "marcado") {
      usado = !!this.inner?.descargarMano(this.rivalEnCurso().id);
    } else if (meta.id === "soplon") {
      this.soplonActivo = true;
      usado = true;
    }
    if (!usado) return;
    // Se "gasta" de forma transitoria; sólo se confirma al ganar (ver onInner).
    this.itemsGastados[meta.id] += 1;
    this.emitir();
  }
  historiaSuerte() {
    if (this.fase !== "mesa" || this.suerteUsos <= 0 || !this.inner) return;
    if (this.inner.rerollarMano(HUMANO_ID)) {
      this.suerteUsos -= 1;
      this.suerteUsadaEnMesa = true; // rompe el desafío "A mano limpia"
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
    const rival = this.rivalEnCurso();
    const dialogo =
      this.fase === "victoria"
        ? rival.dialogos.derrota
        : this.fase === "derrota"
          ? rival.dialogos.victoria
          : rival.dialogos.entrada;

    // Al caer el Rey "público", si el camino desbloqueó el final verdadero,
    // se revela el giro: todavía falta el verdadero Rey del Cacho.
    const ultimoBoss = rival.esBoss && this.h.escenarioIdx >= CAMPANA.length - 1;
    const haySecreto = this.fase === "victoria" && !this.secretoActivo && ultimoBoss && tipoFinal(this.h) === "verdadero";

    const enIntro = this.fase === "intro";
    const narrativa = {
      prologo: enIntro && !this.h.prologoVisto && this.h.escenarioIdx === 0 ? PROLOGO : null,
      intro: enIntro ? esc.intro : null,
      presentacion: this.fase === "reto" ? rival.presentacion ?? null : null,
      relato: this.fase === "victoria" && !rival.esBoss ? rival.relato ?? null : null,
      epilogo: haySecreto ? TWIST_VERDADERO : this.fase === "victoria" && rival.esBoss ? esc.epilogo : null,
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

    // En la fase de evento mostramos el que está en curso (puede ya estar
    // resuelto: seguimos mostrando su desenlace antes de pasar a la mesa).
    const ev = this.fase === "evento" ? this.eventoEnCurso : null;
    const evento: EventoVista | null = ev
      ? {
          tipo: ev.tipo,
          titulo: ev.titulo,
          texto: ev.texto,
          imagen: escenaDe(ev.clave),
          opciones: ev.tipo === "lectura" ? [] : ev.opciones.map((o) => ({ etiqueta: o.etiqueta })),
          cartas:
            ev.tipo === "lectura"
              ? ev.cartas.map((c, i) => ({
                  volteada: this.cartaElegida !== null,
                  nombre: this.cartaElegida !== null ? c.nombre : null,
                  elegida: i === this.cartaElegida,
                }))
              : [],
          resultado: this.eventoResultado,
          efecto: this.eventoEfecto ? etiquetaEfecto(this.eventoEfecto) : null,
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
      progresoRival: {
        idx: esc.rivales.filter((r) => this.h.derrotados.includes(r.id)).length,
        total: esc.rivales.length,
      },
      suerteDisponible: this.suerteUsos,
      ojo: ojoEf,
      colmillo: colmilloEf,
      mejoras,
      itemsTienda,
      itemsEnMano,
      evento,
      marcas: [...this.h.marcas],
      finalTipo: this.fase === "final" ? this.finalTipo : null,
      haySecreto,
      apuesta:
        this.fase === "reto"
          ? { elegida: this.apuestaMonto, opciones: opcionesApuesta(this.h.plata, rival.plata), premioBase: rival.plata }
          : null,
      desafio:
        !this.secretoActivo && (this.fase === "reto" || this.fase === "mesa" || this.fase === "victoria")
          ? (() => {
              const d = desafioDe(rival);
              return { nombre: d.nombre, desc: d.desc, bono: bonoDesafio(rival) };
            })()
          : null,
      botin: this.fase === "victoria" ? this.botin : null,
      apuestaPerdida: this.fase === "derrota" ? this.apuestaPerdida : 0,
      explorar: this.vistaExplorar(),
      esSecreto: this.secretoActivo,
    };
  }

  // --- Vista del barrio (exploración) ---------------------------------------
  private vistaExplorar(): ExplorarVista | null {
    if (this.fase !== "explorar" || !this.mapa) return null;
    const m = this.mapa;
    const esc = escenarioActual(this.h);
    const porVencer = rivalesNoBoss(esc).filter((id) => !this.h.derrotados.includes(id)).length;
    const pista = this.puertaAbierta(esc)
      ? `La puerta de ${bossDe(esc).nombre} está abierta. Cuando quieras, sube.`
      : `Vence a ${porVencer === 1 ? "1 rival más" : `${porVencer} rivales más`} y se abrirá la mesa de ${bossDe(esc).nombre}.`;
    return {
      titulo: m.titulo,
      pista,
      ancho: m.ancho,
      alto: m.alto,
      filas: m.filas,
      jugador: { x: this.jx, y: this.jy, nombre: this.h.nombre },
      entidades: m.entidades.filter((e) => this.entidadVisible(e)).map((e) => this.entidadVista(e, esc)),
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
      return { ...base, tipo: "puerta", estado: this.puertaAbierta(esc) ? "abierto" : "bloqueado" };
    }
    if (e.tipo === "premio") {
      const reclamado = this.h.premiosReclamados.includes(e.id);
      return { ...base, tipo: "premio", estado: reclamado ? "resuelto" : this.condCumplida(e.cond) ? "activo" : "bloqueado" };
    }
    if (e.tipo === "evento") {
      const est = estadoEvento(this.h, e.eventoClave ?? "");
      return { ...base, tipo: "evento", estado: est === "resuelto" ? "resuelto" : "activo" };
    }
    if (e.tipo === "tienda") {
      return { ...base, tipo: "tienda", estado: "activo", etiqueta: "Tienda" };
    }
    return { ...base, tipo: "letrero", estado: "activo" };
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
