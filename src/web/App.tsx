import { useState } from "react";
import { Mesa } from "./Mesa";
import { TransporteLocal, type Transporte } from "./transporte";
import { TransporteSupabase, supabaseConfigurado } from "./transporteSupabase";
import { useInstantanea } from "./util";
import { desbloquearAudio } from "./sonido";
import type { Nivel } from "./bots";

const ETIQUETA_NIVEL: Record<Nivel, string> = {
  facil: "Fácil",
  medio: "Medio",
  avanzado: "Avanzado",
  experto: "Experto",
};
const DESC_NIVEL: Record<Nivel, string> = {
  facil: "Arriesgada y errática: fácil de cazar.",
  medio: "Juega prudente y razonable.",
  avanzado: "Muy fina: calza, pasa y farolea.",
  experto: "Implacable: lee el historial, sospecha faroles y casi no falla.",
};

export function App() {
  const [transporte, setTransporte] = useState<Transporte | null>(null);
  const salir = () => {
    transporte?.detener();
    setTransporte(null);
  };
  return (
    <>
      {!transporte ? <Inicio onListo={setTransporte} /> : <Juego transporte={transporte} salir={salir} />}
      <div className="build">v{__BUILD_TIME__}</div>
    </>
  );
}

function Juego({ transporte, salir }: { transporte: Transporte; salir: () => void }) {
  const snap = useInstantanea(transporte);
  if (snap.faseApp === "juego") return <Mesa snap={snap} transporte={transporte} salir={salir} />;
  return <Lobby snap={snap} transporte={transporte} salir={salir} />;
}

function Lobby({
  snap,
  transporte,
  salir,
}: {
  snap: ReturnType<Transporte["instantanea"]>;
  transporte: Transporte;
  salir: () => void;
}) {
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
      <button className="btn btn--dudar" onClick={salir}>
        Salir del salón
      </button>
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
  const [nombre, setNombre] = useState("Miembro");
  const [rivales, setRivales] = useState(2);
  const [nivel, setNivel] = useState<Nivel>("medio");

  const empezar = () => {
    desbloquearAudio(); // habilita el audio dentro del gesto del usuario
    const yo = { id: "humano", nombre: nombre.trim() || "Miembro" };
    const bots = NOMBRES_BOT.slice(0, rivales).map((n, i) => ({ id: `bot${i}`, nombre: n }));
    onListo(new TransporteLocal([yo, ...bots], { humanoId: yo.id, nivel }));
  };

  return (
    <div className="pantalla config">
      <Cabecera titulo="Jugar solo" volver={volver} />
      <p className="ayuda">Tú contra la banca. Elige rivales y dificultad.</p>
      <input value={nombre} placeholder="Tu nombre" onChange={(e) => setNombre(e.target.value)} />

      <div className="campo-label">Rivales de la máquina</div>
      <div className="stepper">
        <button onClick={() => setRivales((r) => Math.max(1, r - 1))} aria-label="menos">−</button>
        <span className="cantidad">{rivales}</span>
        <button onClick={() => setRivales((r) => Math.min(NOMBRES_BOT.length, r + 1))} aria-label="más">+</button>
      </div>

      <div className="campo-label">Dificultad</div>
      <div className="segmento">
        {(Object.keys(ETIQUETA_NIVEL) as Nivel[]).map((n) => (
          <button key={n} className={"seg-btn" + (nivel === n ? " sel" : "")} onClick={() => setNivel(n)}>
            {ETIQUETA_NIVEL[n]}
          </button>
        ))}
      </div>
      <p className="ayuda nivel-desc">{DESC_NIVEL[nivel]}</p>

      <button className="btn btn--apostar grande" onClick={empezar}>
        Sentarse a la mesa
      </button>
    </div>
  );
}

function Cabecera({ titulo, volver }: { titulo: string; volver: () => void }) {
  return (
    <header className="cabecera">
      <button className="volver" onClick={volver} aria-label="Volver">
        ‹
      </button>
      <h2>{titulo}</h2>
    </header>
  );
}

