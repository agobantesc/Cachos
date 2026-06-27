// Transporte en línea sobre el árbitro de Render (WebSocket). Cumple la misma
// interfaz que el resto: la app no nota la diferencia con el modo solo/online.
// El servidor manda, en cada cambio, una instantánea personalizada (la mesa
// pública + la mano propia); aquí sólo la guardamos y avisamos a la UI.
//
// Robustez: si se cae el socket (Render duerme, se va el WiFi) se reconecta solo
// con backoff reusando el clienteId (el server recupera el mismo asiento), y la
// UI muestra "Reconectando…". Las peticiones tienen timeout para no quedar
// colgadas en el cold-start de Render.
import type { Apuesta, EstadoPublico, Pinta, Sentido } from "../engine";
import type { Instantanea, JugadorLobby, TransporteOnline } from "./transporte";

const CLAVE_CLIENTE = "cachos.clienteId";
const TIMEOUT_MS = 45000; // cold-start de Render free puede tardar

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
  private cerrado = false;
  private reconectando = false;
  private intentos = 0;
  /** Sala y nombre actuales, para poder reconectar al mismo asiento. */
  private codigo: string | null = null;
  private nombre = "";
  private pendiente: { resolver: () => void; rechazar: (e: Error) => void } | null = null;
  private timerPendiente: ReturnType<typeof setTimeout> | null = null;

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
      let resuelto = false;
      const ws = new WebSocket(this.url);
      this.ws = ws;
      ws.onopen = () => {
        resuelto = true;
        this.reconectando = false;
        this.intentos = 0;
        // Si ya estábamos en una sala, recuperamos el asiento al reconectar.
        if (this.codigo) {
          this.enviar({ tipo: "unirse", codigo: this.codigo, nombre: this.nombre, clienteId: this.cliente });
        }
        resolver();
        this.emitir();
      };
      ws.onerror = () => {
        if (!resuelto) rechazar(new Error("No se pudo conectar con el servidor del juego."));
      };
      ws.onclose = () => this.alCerrar();
      ws.onmessage = (ev) => this.alRecibir(ev);
    });
  }

  /** El socket murió: si estábamos en una sala, reintentar con backoff. */
  private alCerrar(): void {
    if (this.cerrado || !this.codigo) return;
    this.reconectando = true;
    this.emitir();
    const espera = Math.min(8000, 800 * 2 ** this.intentos);
    this.intentos++;
    setTimeout(() => {
      if (!this.cerrado) void this.conectar().catch(() => {});
    }, espera);
  }

  private alRecibir(ev: MessageEvent): void {
    let msg: { tipo?: string; mensaje?: string } & Partial<EstadoServidor>;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    if (msg.tipo === "estado") {
      this.codigo = msg.codigo ?? this.codigo;
      this.snap = {
        codigo: msg.codigo!,
        anfitrionId: msg.anfitrionId!,
        miId: msg.miId!,
        jugadoresLobby: msg.jugadoresLobby ?? [],
        publico: msg.publico ?? null,
        miMano: msg.miMano ?? null,
      };
      this.resolverPendiente();
      this.emitir();
    } else if (msg.tipo === "error") {
      this.rechazarPendiente(new Error(msg.mensaje ?? "Error del servidor."));
      // Errores fuera de crear/unirse (p.ej. jugada inválida) no rompen la mesa.
    }
  }

  private limpiarTimer(): void {
    if (this.timerPendiente) {
      clearTimeout(this.timerPendiente);
      this.timerPendiente = null;
    }
  }
  private resolverPendiente(): void {
    if (!this.pendiente) return;
    this.limpiarTimer();
    const p = this.pendiente;
    this.pendiente = null;
    p.resolver();
  }
  private rechazarPendiente(e: Error): void {
    if (!this.pendiente) return;
    this.limpiarTimer();
    const p = this.pendiente;
    this.pendiente = null;
    p.rechazar(e);
  }

  private enviar(msg: Record<string, unknown>): void {
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }

  private esperarRespuesta(msg: Record<string, unknown>): Promise<void> {
    // Si quedaba una petición sin responder, se cancela.
    this.rechazarPendiente(new Error("Cancelado."));
    return new Promise((resolver, rechazar) => {
      this.pendiente = { resolver, rechazar };
      this.timerPendiente = setTimeout(() => {
        this.rechazarPendiente(new Error("El servidor está despertando. Espera unos segundos y reintenta."));
      }, TIMEOUT_MS);
      this.enviar(msg);
    });
  }

  async crearSala(nombre: string): Promise<void> {
    await this.abierto;
    this.nombre = nombre;
    await this.esperarRespuesta({ tipo: "crearSala", nombre, clienteId: this.cliente });
  }
  async unirse(codigo: string, nombre: string): Promise<void> {
    await this.abierto;
    this.nombre = nombre;
    this.codigo = codigo.toUpperCase();
    await this.esperarRespuesta({ tipo: "unirse", codigo: this.codigo, nombre, clienteId: this.cliente });
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
    this.cerrado = true;
    this.limpiarTimer();
    this.subs.clear();
    this.ws?.close();
    this.ws = null;
  }

  instantanea(): Instantanea {
    const s = this.snap;
    const enLobby = !s?.publico || s.publico.fase === "LOBBY";
    return {
      faseApp: s && !enLobby ? "juego" : "lobby",
      codigo: s?.codigo ?? this.codigo,
      anfitrionId: s?.anfitrionId ?? null,
      jugadoresLobby: s?.jugadoresLobby ?? [],
      publico: s?.publico ?? null,
      miMano: s?.miMano ?? null,
      miId: s?.miId ?? "",
      esLocal: false,
      esSolo: false,
      conexion: this.reconectando ? "reconectando" : "ok",
    };
  }
}
