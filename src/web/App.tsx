import { useEffect, useState } from "react";
import { leerPalmares } from "./palmares";
import { Mesa } from "./Mesa";
import { PantallaHistoria } from "./PantallaHistoria";
import { Cuaderno } from "./Cuaderno";
import { CampoJugador } from "./Personaje";
import { Emblema, IconoCalavera, IconoWhatsApp, IconoDado, IconoPersonas } from "./Iconos";
import { Avatar, fijarCaraJugador, CARA_DEFECTO } from "./Avatar";
import { invitarWhatsApp, copiarInvitacion, salaDesdeURL, limpiarURLSala } from "./invitacion";
import { TransporteLocal, type Transporte } from "./transporte";
import { TransporteHistoria } from "./transporteHistoria";
import { historiaNueva, escenarioActual, normalizar, OFICIOS, type OficioId } from "./historia";
import { onlineConfigurado, crearTransporteOnline } from "./online";
import { useInstantanea } from "./util";
import { leerPrefs, guardarPrefs } from "./prefs";
import { desbloquearAudio, Ambiente } from "./sonido";
import type { Nivel } from "./bots";

// Carga el rostro guardado del jugador (o la cara estándar limpia) para que
// aparezca en toda la app.
fijarCaraJugador(leerPrefs().cara ?? CARA_DEFECTO);

// "brutal" no se ofrece acá: es un escalón reservado a jefes puntuales del
// modo historia (ver bots.ts), no una dificultad para jugar solo.
type NivelSolo = Exclude<Nivel, "brutal">;
const ETIQUETA_NIVEL: Record<NivelSolo, string> = {
  facil: "Fácil",
  medio: "Medio",
  avanzado: "Avanzado",
  experto: "Experto",
};
const DESC_NIVEL: Record<NivelSolo, string> = {
  facil: "Juega a cartas vistas: arriesga de más y se deja cazar.",
  medio: "Fundamentos sólidos. Lee las señales de la mesa y apuesta honesto.",
  avanzado: "Calcula fino y empieza a engañar: farolea y disimula su mano.",
  experto: "Lee el historial y tus manías. Oculta su estrategia y castiga tus faroles.",
};

export function App() {
  const [transporte, setTransporte] = useState<Transporte | null>(null);
  const salir = () => {
    transporte?.detener();
    Ambiente.detener(); // el paisaje sonoro de la campaña no sigue al salón
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
  // En la campaña, las pantallas de historia (intro, eventos, victoria…)
  // reemplazan a la mesa; mientras se juega la mesa, manda el juego normal.
  let contenido;
  if (snap.historia && snap.historia.faseHistoria !== "mesa") {
    contenido = <PantallaHistoria snap={snap} transporte={transporte} salir={salir} />;
  } else if (snap.faseApp === "juego") {
    contenido = <Mesa snap={snap} transporte={transporte} salir={salir} />;
  } else {
    contenido = <Lobby snap={snap} transporte={transporte} salir={salir} />;
  }
  return (
    <>
      {snap.conexion === "reconectando" && (
        <div className="banner-reconexion" role="status">
          Reconectando con el servidor…
        </div>
      )}
      {contenido}
    </>
  );
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
  const codigo = snap.codigo ?? "";
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    if (await copiarInvitacion(codigo)) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };
  return (
    <div className="pantalla lobby">
      <h1>Salón privado</h1>
      {codigo && (
        <>
          <div className="codigo-sala">
            <span className="cs-label">Contraseña de la sala</span>
            <strong>{codigo}</strong>
          </div>
          <button className="btn btn--wa grande" onClick={() => invitarWhatsApp(codigo)}>
            <IconoWhatsApp /> Invitar por WhatsApp
          </button>
          <button className="btn-link" onClick={copiar}>
            {copiado ? "¡Invitación copiada!" : "Copiar la invitación"}
          </button>
        </>
      )}
      <div className="campo-label">En la mesa</div>
      <ul className="lista-jugadores">
        {snap.jugadoresLobby.map((j) => (
          <li key={j.id}>
            {j.nombre} {j.id === snap.anfitrionId && <span className="badge">anfitrión</span>}{" "}
            {j.esBot && <span className="badge badge--bot">máquina</span>}
          </li>
        ))}
      </ul>
      {soyAnfitrion && transporte.agregarBot && (
        <div className="bots-lobby" role="group" aria-label="Bots de la casa">
          <button
            className="bot-btn"
            onClick={() => transporte.agregarBot?.()}
            disabled={snap.jugadoresLobby.length >= 8}
          >
            + Agregar bot
          </button>
          {snap.jugadoresLobby.some((j) => j.esBot) && (
            <button className="bot-btn" onClick={() => transporte.quitarBot?.()}>
              − Quitar bot
            </button>
          )}
        </div>
      )}
      {soyAnfitrion ? (
        <button
          className="btn btn--apostar grande"
          disabled={snap.jugadoresLobby.length < 2}
          onClick={() => transporte.iniciar()}
        >
          {snap.jugadoresLobby.length < 2 ? "Esperando jugadores…" : "Iniciar partida"}
        </button>
      ) : (
        <p className="ayuda" aria-live="polite">
          Esperando que el anfitrión inicie
          <span className="puntos-vivos" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </span>
        </p>
      )}
      <button className="btn-link" onClick={salir}>
        Salir del salón
      </button>
    </div>
  );
}

