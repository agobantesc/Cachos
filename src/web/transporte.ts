// Capa de transporte: la UI no sabe si juega en local (motor en el navegador) o
// en línea (Supabase). Ambos modos exponen la misma interfaz `Transporte`.
import {
  crearJuego,
  iniciarRonda,
  aplicarAccion,
  jugadorDeTurnoId,
  vistaJugador,
  type Accion,
  type Apuesta,
  type EstadoJuego,
  type EstadoPublico,
  type Pinta,
  type ReglasCasa,
  type Sentido,
} from "../engine";
import { decidirBot, type JugadaBot, type Nivel } from "./bots";
import type { VistaTorneo } from "./torneo";
import type { VistaHistoria } from "./historia";

function accionDeJugada(jugada: JugadaBot, jugadorId: string): Accion {
  switch (jugada.tipo) {
    case "APOSTAR":
      return { tipo: "APOSTAR", jugadorId, apuesta: jugada.apuesta };
    case "CALZAR":
      return { tipo: "CALZAR", jugadorId };
    case "PASAR":
      return { tipo: "PASAR", jugadorId };
    case "DUDAR_PASO":
      return { tipo: "DUDAR_PASO", jugadorId };
    case "DUDAR":
      return { tipo: "DUDAR", jugadorId };
  }
}

export interface JugadorLobby {
  id: string;
  nombre: string;
}

/** Lo que la UI necesita para pintar la pantalla en cada momento. */
export interface Instantanea {
  faseApp: "lobby" | "juego";
  codigo: string | null;
  anfitrionId: string | null;
  jugadoresLobby: JugadorLobby[];
  publico: EstadoPublico | null;
  miMano: Pinta[] | null;
  /** Id de la perspectiva actual (en hot-seat, el jugador de turno). */
  miId: string;
  /** true si es modo local (hot-seat: se pasa el teléfono). */
  esLocal: boolean;
  /** true si es modo solitario contra la máquina (perspectiva fija en el humano). */
  esSolo: boolean;
  /** Estado del torneo si se juega en modo torneo; null/undefined si no. */
  torneo?: VistaTorneo | null;
  /** Estado de la conexión en línea (para mostrar "Reconectando…"). */
  conexion?: "ok" | "reconectando";
  /** Estado del modo historia, si se juega la campaña; null/undefined si no. */
  historia?: VistaHistoria | null;
}

export interface Transporte {
  instantanea(): Instantanea;
  suscribir(cb: () => void): () => void;
  iniciar(sentido?: Sentido): Promise<void>;
  apostar(apuesta: Apuesta): Promise<void>;
  dudar(): Promise<void>;
  calzar(): Promise<void>;
  pasar(): Promise<void>;
  dudarPaso(): Promise<void>;
  siguienteRonda(sentido?: Sentido): Promise<void>;
  /** Solitario: abandona la partida en curso y salta directo al resultado final
   * (resuelve la mesa entre bots). En línea no aplica. */
  terminarSolo(): Promise<void>;
  /** Torneo: pasa de la pantalla "entre rondas" a sembrar la siguiente mesa. */
  avanzarTorneo?(): Promise<void>;
  // --- Modo historia ---
  /** Empieza la partida contra el rival actual (desde la intro). */
  historiaEmpezar?(): void;
  /** Avanza tras ganar (a la tienda, al siguiente rival o al final). */
  historiaContinuar?(): void;
  /** Reintenta la partida perdida contra el mismo rival. */
  historiaReintentar?(): void;
  /** Compra una mejora de atributo en la tienda. */
  historiaMejorar?(clave: string): void;
  /** Usa el poder "Suerte": re-tira tu mano. */
  historiaSuerte?(): void;
  /** Abandona: corta temporizadores/suscripciones (para volver al menú). */
  detener(): void;
}

/** Transporte en línea: además crea/se une a una sala por código. */
export interface TransporteOnline extends Transporte {
  crearSala(nombre: string): Promise<void>;
  unirse(codigo: string, nombre: string): Promise<void>;
}

/**
 * Transporte local (hot-seat): el motor corre en el navegador y la pantalla
 * adopta la perspectiva del jugador de turno. Ideal para probar y para jugar
 * pasándose el teléfono.
 */
