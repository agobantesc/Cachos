// Transporte del MODO TORNEO. Cumple la misma interfaz `Transporte`, así que la
// UI lo usa igual que el modo solo. Por dentro:
//   - el humano juega su mesa de la ronda con un TransporteLocal (reusado tal
//     cual, con su Mesa.tsx y sus bots);
//   - cuando esa mesa termina (FIN_JUEGO), se resuelven headless las demás mesas
//     y se decide quién avanza;
//   - entre rondas se muestra una pantalla de transición; al avanzar se siembra
//     la siguiente mesa del humano.
// No toca el motor ni el modo online.
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import {
  crearTorneo,
  resolverRonda,
  prepararSiguienteRonda,
  coronarSinHumano,
  esUltimaRonda,
  nivelRondaActual,
  mesaDelHumano,
  vistaTorneo,
  HUMANO_ID,
  type EstadoTorneo,
  type FaseTorneo,
  type OpcionesTorneo,
  type ParticipanteTorneo,
} from "./torneo";

export class TransporteTorneo implements Transporte {
  private estado: EstadoTorneo;
  private fase: FaseTorneo = "mesa";
  private inner: TransporteLocal | null = null;
  private innerUnsub: (() => void) | null = null;
  private subs = new Set<() => void>();
  private detenido = false;
  /** Clasificados a la próxima ronda, fijados al resolver la ronda actual. */
  private ganadoresPendientes: ParticipanteTorneo[] = [];

  constructor(opts: OpcionesTorneo) {
    this.estado = crearTorneo(opts);
    this.iniciarMesaHumano();
  }

  // --- Suscripción / ciclo de vida ------------------------------------------
  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  private emitir() {
    for (const f of this.subs) f();
  }
  detener() {
    this.detenido = true;
    this.desmontarInner();
    this.subs.clear();
  }
  private desmontarInner() {
    this.innerUnsub?.();
    this.innerUnsub = null;
    this.inner?.detener();
    this.inner = null;
  }

  // --- Orquestación del bracket ---------------------------------------------
  private iniciarMesaHumano() {
    this.desmontarInner();
    const mesa = mesaDelHumano(this.estado);
    const jugadores = mesa.participantes.map((p) => ({ id: p.id, nombre: p.nombre }));
    this.inner = new TransporteLocal(jugadores, {
      humanoId: HUMANO_ID,
      nivel: nivelRondaActual(this.estado),
    });
    this.innerUnsub = this.inner.suscribir(() => this.onInner());
    this.fase = "mesa";
    this.emitir();
  }

  private onInner() {
    if (this.detenido || !this.inner) return;
    const pub = this.inner.instantanea().publico;
    if (this.fase === "mesa" && pub && pub.fase === "FIN_JUEGO") {
      this.resolverMesaHumano(pub.ganadorId);
    } else {
      // Reenvía actualizaciones normales (turno, revelación, eliminación parcial).
      this.emitir();
    }
  }

  /** La mesa del humano terminó: ¿avanza o queda fuera? */
  private resolverMesaHumano(ganadorMesaId: string | null) {
    const ganador = ganadorMesaId ?? HUMANO_ID;
    const { ganadores, humanoAvanzo } = resolverRonda(this.estado, ganador);

    if (esUltimaRonda(this.estado)) {
      this.estado.campeonId = ganador;
      if (!humanoAvanzo) this.estado.rondaEliminado = this.estado.ronda;
      this.fase = humanoAvanzo ? "campeon" : "eliminado";
    } else if (humanoAvanzo) {
      this.ganadoresPendientes = ganadores;
      this.fase = "entre-rondas";
    } else {
      this.estado.rondaEliminado = this.estado.ronda;
      this.estado.campeonId = coronarSinHumano(this.estado, ganadores);
      this.fase = "eliminado";
    }
    this.emitir();
  }

  /** Botón "Siguiente ronda" de la pantalla de transición. */
  async avanzarTorneo() {
    if (this.fase !== "entre-rondas") return;
    prepararSiguienteRonda(this.estado, this.ganadoresPendientes);
    this.ganadoresPendientes = [];
    this.iniciarMesaHumano();
  }

  // --- Acciones del jugador: se delegan a la mesa en curso ------------------
  async iniciar() {
    /* la mesa del torneo arranca sola; no se usa */
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
  }
  async terminarSolo() {
    // El humano cayó en su mesa: lleva esa mesa hasta su fin (la gana un bot) y
    // eso dispara la resolución del torneo (onInner -> resolverMesaHumano).
    await this.inner?.terminarSolo();
  }

  // --- Instantánea: la de la mesa + la vista del torneo ---------------------
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
    return {
      ...base,
      esLocal: true,
      esSolo: true,
      torneo: vistaTorneo(this.estado, this.fase, this.ganadoresPendientes),
    };
  }
}
