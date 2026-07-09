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
  eventoActual,
  acertijoPendiente,
  etiquetaEfecto,
  escenaDe,
  avanzar,
  armarMesa,
  costoMejora,
  normalizar,
  itemMeta,
  tipoFinal,
  armarMesaSecreta,
  desafioDe,
  umbralRelampago,
  bonoDesafio,
  opcionesApuesta,
  ATRIBUTOS,
  ITEMS,
  CAMPANA,
  PROLOGO,
  HUMANO_ID,
  REY_VERDADERO,
  TWIST_VERDADERO,
  FINALES,
  type EstadoHistoria,
  type FaseHistoria,
  type VistaHistoria,
  type EventoVista,
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

export class TransporteHistoria implements Transporte {
  private h: EstadoHistoria;
  private fase: FaseHistoria = "intro";
  private inner: TransporteLocal | null = null;
  private innerUnsub: (() => void) | null = null;
  private subs = new Set<() => void>();
  private detenido = false;
  private suerteUsos = 0;
  private dadoCargadoId: string | null = null;
  private dadoCargadoIntentos = 8;
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
  /** Qué final mostrar (en fase "final"), y en qué pasaje del epílogo va. */
  private finalTipo: TipoFinal | null = null;
  private finalBeatIdx = 0;
  /** El candado del barrio: último fallo y desenlace al abrirlo. */
  private acertijoFallo: string | null = null;
  private acertijoDesenlace: string | null = null;
  /** La apuesta de la mesa en curso (doblar o nada) y el botín de la victoria. */
  private apuestaMonto = 0;
  private suerteUsadaEnMesa = false;
  private botin: VistaHistoria["botin"] = null;
  private apuestaPerdida = 0;

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

  /** El pasaje del epílogo que toca mostrar (fase "final"). */
  private finalBeatVista(): VistaHistoria["finalBeat"] {
    if (this.fase !== "final" || !this.finalTipo) return null;
    const beats = FINALES[this.finalTipo].beats;
    const idx = Math.min(this.finalBeatIdx, beats.length - 1);
    const beat = beats[idx]!;
    return { idx, total: beats.length, escena: beat.escena, texto: beat.texto, esUltimo: idx === beats.length - 1 };
  }