export class TransporteLocal implements Transporte {
  private estado: EstadoJuego;
  private subs = new Set<() => void>();
  /** En modo solitario, el id del jugador humano (perspectiva fija). null = hot-seat. */
  private readonly humano: string | null;
  private readonly nivel: Nivel;
  /** Nivel por jugador (modo historia: un boss duro junto a relleno más blando). */
  private readonly nivelPorJugador: Record<string, Nivel>;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private detenido = false;

  constructor(
    jugadores: JugadorLobby[],
    opciones: {
      humanoId?: string;
      nivel?: Nivel;
      nivelPorJugador?: Record<string, Nivel>;
      reglas?: ReglasCasa;
    } = {},
  ) {
    this.estado = crearJuego(jugadores, opciones.reglas);
    this.humano = opciones.humanoId ?? null;
    this.nivel = opciones.nivel ?? "medio";
    this.nivelPorJugador = opciones.nivelPorJugador ?? {};
    if (this.humano !== null) {
      // Modo solitario: arranca de inmediato y deja a los bots jugar.
      this.estado = iniciarRonda(this.estado);
      this.programar();
    }
  }

  private nivelDe(botId: string): Nivel {
    return this.nivelPorJugador[botId] ?? this.nivel;
  }

  /** Modo historia: re-tira la mano de un jugador (poder "Suerte"). */
  rerollarMano(jugadorId: string): boolean {
    if (this.estado.fase !== "EN_RONDA") return false;
    const j = this.estado.jugadores.find((x) => x.id === jugadorId);
    if (!j || j.eliminado || j.dados.length === 0) return false;
    j.dados = j.dados.map(() => (1 + Math.floor(Math.random() * 6)) as Pinta);
    this.emitir();
    return true;
  }

  /** Modo historia: "dado cargado" — re-tira la mano buscando la más concentrada
   *  (un mismo número repetido), para que el boss tramposo juegue con ventaja. */
  cargarMano(jugadorId: string): boolean {
    if (this.estado.fase !== "EN_RONDA") return false;
    const j = this.estado.jugadores.find((x) => x.id === jugadorId);
    if (!j || j.eliminado || j.dados.length === 0) return false;
    const concentracion = (caras: Pinta[]) => {
      const cuenta = new Map<number, number>();
      let mejor = 0;
      for (const c of caras) {
        const n = (cuenta.get(c) ?? 0) + 1;
        cuenta.set(c, n);
        if (n > mejor) mejor = n;
      }
      return mejor;
    };
    let mejor = j.dados;
    let mejorScore = concentracion(mejor);
    for (let k = 0; k < 8; k++) {
      const tirada = j.dados.map(() => (1 + Math.floor(Math.random() * 6)) as Pinta);
      const s = concentracion(tirada);
      if (s > mejorScore) {
        mejor = tirada;
        mejorScore = s;
      }
    }
    j.dados = mejor;
    return true;
  }

  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  detener() {
    this.detenido = true;
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.subs.clear();
  }
  private emitir() {
    for (const f of this.subs) f();
  }

  async iniciar(sentido?: Sentido) {
    this.estado = iniciarRonda(this.estado, sentido ? { sentido } : {});
    this.emitir();
    this.programar();
  }
  async apostar(apuesta: Apuesta) {
    this.jugar({ tipo: "APOSTAR", jugadorId: this.turno(), apuesta });
  }
  async dudar() {
    this.jugar({ tipo: "DUDAR", jugadorId: this.turno() });
  }
  async calzar() {
    this.jugar({ tipo: "CALZAR", jugadorId: this.turno() });
  }
  async pasar() {
    this.jugar({ tipo: "PASAR", jugadorId: this.turno() });
  }
  async dudarPaso() {
    this.jugar({ tipo: "DUDAR_PASO", jugadorId: this.turno() });
  }
  async siguienteRonda(sentido?: Sentido) {
    this.estado = iniciarRonda(this.estado, sentido ? { sentido } : {});
    this.emitir();
    this.programar();
  }
  async terminarSolo() {
    this.terminarPartidaSolo();
  }

  private jugar(accion: Accion) {
    this.estado = aplicarAccion(this.estado, accion);
    this.emitir();
    this.programar();
  }
  private turno(): string {
    return jugadorDeTurnoId(this.estado) ?? this.estado.ordenAsientos[0]!;
  }

