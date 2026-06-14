import { useState } from "react";
import { Mesa } from "./Mesa";
import { TransporteLocal, type Transporte } from "./transporte";
import { TransporteSupabase, supabaseConfigurado } from "./transporteSupabase";
import { useInstantanea } from "./util";

export function App() {
  const [transporte, setTransporte] = useState<Transporte | null>(null);
  return (
    <>
      {!transporte ? <Inicio onListo={setTransporte} /> : <Juego transporte={transporte} />}
      <div className="build">v{__BUILD_TIME__}</div>
    </>
  );
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
      <h1>Salón privado</h1>
      {snap.codigo && (
        <div className="codigo-sala">
          Contraseña: <strong>{snap.codigo}</strong>
          <div className="ayuda">Pásala solo a los socios de confianza.</div>
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
  const [vista, setVista] = useState<"home" | "solo" | "online" | "reglas">("home");

  if (vista === "solo") return <ConfigSolo onListo={onListo} volver={() => setVista("home")} />;
  if (vista === "online") return <ConfigOnline onListo={onListo} volver={() => setVista("home")} />;
  if (vista === "reglas") return <Reglas volver={() => setVista("home")} />;

  return (
    <div className="pantalla home">
      <div className="logo">🎲</div>
      <h1 className="marca">
        La Asociación
        <span className="marca-fuerte">de Cachos</span>
      </h1>
      <p className="sub">El dudo de la casa, entre socios.</p>
      <button className="btn btn--apostar grande" onClick={() => setVista("solo")}>
        Jugar solo (vs la máquina)
      </button>
      <button className="btn btn--dudar grande" onClick={() => setVista("online")}>
        Mesa en línea
      </button>
      <button className="btn-link" onClick={() => setVista("reglas")}>
        📜 Reglas de la Asociación
      </button>
    </div>
  );
}

const NOMBRES_BOT = ["El Tuerto", "La Sombra", "Doña Suerte", "El Croata", "Patas Negras"];

function ConfigSolo({ onListo, volver }: { onListo: (t: Transporte) => void; volver: () => void }) {
  const [nombre, setNombre] = useState("Tú");
  const [rivales, setRivales] = useState(2);

  const empezar = () => {
    const yo = { id: "humano", nombre: nombre.trim() || "Tú" };
    const bots = NOMBRES_BOT.slice(0, rivales).map((n, i) => ({ id: `bot${i}`, nombre: n }));
    onListo(new TransporteLocal([yo, ...bots], { humanoId: yo.id }));
  };

  return (
    <div className="pantalla config">
      <h2>Jugar solo</h2>
      <p className="ayuda">Tú contra la banca. Elige cuántos rivales de la máquina enfrentas.</p>
      <input value={nombre} placeholder="Tu nombre" onChange={(e) => setNombre(e.target.value)} />
      <div className="mi-mano-titulo">Rivales de la máquina</div>
      <div className="stepper">
        <button onClick={() => setRivales((r) => Math.max(1, r - 1))} aria-label="menos">−</button>
        <span className="cantidad">{rivales}</span>
        <button onClick={() => setRivales((r) => Math.min(NOMBRES_BOT.length, r + 1))} aria-label="más">+</button>
      </div>
      <div className="botonera">
        <button className="btn btn--dudar" onClick={volver}>
          Volver
        </button>
        <button className="btn btn--apostar" onClick={empezar}>
          Empezar
        </button>
      </div>
    </div>
  );
}

function Reglas({ volver }: { volver: () => void }) {
  return (
    <div className="pantalla config reglas-pantalla">
      <h2>Reglas de la Asociación</h2>
      <ol className="reglas">
        <li>
          <b>El reparto.</b> Cada socio parte con <b>5 dados</b> y los agita en secreto. La apuesta
          es sobre <b>todos</b> los dados de la mesa, no solo los tuyos.
        </li>
        <li>
          <b>El as es comodín.</b> La pinta 1 (As) cuenta como cualquier pinta… salvo cuando alguien
          está obligando (ahí el as vale solo como as).
        </li>
        <li>
          <b>Apostar.</b> En tu turno subes la apuesta: más cantidad de la misma pinta, o la misma
          cantidad subiendo la pinta. Entrar y salir de ases sigue la conversión de la casa.
        </li>
        <li>
          <b>Dudar.</b> Si crees que no hay tantos, dudas y se cuenta. Si la apuesta no se cumple,
          el que apostó pierde un dado; si se cumple, pierdes tú.
        </li>
        <li>
          <b>Calzar.</b> Declaras que la cantidad es <b>exacta</b>. Si aciertas, recuperas un dado.
          Solo se permite con al menos la mitad de los dados aún en la mesa.
        </li>
        <li>
          <b>La siciliana.</b> Si dudas la <b>primera</b> apuesta de la ronda (la del que abrió) y
          pierde, se pierden <b>2 dados</b> (y los ases no son comodín en esa cuenta).{" "}
          <b>No aplica</b> en rondas de obligado.
        </li>
        <li>
          <b>El obligado.</b> Cuando un socio queda con <b>1 dado</b>, abre una ronda especial: los
          demás juegan <b>a ciegas</b> (sin ver su cacho).
        </li>
        <li>
          <b>Gana</b> el último socio que conserve dados. Lo demás es niebla.
        </li>
      </ol>
      <button className="btn btn--apostar grande" onClick={volver}>
        Volver
      </button>
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