  // --- Flujo de la campaña ---------------------------------------------------
  private montarPartida() {
    this.desmontar();
    const rival = this.rivalEnCurso();
    const mesa = this.secretoActivo ? armarMesaSecreta(this.h.nombre) : armarMesa(this.h);
    this.dadoCargadoId = mesa.dadoCargadoId;
    this.dadoCargadoIntentos = mesa.dadoCargadoIntentos;
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
    if (this.dadoCargadoId && this.inner) this.inner.cargarMano(this.dadoCargadoId, this.dadoCargadoIntentos);
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
      case "relampago":
        return pub.numeroRonda <= umbralRelampago(pub.jugadores.length);
      case "resucitado":
        return yo.yaJugoObligado;
      case "alfilo":
        return yo.cantidadDados === 1;
      case "doblete":
        return yo.stats.calzosAcertados >= 2;
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

  /** Abre el candado del barrio (el secreto), desde la intro. */
  historiaAbrirAcertijo() {
    if (this.fase !== "intro" || !acertijoPendiente(this.h)) return;
    this.acertijoFallo = null;
    this.acertijoDesenlace = null;
    this.fase = "acertijo";
    this.emitir();
  }

  /** Prueba una cifra de tres dados contra el candado del barrio. */
  historiaProbarCifra(cifra: number[]) {
    if (this.fase !== "acertijo" || this.acertijoDesenlace) return;
    const a = acertijoPendiente(this.h);
    if (!a || cifra.length !== 3) return;
    if (a.solucion.every((v, i) => cifra[i] === v)) {
      this.aplicarPremio(a.premio);
      if (!this.h.dilemasResueltos.includes(a.clave)) this.h.dilemasResueltos.push(a.clave);
      this.acertijoDesenlace = a.desenlace;
      this.acertijoFallo = null;
      this.guardar();
    } else {
      this.acertijoFallo = a.fallo; // sin castigo: el candado espera
    }
    this.emitir();
  }

  /** Fija la apuesta de la mesa (sólo en la intro, dentro de las opciones). */
  historiaApostar(monto: number) {
    if (this.fase !== "intro") return;
    const base = this.rivalEnCurso().plata;
    if (!opcionesApuesta(this.h.plata, base).includes(monto)) return;
    this.apuestaMonto = monto;
    this.emitir();
  }

  /** Empieza el encuentro: si hay un evento de calle pendiente, va primero. */
  historiaEmpezar() {
    if (this.fase !== "intro") return;
    this.h.prologoVisto = true;
    const ev = eventoActual(this.h);
    if (ev) {
      this.eventoEnCurso = ev;
      this.eventoResultado = null;
      this.eventoEfecto = null;
      this.cartaElegida = null;
      this.fase = "evento";
      this.guardar();
      this.emitir();
    } else {
      this.montarPartida();
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
    if (this.fase === "final") {
      // Se recorre el epílogo pasaje a pasaje, hasta el cierre.
      const total = FINALES[this.finalTipo ?? "estandar"].beats.length;
      if (this.finalBeatIdx < total - 1) this.finalBeatIdx += 1;
      this.emitir();
      return;
    }
    if (this.fase === "acertijo") {
      // Abierto o no, de vuelta a la intro del rival (se puede volver a intentar).
      this.fase = "intro";
      this.emitir();
      return;
    }
    if (this.fase === "evento") {
      // Tras ver el desenlace del evento, a la mesa.
      this.montarPartida();
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
        this.finalBeatIdx = 0;
        this.secretoActivo = false;
        this.desmontar();
        this.fase = "final";
        this.guardar();
      } else {
        const { tienda, final } = avanzar(this.h);
        if (final) {
          // Cayó el Rey "público": se decide el final.
          const tipo = tipoFinal(this.h);
          if (tipo === "verdadero") {
            // El giro: aún falta el verdadero Rey. La campaña no termina aquí.
            this.h.completado = false;
            this.secretoActivo = true;
            this.desmontar();
            this.fase = "intro"; // intro del jefe secreto (rivalEnCurso = REY_VERDADERO)
          } else {
            this.finalTipo = tipo; // completado=true lo dejó avanzar()
            this.finalBeatIdx = 0;
            this.desmontar();
            this.fase = "final";
          }
        } else {
          this.fase = tienda ? "tienda" : "intro";
          this.desmontar();
        }
        this.guardar();
      }
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
      prologo: enIntro && !this.h.prologoVisto && this.h.escenarioIdx === 0 && this.h.rivalIdx === 0 ? PROLOGO : null,
      intro: enIntro && this.h.rivalIdx === 0 ? esc.intro : null,
      presentacion: enIntro ? rival.presentacion ?? null : null,
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
      progresoRival: { idx: this.h.rivalIdx, total: esc.rivales.length },
      suerteDisponible: this.suerteUsos,
      ojo: ojoEf,
      colmillo: colmilloEf,
      mejoras,
      itemsTienda,
      itemsEnMano,
      evento,
      marcas: [...this.h.marcas],
      finalTipo: this.fase === "final" ? this.finalTipo : null,
      finalBeat: this.finalBeatVista(),
      haySecreto,
      apuesta:
        this.fase === "intro"
          ? { elegida: this.apuestaMonto, opciones: opcionesApuesta(this.h.plata, rival.plata), premioBase: rival.plata }
          : null,
      desafio:
        !this.secretoActivo && (this.fase === "intro" || this.fase === "mesa" || this.fase === "victoria")
          ? (() => {
              const d = desafioDe(rival);
              return { nombre: d.nombre, desc: d.desc, bono: bonoDesafio(rival) };
            })()
          : null,
      botin: this.fase === "victoria" ? this.botin : null,
      apuestaPerdida: this.fase === "derrota" ? this.apuestaPerdida : 0,
      acertijoDisponible:
        this.fase === "intro" && acertijoPendiente(this.h)
          ? { titulo: acertijoPendiente(this.h)!.titulo }
          : null,
      acertijo:
        this.fase === "acertijo" && acertijoPendiente(this.h)
          ? {
              titulo: acertijoPendiente(this.h)!.titulo,
              texto: acertijoPendiente(this.h)!.texto,
              desenlace: this.acertijoDesenlace,
              fallo: this.acertijoFallo,
            }
          : this.fase === "acertijo" && this.acertijoDesenlace
            ? { titulo: "Secreto abierto", texto: "", desenlace: this.acertijoDesenlace, fallo: null }
            : null,
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
