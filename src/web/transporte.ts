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
  type Sentido,
} from "../engine";

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
}

export interface Transporte {
  instantanea(): Instantanea;
  suscribir(cb: () => void): () => void;
  iniciar(sentido?: Sentido): Promise<void>;
  apostar(apuesta: Apuesta): Promise<void>;
  dudar(): Promise<void>;
  calzar(): Promise<void>;
  siguienteRonda(sentido?: Sentido): Promise<void>;
}

/**
 * Transporte local (hot-seat): el motor corre en el navegador y la pantalla
 * adopta la perspectiva del jugador de turno. Ideal para probar y para jugar
 * pasándose el teléfono.
 */
export class TransporteLocal implements Transporte {
  private estado: EstadoJuego;
  private subs = new Set<() => void>();

  constructor(jugadores: JugadorLobby[]) {
    this.estado = crearJuego(jugadores);
  }

  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  private emitir() {
    for (const f of this.subs) f();
  }

  async iniciar(sentido?: Sentido) {
    this.estado = iniciarRonda(this.estado, sentido ? { sentido } : {});
    this.emitir();
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
  async siguienteRonda(sentido?: Sentido) {
    this.estado = iniciarRonda(this.estado, sentido ? { sentido } : {});
    this.emitir();
  }

  private jugar(accion: Accion) {
    this.estado = aplicarAccion(this.estado, accion);
    this.emitir();
  }
  private turno(): string {
    return jugadorDeTurnoId(this.estado) ?? this.estado.ordenAsientos[0]!;
  }

  instantanea(): Instantanea {
    const e = this.estado;
    const lobby = e.jugadores.map((j) => ({ id: j.id, nombre: j.nombre }));
    const anfitrion = e.ordenAsientos[0] ?? null;

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
      };
    }

    // Perspectiva: en juego, el de turno; tras una revelación, quien abre la próxima.
    const persp =
      e.fase === "EN_RONDA"
        ? jugadorDeTurnoId(e)!
        : e.abridorRondaId ?? jugadorDeTurnoId(e) ?? e.ordenAsientos[0]!;
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
    };
  }
}