  // --- Modo solitario: agenda y ejecuta las jugadas de la máquina ---
  private esBot(id: string | null): boolean {
    return this.humano !== null && id !== null && id !== this.humano;
  }

  /** Agenda la próxima jugada automática (bot por jugar, o continuar de ronda). */
  private programar() {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    if (this.detenido || this.humano === null) return;
    const e = this.estado;
    if (e.fase === "EN_RONDA") {
      const turno = jugadorDeTurnoId(e);
      if (this.esBot(turno)) {
        this.temporizador = setTimeout(() => this.jugarBot(turno!), 850);
      }
    }
    // Si el humano queda eliminado, NO se auto-avanza la mesa: la revelación le
    // ofrece "Ver resultado final" (terminarSolo) para no verla jugar sola.
  }

  /** Resuelve la mesa hasta el final (sólo quedan bots) y muestra el resultado. */
  private terminarPartidaSolo() {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    if (this.estado.fase === "FIN_JUEGO") {
      this.emitir();
      return;
    }
    let guarda = 0;
    while (this.estado.fase !== "FIN_JUEGO" && guarda++ < 5000) {
      const e = this.estado;
      if (e.fase === "FIN_RONDA") {
        this.estado = iniciarRonda(e);
        continue;
      }
      const turno = jugadorDeTurnoId(e);
      if (turno === null) break;
      const vista = vistaJugador(e, turno);
      const jugada = decidirBot(vista.publico, vista.miMano, turno, this.nivelDe(turno));
      if (!this.intentar(accionDeJugada(jugada, turno))) {
        const pub = vista.publico;
        if (pub.pasoPendienteJugadorId !== null) this.intentar({ tipo: "DUDAR_PASO", jugadorId: turno });
        else if (pub.apuestaActual) this.intentar({ tipo: "DUDAR", jugadorId: turno });
        else this.intentar({ tipo: "APOSTAR", jugadorId: turno, apuesta: { cantidad: 1, pinta: 2 } });
      }
    }
    this.emitir();
  }

  private jugarBot(botId: string) {
    if (jugadorDeTurnoId(this.estado) !== botId) return; // el estado cambió
    const vista = vistaJugador(this.estado, botId);
    const jugada = decidirBot(vista.publico, vista.miMano, botId, this.nivelDe(botId));

    if (!this.intentar(accionDeJugada(jugada, botId))) {
      // Salvaguarda con una acción siempre legal, para no quedar en bucle.
      const pub = vista.publico;
      if (pub.pasoPendienteJugadorId !== null) {
        this.intentar({ tipo: "DUDAR_PASO", jugadorId: botId });
      } else if (pub.apuestaActual) {
        this.intentar({ tipo: "DUDAR", jugadorId: botId });
      } else {
        this.intentar({ tipo: "APOSTAR", jugadorId: botId, apuesta: { cantidad: 1, pinta: 2 } });
      }
    }
    this.emitir();
    this.programar();
  }

  private intentar(accion: Accion): boolean {
    try {
      this.estado = aplicarAccion(this.estado, accion);
      return true;
    } catch {
      return false;
    }
  }

  instantanea(): Instantanea {
    const e = this.estado;
    const lobby = e.jugadores.map((j) => ({ id: j.id, nombre: j.nombre }));
    const anfitrion = e.ordenAsientos[0] ?? null;

    const esSolo = this.humano !== null;

    if (e.fase === "LOBBY") {
      return {
        faseApp: "lobby",
        codigo: null,
        anfitrionId: anfitrion,
        jugadoresLobby: lobby,
        publico: null,
        miMano: null,
        miId: anfitrion ?? "",
        esLocal: true,
        esSolo,
      };
    }

    // Perspectiva: en solitario, siempre el humano; en hot-seat, el de turno
    // (y tras una revelación, quien abre la próxima ronda).
    const persp =
      this.humano ??
      (e.fase === "EN_RONDA"
        ? jugadorDeTurnoId(e)!
        : e.abridorRondaId ?? jugadorDeTurnoId(e) ?? e.ordenAsientos[0]!);
    const v = vistaJugador(e, persp);
    return {
      faseApp: "juego",
      codigo: null,
      anfitrionId: anfitrion,
      jugadoresLobby: lobby,
      publico: v.publico,
      miMano: v.miMano,
      miId: persp,
      esLocal: true,
      esSolo,
    };
  }
}