function Reglas({ volver }: { volver: () => void }) {
  return (
    <div className="pantalla reglas-pantalla">
      <Cabecera titulo="Reglas de la Asociación" volver={volver} />
      <p className="reglas-intro">El cacho de la casa, al completo. Lectura obligatoria para todo socio.</p>

      <section className="regla-bloque">
        <h3>El objetivo</h3>
        <p>
          Gana el último socio que conserve dados. Cada uno parte con <b>5</b> y los agita en
          secreto; las apuestas son sobre <b>todos</b> los dados de la mesa, no solo los tuyos.
        </p>
      </section>

      <section className="regla-bloque">
        <h3>Las pintas</h3>
        <p>
          As (1) · Tonto (2) · Tren (3) · Cuadra (4) · Quina (5) · Sexta (6). El <b>As es comodín</b>:
          cuenta como cualquier pinta… salvo en el obligado.
        </p>
      </section>

      <section className="regla-bloque">
        <h3>La apuesta</h3>
        <p>En tu turno declaras cuántos dados de una pinta hay en la mesa. Para subir la apuesta:</p>
        <ul>
          <li>sube la <b>cantidad</b> (con cualquier pinta), o</li>
          <li>mantén la cantidad y sube la <b>pinta</b>.</li>
        </ul>
      </section>

      <section className="regla-bloque">
        <h3>Los ases (conversión de la casa)</h3>
        <ul>
          <li>
            De pinta normal a <b>ases</b>: al menos la <b>mitad</b> (redondeando hacia arriba). Tras
            “6 quinas”, entras con “3 ases”.
          </li>
          <li>
            De ases a pinta normal: el <b>doble más uno</b>. Tras “3 ases”, sales con “7” de cualquier
            pinta.
          </li>
          <li>De ases a ases: solo sube la cantidad.</li>
        </ul>
      </section>

      <section className="regla-bloque">
        <h3>Dudar</h3>
        <p>
          Si crees que no hay tantos, dudas y se revela la mesa. Si la apuesta <b>no</b> se cumple,
          el que apostó pierde un dado; si se cumple, lo pierdes tú.
        </p>
      </section>

      <section className="regla-bloque">
        <h3>Calzar</h3>
        <p>
          Declaras que la cantidad es <b>exacta</b>. Si aciertas, <b>recuperas un dado</b> (hasta 5).
          Solo se permite cuando aún queda al menos la <b>mitad</b> de los dados iniciales en la mesa.
        </p>
      </section>

      <section className="regla-bloque destacado">
        <h3>★ El paso</h3>
        <p>
          Solo con tus <b>5 dados</b> puedes pasar el turno sin apostar. El siguiente debe{" "}
          <b>dudar el paso</b> o <b>subir la apuesta</b> (no puede calzar ni dudar la apuesta previa
          al paso). Si lo duda:
        </p>
        <ul>
          <li>si tu mano <b>no</b> estaba validada, pierdes un dado;</li>
          <li>si <b>sí</b> lo estaba, pierde el que dudó.</li>
        </ul>
        <p>
          Un paso se valida con <b>5 iguales</b>, <b>todos distintos</b> (escalera) o <b>full</b> (3 y 2).
        </p>
        <p>
          Solo puedes pasar <b>una vez por ronda</b>, y no puedes pasar justo{" "}
          <b>después de otro paso</b>.
        </p>
      </section>

      <section className="regla-bloque destacado">
        <h3>★ La siciliana</h3>
        <p>
          Si dudas la <b>primera</b> apuesta de la ronda (la del que abrió) y esa apuesta pierde, el
          perdedor cae <b>2 dados</b> de una. En esa cuenta los <b>ases no son comodín</b>.{" "}
          <b>No aplica</b> en rondas de obligado.
        </p>
      </section>

      <section className="regla-bloque destacado">
        <h3>★ El obligado</h3>
        <p>
          La primera vez que un socio queda con <b>1 dado</b>, abre una ronda especial de obligado:
        </p>
        <ul>
          <li>Es <b>cerrada</b>: los demás juegan <b>a ciegas</b>; solo ve su cacho quien también tenga 1 dado.</li>
          <li>Los <b>ases no son comodín</b>.</li>
          <li>Con 2 o más dados no puedes cambiar la pinta (solo subir cantidad) ni calzar.</li>
          <li>No corre la siciliana.</li>
        </ul>
      </section>

      <button className="btn btn--apostar grande" onClick={volver}>
        Volver al salón
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
        <Cabecera titulo="Mesa en línea" volver={volver} />
        <p className="ayuda">
          Falta configurar el backend. Define <code>VITE_SUPABASE_URL</code> y{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> (ver <code>supabase/README.md</code>) y vuelve a cargar.
        </p>
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
      <Cabecera titulo="Mesa en línea" volver={volver} />
      <input value={nombre} placeholder="Tu nombre" onChange={(e) => setNombre(e.target.value)} />
      <button
        className="btn btn--apostar grande"
        disabled={!nombre.trim() || cargando}
        onClick={() => correr((t) => t.crearSala(nombre.trim()))}
      >
        Crear sala
      </button>
      <div className="separador">o únete con una contraseña</div>
      <input value={codigo} placeholder="CONTRASEÑA" onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
      <button
        className="btn btn--calzar grande"
        disabled={!nombre.trim() || codigo.length < 4 || cargando}
        onClick={() => correr((t) => t.unirse(codigo.trim(), nombre.trim()))}
      >
        Unirse
      </button>
      {error && <div className="hint">{error}</div>}
    </div>
  );
}