function Inicio({ onListo }: { onListo: (t: Transporte) => void }) {
  // Si llegan por un enlace de invitación (?sala=CODIGO) entran directo a la
  // mesa en línea con la contraseña ya puesta.
  const [salaURL] = useState(() => salaDesdeURL());
  const [vista, setVista] = useState<"home" | "solo" | "historia" | "online" | "reglas">(
    salaURL ? "online" : "home",
  );

  if (vista === "solo") return <ConfigSolo onListo={onListo} volver={() => setVista("home")} />;
  if (vista === "historia") return <ConfigHistoria onListo={onListo} volver={() => setVista("home")} />;
  if (vista === "online")
    return <ConfigOnline onListo={onListo} volver={() => setVista("home")} codigoInicial={salaURL ?? ""} />;
  if (vista === "reglas") return <Reglas volver={() => setVista("home")} />;

  return (
    <div className="pantalla home">
      {/* Humo de taberna: tres jirones que suben lentos tras el contenido. */}
      <div className="humo-amb" aria-hidden="true">
        <i></i>
        <i></i>
        <i></i>
      </div>
      <div className="logo">
        <Emblema />
      </div>
      <h1 className="marca">
        La Asociación
        <span className="marca-fuerte">de Cachos</span>
      </h1>
      <p className="sub">El dudo de la casa, entre socios.</p>
      <div className="filete" />

      <div className="menu-modos">
        <button className="modo-card historia-card" onClick={() => setVista("historia")} aria-label="Modo Historia">
          <span className="tc-emblema hc-emblema" aria-hidden="true">
            <IconoCalavera tam={28} />
          </span>
          <span className="tc-texto">
            <span className="tc-kicker">Modo historia</span>
            <span className="tc-titulo">El Bajo Mundo</span>
            <span className="tc-sub">Recorre el hampa, mesa a mesa, hasta el trono</span>
          </span>
          <span className="tc-flecha" aria-hidden="true">›</span>
        </button>

        <button className="modo-card solo-card" onClick={() => setVista("solo")} aria-label="Jugar solo">
          <span className="tc-emblema solo-emblema" aria-hidden="true">
            <IconoDado tam={26} />
          </span>
          <span className="tc-texto">
            <span className="tc-kicker">A tu ritmo</span>
            <span className="tc-titulo">Jugar solo</span>
            <span className="tc-sub">Tú contra la banca, para afilar el ojo</span>
          </span>
          <span className="tc-flecha" aria-hidden="true">›</span>
        </button>

        <button className="modo-card online-card" onClick={() => setVista("online")} aria-label="Mesa en línea">
          <span className="tc-emblema online-emblema" aria-hidden="true">
            <IconoPersonas tam={26} />
          </span>
          <span className="tc-texto">
            <span className="tc-kicker">Con amigos</span>
            <span className="tc-titulo">Mesa en línea</span>
            <span className="tc-sub">Crea una sala e invita por WhatsApp</span>
          </span>
          <span className="tc-flecha" aria-hidden="true">›</span>
        </button>
      </div>

      <Palmares />

      <button className="btn-link" onClick={() => setVista("reglas")}>
        Reglas de la Asociación
      </button>
    </div>
  );
}

/** El palmarés del socio: sus récords, discretos al pie del salón. */
function Palmares() {
  const [p] = useState(() => leerPalmares());
  if (p.jugadas === 0) return null;
  return (
    <div className="palmares" aria-label="Tu palmarés">
      <span className="pal-dato">
        <b>{p.ganadas}</b> victorias <i>/ {p.jugadas} mesas</i>
      </span>
      {p.mejorRacha >= 2 && (
        <span className="pal-dato">
          racha <b>{p.mejorRacha}</b>
        </span>
      )}
      {p.finales.length > 0 && (
        <span className="pal-dato">
          finales <b>{p.finales.length}</b>
          <i>/3</i>
        </span>
      )}
    </div>
  );
}

