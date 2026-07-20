// EL TORNEO DE LA ASOCIACIÓN: eliminatoria de duelos 1v1 en "Jugar solo".
// Cuartos → Semifinal → Final, con rivales cada vez más duros. Perder te
// elimina; coronar la final suma una COPA al palmarés.
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { registrarCopa } from "./palmares";
import type { Nivel } from "./bots";

const HUMANO = "humano";

export interface RondaTorneo {
  nombre: string;
  rival: string;
  nivel: Nivel;
}

/** El cuadro del torneo: tres duelos, de menor a mayor calibre. */
export const RONDAS_TORNEO: RondaTorneo[] = [
  { nombre: "Cuartos de final", rival: "El Tuerto", nivel: "medio" },
  { nombre: "Semifinal", rival: "La Sombra", nivel: "avanzado" },
  { nombre: "La Final", rival: "Doña Suerte", nivel: "experto" },
];

export class TransporteTorneo implements Transporte {
  private inner: TransporteLocal;
  private unsub: () => void = () => {};
  private subs = new Set<() => void>();
  private ronda = 0;
  private vivo = true;
  private coronado = false;
  private nombreJugador: string;

  constructor(nombre: string) {
    this.nombreJugador = nombre;
    this.inner = this.montar();
  }

  private montar(): TransporteLocal {
    const r = RONDAS_TORNEO[this.ronda]!;
    const inner = new TransporteLocal(
      [
        { id: HUMANO, nombre: this.nombreJugador },
        { id: `t-${this.ronda}`, nombre: r.rival },
      ],
      { humanoId: HUMANO, nivel: r.nivel },
    );
    this.unsub();
    this.unsub = inner.suscribir(() => this.alCambiar(inner));
    return inner;
  }

  private alCambiar(inner: TransporteLocal) {
    const pub = inner.instantanea().publico;
    if (pub?.fase === "FIN_JUEGO" && this.vivo) {
      if (pub.ganadorId !== HUMANO) {
        this.vivo = false; // eliminado del cuadro
      } else if (this.ronda === RONDAS_TORNEO.length - 1 && !this.coronado) {
        this.coronado = true;
        registrarCopa(); // ¡campeón!
      }
    }
    for (const f of this.subs) f();
  }

  /** Tras ganar un duelo (no la final): al siguiente rival del cuadro. */
  torneoSiguiente() {
    const pub = this.inner.instantanea().publico;
    if (!this.vivo || this.coronado || pub?.fase !== "FIN_JUEGO" || pub.ganadorId !== HUMANO) return;
    this.ronda += 1;
    this.inner.detener();
    this.inner = this.montar();
    for (const f of this.subs) f();
  }

  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  instantanea(): Instantanea {
    const base = this.inner.instantanea();
    const r = RONDAS_TORNEO[this.ronda]!;
    return {
      ...base,
      torneo: { ronda: this.ronda + 1, total: RONDAS_TORNEO.length, nombre: r.nombre, vivo: this.vivo, coronado: this.coronado },
    };
  }
  async iniciar() {
    await this.inner.iniciar();
  }
  async apostar(a: Parameters<Transporte["apostar"]>[0]) {
    await this.inner.apostar(a);
  }
  async dudar() {
    await this.inner.dudar();
  }
  async calzar() {
    await this.inner.calzar();
  }
  async pasar() {
    await this.inner.pasar();
  }
  async dudarPaso() {
    await this.inner.dudarPaso();
  }
  async siguienteRonda(s?: Parameters<Transporte["siguienteRonda"]>[0]) {
    await this.inner.siguienteRonda(s);
  }
  async terminarSolo() {
    await this.inner.terminarSolo();
  }
  detener() {
    this.unsub();
    this.inner.detener();
    this.subs.clear();
  }
}
