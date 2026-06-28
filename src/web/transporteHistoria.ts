// Transporte del MODO HISTORIA. Cumple la interfaz Transporte: la UI lo usa como
// los demás modos. Orquesta la campaña sobre el motor:
//   - cada combate es un MANO A MANO contra el rival actual, jugado con un
//     TransporteLocal (con cachos por jugador: ventaja del boss + tu aguante);
//   - al terminar, decide victoria/derrota, reparte plata y persiste el avance;
//   - entre escenarios abre la TIENDA para subir atributos con plata;
//   - poderes en mesa: "Suerte" re-tira tu mano (según tu atributo).
import { TransporteLocal, type Instantanea, type Transporte } from "./transporte";
import { guardarPrefs } from "./prefs";
import {
  rivalActual,
  escenarioActual,
  avanzar,
  costoMejora,
  dadosInicialesHumano,
  ATRIBUTOS,
  CAMPANA,
  HUMANO_ID,
  type EstadoHistoria,
  type FaseHistoria,
  type VistaHistoria,
  type ClaveAtributo,
  type MejoraVista,
} from "./historia";

export class TransporteHistoria implements Transporte {
  private h: EstadoHistoria;
  private fase: FaseHistoria = "intro";
  private inner: TransporteLocal | null = null;
  private innerUnsub: (() => void) | null = null;
  private subs = new Set<() => void>();
  private detenido = false;
  private suerteUsos = 0;

  constructor(estado: EstadoHistoria) {
    this.h = estado;
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
    const rival = rivalActual(this.h);
    this.suerteUsos = this.h.atributos.suerte;
    this.inner = new TransporteLocal(
      [
        { id: HUMANO_ID, nombre: this.h.nombre },
        { id: rival.id, nombre: rival.nombre },
      ],
      {
        humanoId: HUMANO_ID,
        nivel: rival.nivel,
        dadosIniciales: { [HUMANO_ID]: dadosInicialesHumano(this.h), [rival.id]: 5 + rival.dadosExtra },
      },
    );
    this.innerUnsub = this.inner.suscribir(() => this.onInner());
    this.fase = "mesa";
    this.emitir();
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

  historiaEmpezar() {
    if (this.fase === "intro") this.montarPartida();
  }
  historiaReintentar() {
    if (this.fase === "derrota") this.montarPartida();
  }
  historiaContinuar() {
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
    const mejoras: MejoraVista[] =
      this.fase === "tienda"
        ? ATRIBUTOS.map((a) => {
            const nivel = this.h.atributos[a.clave];
            const costo = costoMejora(a.clave, nivel);
            return {
              clave: a.clave,
              nombre: a.nombre,
              desc: a.desc,
              nivel,
              max: a.max,
              costo,
              alcanzable: nivel < a.max && this.h.plata >= costo,
            };
          })
        : [];
    return {
      faseHistoria: this.fase,
      nombreJugador: this.h.nombre,
      plata: this.h.plata,
      atributos: { ...this.h.atributos },
      escenario: { nombre: esc.nombre, lugar: esc.lugar, ambiente: esc.ambiente, idx: this.h.escenarioIdx, total: CAMPANA.length },
      rival: {
        id: rival.id,
        nombre: rival.nombre,
        nivel: rival.nivel,
        esBoss: rival.esBoss,
        habilidad: rival.habilidad ?? null,
        dadosExtra: rival.dadosExtra,
        plata: rival.plata,
        dialogo,
      },
      progresoRival: { idx: this.h.rivalIdx, total: esc.rivales.length },
      suerteDisponible: this.suerteUsos,
      ojo: this.h.atributos.ojo,
      mejoras,
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
