// Transporte en línea sobre el árbitro de Render (WebSocket). Cumple la misma
// interfaz que el resto: la app no nota la diferencia con el modo solo/online.
// El servidor manda, en cada cambio, una instantánea personalizada (la mesa
// pública + la mano propia); aquí sólo la guardamos y avisamos a la UI.
import type { Apuesta, EstadoPublico, Pinta, Sentido } from "../engine";
import type { Instantanea, JugadorLobby, TransporteOnline } from "./transporte";

const CLAVE_CLIENTE = "cachos.clienteId";

function clienteId(): string {
  try {
    let id = localStorage.getItem(CLAVE_CLIENTE);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLAVE_CLIENTE, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** Acepta una URL http(s) o ws(s) y devuelve la de WebSocket. */
function urlWs(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/^http/i, "ws");
}

interface EstadoServidor {
  codigo: string;
  anfitrionId: string;
  miId: string;
  jugadoresLobby: JugadorLobby[];
  publico: EstadoPublico | null;
  miMano: Pinta[] | null;
}

export class TransporteRender implements TransporteOnline {
  private ws: WebSocket | null = null;
  private subs = new Set<() => void>();
  private snap: EstadoServidor | null = null;
  private readonly cliente = clienteId();
  private readonly abierto: Promise<void>;
  /** Promesa pendiente de la primera respuesta a crearSala/unirse. */
  private pendiente: { resolver: () => void; rechazar: (e: Error) => void } | null = null;

  private constructor(private readonly url: string) {
    this.abierto = this.conectar();
  }

  static async crear(url: string): Promise<TransporteRender> {
    const t = new TransporteRender(urlWs(url));
    await t.abierto;
    return t;
  }

  private conectar(): Promise<void> {
    return new Promise((resolver, rechazar) => {
      let abierto = false;
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        abierto = true;
        resolver();
      };
      ws.onerror = () => {
        if (!abierto) rechazar(new Error("No se pudo conectar con el servidor del juego."));
      };
      ws.onmessage = (ev) => this.alRecibir(ev);
    });
  }

  private alRecibir(ev: MessageEvent): void {
    let msg: { tipo?: string; mensaje?: string } & Partial<EstadoServidor>;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (msg.tipo === "estado") {
      this.snap = {
        codigo: msg.codigo!,
        anfitrionId: msg.anfitrionId!,
        miId: msg.miId!,
        jugadoresLobby: msg.jugadoresLobby ?? [],
        publico: msg.publico ?? null,
        miMano: msg.miMano ?? null,
      };
      this.pendiente?.resolver();
      this.pendiente = null;
      this.emitir();
    } else if (msg.tipo === "error") {
      const err = new Error(msg.mensaje ?? "Error del servidor.");
      if (this.pendiente) {
        this.pendiente.rechazar(err);
        this.pendiente = null;
      }
      // Errores fuera de crear/unirse (p.ej. jugada inválida) no rompen la mesa.
    }
  }

  private enviar(msg: Record<string, unknown>): void {
    this.ws?.send(JSON.stringify(msg));
  }
  private esperarRespuesta(msg: Record<string, unknown>): Promise<void> {
    return new Promise((resolver, rechazar) => {
      this.pendiente = { resolver, rechazar };
      this.enviar(msg);
    });
  }

  async crearSala(nombre: string): Promise<void> {
    await this.abierto;
    await this.esperarRespuesta({ tipo: "crearSala", nombre, clienteId: this.cliente });
  }
  async unirse(codigo: string, nombre: string): Promise<void> {
    await this.abierto;
    await this.esperarRespuesta({ tipo: "unirse", codigo: codigo.toUpperCase(), nombre, clienteId: this.cliente });
  }

  async iniciar(sentido?: Sentido): Promise<void> {
    this.enviar({ tipo: "iniciar", ...(sentido ? { sentido } : {}) });
  }
  async apostar(apuesta: Apuesta): Promise<void> {
    this.enviar({ tipo: "accion", jugada: { tipo: "APOSTAR", apuesta } });
  }
  async dudar(): Promise<void> {
    this.enviar({ tipo: "accion", jugada: { tipo: "DUDAR" } });
  }
  async calzar(): Promise<void> {
    this.enviar({ tipo: "accion", jugada: { tipo: "CALZAR" } });
  }
  async pasar(): Promise<void> {
    this.enviar({ tipo: "accion", jugada: { tipo: "PASAR" } });
  }
  async dudarPaso(): Promise<void> {
    this.enviar({ tipo: "accion", jugada: { tipo: "DUDAR_PASO" } });
  }
  async siguienteRonda(sentido?: Sentido): Promise<void> {
    this.enviar({ tipo: "siguienteRonda", ...(sentido ? { sentido } : {}) });
  }
  async terminarSolo(): Promise<void> {
    /* sin efecto en línea */
  }

  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  private emitir(): void {
    for (const f of this.subs) f();
  }
  detener(): void {
    this.subs.clear();
    this.ws?.close();
    this.ws = null;
  }

  instantanea(): Instantanea {
    const s = this.snap;
    const enLobby = !s?.publico || s.publico.fase === "LOBBY";
    return {
      faseApp: s && !enLobby ? "juego" : "lobby",
      codigo: s?.codigo ?? null,
      anfitrionId: s?.anfitrionId ?? null,
      jugadoresLobby: s?.jugadoresLobby ?? [],
      publico: s?.publico ?? null,
      miMano: s?.miMano ?? null,
      miId: s?.miId ?? "",
      esLocal: false,
      esSolo: false,
    };
  }
}
