import { useState } from "react";
import { Mesa } from "./Mesa";
import { TransporteLocal, type Transporte } from "./transporte";
import { TransporteSupabase, supabaseConfigurado } from "./transporteSupabase";
import { useInstantanea } from "./util";

export function App() {
  const [transporte, setTransporte] = useState<Transporte | null>(null);
  if (!transporte) return <Inicio onListo={setTransporte} />;
  return <Juego transporte={transporte} />;
}

function Juego({ transporte }: { transporte: Transporte }) {
  const snap = useInstantanea(transporte);
  if (snap.faseApp === "juego") return <Mesa snap={snap} transporte={transporte} />;
  return <Lobby snap={snap} transporte={transporte} />;
}

function Lobby({ snap, transporte }: { snap: ReturnType<Transporte["instantanea"]>; transporte: Transporte }) {
  const soyAnfitrion = snap.anfitrionId === snap.miId;
  return (
    <div className="pantalla lobby">
      <h1>Sala</h1>
      {snap.codigo && (
        <div className="codigo-sala">
          Código: <strong>{snap.codigo}</strong>
          <div className="ayuda">Comparte este código con tus amigos.</div>
        </div>
      )}
      <ul className="lista-jugadores">
        {snap.jugadoresLobby.map((j) => (
          <li key={j.id}>
            {j.nombre} {j.id === snap.anfitrionId && <span className="badge">anfitrión</span>}
          </li>
        ))}
      </ul>
      {soyAnfitrion ? (
        <button
          className="btn btn--apostar grande"
          disabled={snap.jugadoresLobby.length < 2}
          onClick={() => transporte.iniciar()}
        >
          Iniciar partida
        </button>
      ) : (
        <p className="ayuda">Esperando que el anfitrión inicie…</p>
      )}
    </div>
  );
}

function Inicio({ onListo }: { onListo: (t: Transporte) => void }) {
  const [vista, setVista] = useState<"home" | "local" | "online">("home");

  if (vista === "local") return <ConfigLocal onListo={onListo} volver={() => setVista("home")} />;
  if (vista === "online") return <ConfigOnline onListo={onListo} volver={() => setVista("home")} />;

  return (
    <div className="pantalla home">
      <div className="logo">🎲</div>
      <h1>Cachos</h1>
      <p className="sub">Dudo chileno para jugar con los amigos</p>
      <button className="btn btn--apostar grande" onClick={() => setVista("local")}>
        Jugar local (pasar el teléfono)
      </button>
      <button className="btn btn--dudar grande" onClick={() => setVista("online")}>
        Jugar en línea
      </button>
    </div>
  );
}

function ConfigLocal({ onListo, volver }: { onListo: (t: Transporte) => void; volver: () => void }) {
  const [nombres, setNombres] = useState<string[]>(["Ana", "Beto", "Cata", "", "", ""]);
  const set = (i: number, v: string) => setNombres((n) => n.map((x, j) => (j === i ? v : x)));
  const jugadores = nombres.map((n, i) => ({ id: `p${i}`, nombre: n.trim() })).filter((j) => j.nombre);

  return (
    <div className="pantalla config">
      <h2>Jugadores</h2>
      <p className="ayuda">Entre 2 y 6. En este modo se pasa el teléfono por turnos.</p>
      {nombres.map((n, i) => (
        <input key={i} value={n} placeholder={`Jugador ${i + 1}`} onChange={(e) => set(i, e.target.value)} />
      ))}
      <div className="botonera">
        <button className="btn btn--dudar" onClick={volver}>
          Volver
        </button>
        <button
          className="btn btn--apostar"
          disabled={jugadores.length < 2}
          onClick={() => onListo(new TransporteLocal(jugadores))}
        >
          Empezar ({jugadores.length})
        </button>
      </div>
    </div>
  );
}

function ConfigOnline({ onListo, volver }: { onListo: (t: Transporte) => void; volver: () => void }) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!supabaseConfigurado()) {
    return (
      <div className="pantalla config">
        <h2>Jugar en línea</h2>
        <p className="ayuda">
          Falta configurar el backend. Define <code>VITE_SUPABASE_URL</code> y{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>supabase/README.md</code>) y vuelve a cargar.
        </p>
        <button className="btn btn--dudar" onClick={volver}>
          Volver
        </button>
      </div>
    );
  }

  const correr = async (accion: (t: TransporteSupabase) => Promise<void>) => {
    setError(null);
    setCargando(true);
    try {
      const t = await TransporteSupabase.crear();
      await accion(t);
      onListo(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setCargando(false);
    }
  };

  return (
    <div className="pantalla config">
      <h2>Jugar en línea</h2>
      <input value={nombre} placeholder="Tu nombre" onChange={(e) => setNombre(e.target.value)} />
      <button
        className="btn btn--apostar"
        disabled={!nombre.trim() || cargando}
        onClick={() => correr((t) => t.crearSala(nombre.trim()))}
      >
        Crear sala
      </button>
      <div className="separador">o únete con un código</div>
      <input value={codigo} placeholder="CÓDIGO" onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
      <button
        className="btn btn--apostar"
        disabled={!nombre.trim() || codigo.length < 4 || cargando}
        onClick={() => correr((t) => t.unirse(codigo.trim(), nombre.trim()))}
      >
        Unirse
      </button>
      {error && <div className="hint">{error}</div>}
      <button className="btn btn--dudar" onClick={volver}>
        Volver
      </button>
    </div>
  );
}
