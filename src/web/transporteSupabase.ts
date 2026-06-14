// Transporte en línea: habla con la Edge Function `jugar` y escucha Realtime.
// Sigue el contrato de supabase/README.md. (No probado en este entorno: requiere
// un proyecto Supabase configurado vía VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Apuesta, EstadoPublico, Pinta, Sentido } from "../engine";
import type { Instantanea, JugadorLobby, Transporte } from "./transporte";

export function supabaseConfigurado(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export class TransporteSupabase implements Transporte {
  private sb: SupabaseClient;
  private subs = new Set<() => void>();
  private salaId: string | null = null;
  private codigo: string | null = null;
  private anfitrionId: string | null = null;
  private jugadoresLobby: JugadorLobby[] = [];
  private publico: EstadoPublico | null = null;
  private miMano: Pinta[] | null = null;
  private miId = "";

  private constructor(sb: SupabaseClient) {
    this.sb = sb;
  }

  /** Inicia sesión anónima y devuelve el transporte listo para crear/unirse. */
  static async crear(): Promise<TransporteSupabase> {
    const sb = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    );
    const { data: sesion } = await sb.auth.getSession();
    if (!sesion.session) await sb.auth.signInAnonymously();
    const { data: u } = await sb.auth.getUser();
    const t = new TransporteSupabase(sb);
    t.miId = u.user?.id ?? "";
    return t;
  }

  suscribir(cb: () => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  private emitir() {
    for (const f of this.subs) f();
  }

  private async invocar(body: Record<string, unknown>) {
    const { data, error } = await this.sb.functions.invoke("jugar", { body });
    if (error) throw new Error(error.message);
    return data;
  }

  async crearSala(nombre: string): Promise<void> {
    const r = (await this.invocar({ tipo: "crearSala", nombre })) as { salaId: string; codigo: string };
    this.codigo = r.codigo;
    await this.entrar(r.salaId);
  }

  async unirse(codigo: string, nombre: string): Promise<void> {
    const r = (await this.invocar({ tipo: "unirse", codigo, nombre })) as { salaId: string };
    this.codigo = codigo.toUpperCase();
    await this.entrar(r.salaId);
  }

  /** Carga inicial + suscripciones Realtime a la sala, el lobby y mi mano. */
  private async entrar(salaId: string) {
    this.salaId = salaId;
    await this.refrescarSala();
    await this.refrescarLobby();
    await this.refrescarMiMano();

    this.sb
      .channel(`sala-${salaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salas", filter: `id=eq.${salaId}` }, (p) => {
        const fila = p.new as { estado_publico: EstadoPublico | null; anfitrion_id: string };
        this.publico = fila.estado_publico ?? null;
        this.anfitrionId = fila.anfitrion_id ?? this.anfitrionId;
        this.emitir();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "jugadores_sala", filter: `sala_id=eq.${salaId}` }, () => {
        void this.refrescarLobby();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "manos", filter: `sala_id=eq.${salaId}` }, (p) => {
        const fila = p.new as { jugador_id: string; mano: Pinta[] | null };
        if (fila.jugador_id === this.miId) {
          this.miMano = fila.mano ?? null;
          this.emitir();
        }
      })
      .subscribe();
    this.emitir();
  }

  private async refrescarSala() {
    if (!this.salaId) return;
    const { data } = await this.sb.from("salas").select("estado_publico, anfitrion_id, codigo").eq("id", this.salaId).single();
    if (data) {
      this.publico = (data.estado_publico as EstadoPublico | null) ?? null;
      this.anfitrionId = data.anfitrion_id as string;
      this.codigo = (data.codigo as string) ?? this.codigo;
    }
  }
  private async refrescarLobby() {
    if (!this.salaId) return;
    const { data } = await this.sb.from("jugadores_sala").select("jugador_id, nombre, asiento").eq("sala_id", this.salaId).order("asiento");
    this.jugadoresLobby = (data ?? []).map((m) => ({ id: m.jugador_id as string, nombre: m.nombre as string }));
    this.emitir();
  }
  private async refrescarMiMano() {
    if (!this.salaId) return;
    const { data } = await this.sb.from("manos").select("mano").eq("sala_id", this.salaId).eq("jugador_id", this.miId).maybeSingle();
    this.miMano = (data?.mano as Pinta[] | null) ?? null;
  }

  async iniciar(sentido?: Sentido) {
    await this.invocar({ tipo: "iniciar", salaId: this.salaId, ...(sentido ? { sentido } : {}) });
  }
  async apostar(apuesta: Apuesta) {
    await this.invocar({ tipo: "accion", salaId: this.salaId, jugada: { tipo: "APOSTAR", apuesta } });
  }
  async dudar() {
    await this.invocar({ tipo: "accion", salaId: this.salaId, jugada: { tipo: "DUDAR" } });
  }
  async calzar() {
    await this.invocar({ tipo: "accion", salaId: this.salaId, jugada: { tipo: "CALZAR" } });
  }
  async siguienteRonda(sentido?: Sentido) {
    await this.invocar({ tipo: "siguienteRonda", salaId: this.salaId, ...(sentido ? { sentido } : {}) });
  }

  instantanea(): Instantanea {
    return {
      faseApp: this.publico && this.publico.fase !== "LOBBY" ? "juego" : "lobby",
      codigo: this.codigo,
      anfitrionId: this.anfitrionId,
      jugadoresLobby: this.jugadoresLobby,
      publico: this.publico,
      miMano: this.miMano,
      miId: this.miId,
      esLocal: false,
    };
  }
}