const NOMBRES_BOT = ["El Tuerto", "La Sombra", "Doña Suerte", "El Croata", "Patas Negras"];

function ConfigSolo({ onListo, volver }: { onListo: (t: Transporte) => void; volver: () => void }) {
  const prefs = leerPrefs();
  const [nombre, setNombre] = useState(prefs.nombre ?? "Miembro");
  const [rivales, setRivales] = useState(prefs.rivales ?? 3);
  const [nivel, setNivel] = useState<NivelSolo>(prefs.nivel && prefs.nivel !== "brutal" ? prefs.nivel : "medio");

  const empezar = () => {
    desbloquearAudio(); // habilita el audio dentro del gesto del usuario
    const limpio = nombre.trim() || "Miembro";
    guardarPrefs({ nombre: limpio, rivales, nivel });
    const yo = { id: "humano", nombre: limpio };
    const bots = NOMBRES_BOT.slice(0, rivales).map((n, i) => ({ id: `bot${i}`, nombre: n }));
    onListo(new TransporteLocal([yo, ...bots], { humanoId: yo.id, nivel }));
  };

  return (
    <div className="pantalla config">
      <Cabecera titulo="Jugar solo" volver={volver} />
      <p className="ayuda">Tú contra la banca. Elige rivales y dificultad.</p>
      <CampoJugador nombre={nombre} setNombre={setNombre} />

      <div className="campo-label">Rivales de la máquina</div>
      <div className="stepper">
        <button onClick={() => setRivales((r) => Math.max(1, r - 1))} aria-label="menos">−</button>
        <span className="cantidad">{rivales}</span>
        <button onClick={() => setRivales((r) => Math.min(NOMBRES_BOT.length, r + 1))} aria-label="más">+</button>
      </div>

      <div className="campo-label">Dificultad</div>
      <div className="segmento">
        {(Object.keys(ETIQUETA_NIVEL) as NivelSolo[]).map((n) => (
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

function ConfigHistoria({ onListo, volver }: { onListo: (t: Transporte) => void; volver: () => void }) {
  const prefs = leerPrefs();
  const guardada = prefs.historia && !prefs.historia.completado ? prefs.historia : null;
  // Campaña coronada: se ofrece la Nueva Partida+ (Leyenda).
  const coronada = prefs.historia?.completado ? prefs.historia : null;
  const leyendaSiguiente = (coronada?.leyenda ?? 0) + 1;
  const [nombre, setNombre] = useState(prefs.nombre ?? guardada?.nombre ?? "Forastero");
  const [oficio, setOficio] = useState<OficioId>("relojero");
  const [cuaderno, setCuaderno] = useState(false);

  if (cuaderno) return <Cuaderno volver={() => setCuaderno(false)} />;

  const comenzar = (estado: ReturnType<typeof historiaNueva>) => {
    desbloquearAudio();
    guardarPrefs({ nombre: nombre.trim() || "Forastero" });
    onListo(new TransporteHistoria(estado));
  };

  return (
    <div className="pantalla config">
      <Cabecera titulo="Modo Historia" volver={volver} />
      <p className="ayuda">
        El bajo mundo del cacho chileno. Parte en las pocilgas del puerto y húndete hasta la cumbre,
        contra peces cada vez más gordos. Gana plata, sube tus atributos… y sobrevive.
      </p>
      <CampoJugador nombre={nombre} setNombre={setNombre} />

      <div className="campo-label">Tu oficio (para partidas nuevas)</div>
      <div className="oficios" role="radiogroup" aria-label="Oficio del tahur">
        {OFICIOS.map((o) => (
          <button
            key={o.id}
            className={"oficio-card" + (oficio === o.id ? " sel" : "")}
            role="radio"
            aria-checked={oficio === o.id}
            onClick={() => setOficio(o.id)}
          >
            <span className="of-glifo" aria-hidden="true">{o.glifo}</span>
            <span className="of-cuerpo">
              <span className="of-nombre">{o.nombre}</span>
              <span className="of-desc">{o.desc}</span>
            </span>
          </button>
        ))}
      </div>

      {guardada ? (
        <>
          <div className="hist-continuar">
            Vas por <b>{escenarioActual(normalizar(guardada)).nombre}</b> · ${guardada.plata.toLocaleString("es-CL")}
          </div>
          <button className="btn btn--apostar grande" onClick={() => comenzar(guardada)}>
            Continuar tu historia
          </button>
          <button className="btn-link" onClick={() => comenzar(historiaNueva(nombre, 0, oficio))}>
            Empezar de cero
          </button>
        </>
      ) : (
        <button className="btn btn--apostar grande" onClick={() => comenzar(historiaNueva(nombre, 0, oficio))}>
          Comenzar la aventura
        </button>
      )}
      {!guardada && coronada && (
        <>
          <div className="hist-continuar">
            Ya coronaste el cacho{(coronada.leyenda ?? 0) > 0 ? ` (Leyenda ${"I".repeat(Math.min(coronada.leyenda ?? 0, 3))})` : ""}.
            La Leyenda endurece a TODOS los rivales un escalón.
          </div>
          <button className="btn btn--apostar grande" onClick={() => comenzar(historiaNueva(nombre, leyendaSiguiente, oficio))}>
            Nueva Partida+ · Leyenda {"I".repeat(Math.min(leyendaSiguiente, 3))}
          </button>
        </>
      )}
      <button className="btn-link" onClick={() => setCuaderno(true)}>
        Cuaderno del Tahúr
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
        <h3>El paso</h3>
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
        <h3>La siciliana</h3>
        <p>
          Si dudas la <b>primera</b> apuesta de la ronda (la del que abrió) y esa apuesta pierde, el
          perdedor cae <b>2 dados</b> de una. En esa cuenta los <b>ases no son comodín</b>.{" "}
          <b>No aplica</b> en rondas de obligado.
        </p>
      </section>

      <section className="regla-bloque destacado">
        <h3>El obligado</h3>
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

function ConfigOnline({
  onListo,
  volver,
  codigoInicial = "",
}: {
  onListo: (t: Transporte) => void;
  volver: () => void;
  codigoInicial?: string;
}) {
  const [nombre, setNombre] = useState(leerPrefs().nombre ?? "");
  const [codigo, setCodigo] = useState(codigoInicial.toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const invitado = codigoInicial.trim().length >= 4;

  // Limpia el ?sala= de la URL una vez leído (para que un refresh no reabra esto).
  useEffect(() => {
    if (codigoInicial) limpiarURLSala();
  }, [codigoInicial]);

  if (!onlineConfigurado()) {
    return (
      <div className="pantalla config">
        <Cabecera titulo="Mesa en línea" volver={volver} />
        <p className="ayuda">
          Falta encender el servidor del juego. Define <code>VITE_BACKEND_URL</code> con la dirección
          de tu árbitro en Render (ver <code>RENDER.md</code>) y vuelve a cargar.
        </p>
      </div>
    );
  }

  const correr = async (accion: (t: Awaited<ReturnType<typeof crearTransporteOnline>>) => Promise<void>) => {
    setError(null);
    setCargando(true);
    let t: Awaited<ReturnType<typeof crearTransporteOnline>> | null = null;
    try {
      t = await crearTransporteOnline(); // carga la librería online bajo demanda
      await accion(t);
      guardarPrefs({ nombre: nombre.trim() });
      onListo(t);
    } catch (e) {
      t?.detener(); // cierra el socket para no dejar conexiones colgando
      setError(e instanceof Error ? e.message : "No se pudo conectar. Reintenta.");
      setCargando(false);
    }
  };

  return (
    <div className="pantalla config">
      <Cabecera titulo="Mesa en línea" volver={volver} />
      {invitado && (
        <p className="ayuda">
          Te invitaron a la sala <b>{codigo}</b>. Escribe tu nombre y entra.
        </p>
      )}
      <input
        value={nombre}
        placeholder="Tu nombre"
        aria-label="Tu nombre"
        autoComplete="nickname"
        maxLength={24}
        onChange={(e) => setNombre(e.target.value)}
      />
      {!invitado && (
        <>
          <button
            className="btn btn--apostar grande"
            disabled={!nombre.trim() || cargando}
            aria-busy={cargando}
            onClick={() => correr((t) => t.crearSala(nombre.trim()))}
          >
            {cargando ? "Conectando…" : "Crear sala"}
          </button>
          <div className="separador">o únete con una contraseña</div>
        </>
      )}
      <input
        value={codigo}
        placeholder="CONTRASEÑA"
        aria-label="Contraseña de la sala"
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={6}
        onChange={(e) => setCodigo(e.target.value.toUpperCase())}
      />
      <button
        className={(invitado ? "btn btn--apostar" : "btn btn--calzar") + " grande"}
        disabled={!nombre.trim() || codigo.length < 4 || cargando}
        aria-busy={cargando}
        onClick={() => correr((t) => t.unirse(codigo.trim(), nombre.trim()))}
      >
        {cargando ? "Conectando…" : "Unirse"}
      </button>
      {cargando && (
        <p className="ayuda" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          Conectando con el servidor. Si estaba dormido, puede tardar unos segundos…
        </p>
      )}
      {error && (
        <div className="hint" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
