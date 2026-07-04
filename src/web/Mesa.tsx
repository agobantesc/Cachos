import { useEffect, useRef, useState } from "react";
import type { EstadoPublico, EventoRonda, Pinta, ResolucionRonda, Sentido } from "../engine";
import { Dado, ManoDados } from "./Dado";
import { Avatar } from "./Avatar";
import { IconoDado, IconoSonido } from "./Iconos";
import { BarraAcciones } from "./BarraAcciones";
import { nombrarApuesta, PLURAL_PINTA } from "./util";
import { Sonidos, sonidoActivado, alternarSonido, vibrar } from "./sonido";
import { registrarPartida } from "./palmares";
import type { Instantanea, Transporte } from "./transporte";

/** true si el usuario pidió menos movimiento (se salta la agitada de dados). */
function prefiereQuieto(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * TU MANO, con la agitada del cacho: al empezar la ronda (o al re-tirar con
 * Suerte) los dados bailan caras al azar unos instantes y recién ahí se
 * asientan en la mano real. Es EL gesto del cacho — se juega agitando.
 */
function ManoAgitada({ caras, tam }: { caras: Pinta[]; tam?: number }) {
  const clave = caras.join(",");
  const [mostradas, setMostradas] = useState<Pinta[]>(caras);
  const [agitando, setAgitando] = useState(false);
  const clavePrev = useRef<string | null>(null);

  useEffect(() => {
    if (clavePrev.current === clave) return;
    clavePrev.current = clave;
    if (prefiereQuieto()) {
      setMostradas(caras);
      return;
    }
    setAgitando(true);
    const azar = () => caras.map(() => (1 + Math.floor(Math.random() * 6)) as Pinta);
    setMostradas(azar());
    const iv = setInterval(() => setMostradas(azar()), 85);
    const fin = setTimeout(() => {
      clearInterval(iv);
      setMostradas(caras);
      setAgitando(false);
    }, 560);
    return () => {
      clearInterval(iv);
      clearTimeout(fin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  return (
    <div className={"mano-dados" + (agitando ? " mano--agitando" : "")}>
      {(agitando ? mostradas : caras).map((c, i) => (
        <span key={i} className="dado-slot" style={agitando ? { animationDelay: `${i * 45}ms` } : undefined}>
          <Dado cara={c} {...(tam !== undefined ? { tam } : {})} />
        </span>
      ))}
    </div>
  );
}

export function Mesa({
  snap,
  transporte,
  salir,
}: {
  snap: Instantanea;
  transporte: Transporte;
  salir: () => void;
}) {
  const p = snap.publico!;
  const nombre = (id: string | null) => p.jugadores.find((j) => j.id === id)?.nombre ?? "—";
  const textoEvento = (e: EventoRonda) => (e.tipo === "PASO" ? "pasó" : nombrarApuesta(e.apuesta));
  const ultimoEventoDe = (id: string): EventoRonda | undefined => {
    for (let i = p.historialRonda.length - 1; i >= 0; i--) {
      if (p.historialRonda[i]!.jugadorId === id) return p.historialRonda[i];
    }
    return undefined;
  };
  const [sonando, setSonando] = useState(sonidoActivado());
  const abandonar = () => {
    if (typeof window === "undefined" || window.confirm("¿Abandonar la partida y volver al menú?")) {
      salir();
    }
  };

  // Sonido por evento: dados al empezar ronda; ganar/perder en la resolución.
  const finRegistrado = useRef(false);
  useEffect(() => {
    if (p.fase === "EN_RONDA") {
      finRegistrado.current = false; // mesa en curso (Mesa no se re-monta entre partidas)
      Sonidos.dados();
    } else if (p.fase === "FIN_RONDA" && p.ultimaResolucion) {
      if (p.ultimaResolucion.perdedorId === snap.miId) {
        Sonidos.perder();
        vibrar(70);
      } else {
        Sonidos.ganar();
      }
    } else if (p.fase === "FIN_JUEGO") {
      // Si ganó, suena la fanfarria; si perdió, ya sonó "perder" al ser
      // eliminado, así que no se repite.
      const gane = p.ganadorId === snap.miId;
      if (gane) {
        Sonidos.ganar();
        vibrar([25, 60, 45]);
      }
      // Palmarés: una vez por mesa, sólo con perspectiva fija (solitario/online).
      if (!finRegistrado.current && (snap.esSolo || !snap.esLocal)) {
        finRegistrado.current = true;
        registrarPartida(gane);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.fase, p.numeroRonda]);

  // Aviso de turno: campanilla cuando te toca a TI, y un golpecito suave cuando
  // juega un rival. Así no te pierdes tu turno —el dolor de jugar acompañado—.
  // Se dispara también al abrir una ronda nueva (aunque seas el mismo que jugó
  // último), comparando además el número de ronda: si no, abrir la ronda que
  // acabas de cerrar no sonaría.
  const turnoPrev = useRef<string | null>(p.turnoJugadorId);
  const rondaPrev = useRef<number>(p.numeroRonda);
  useEffect(() => {
    if (p.fase === "EN_RONDA") {
      const turno = p.turnoJugadorId;
      const nuevaRonda = p.numeroRonda !== rondaPrev.current;
      if (turno !== turnoPrev.current || nuevaRonda) {
        if (turno === snap.miId) {
          Sonidos.tuTurno();
          vibrar(30);
        } else if (!nuevaRonda && turnoPrev.current !== null) Sonidos.tic();
      }
      turnoPrev.current = turno;
    }
    rondaPrev.current = p.numeroRonda;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.turnoJugadorId, p.fase, p.numeroRonda]);

  const miTurno = p.fase === "EN_RONDA" && p.turnoJugadorId === snap.miId;

  if (p.fase === "FIN_JUEGO") {
    // Puesto: el ganador es 1º; el resto según el orden de eliminación inverso
    // (el último en caer es 2º, el primero en caer va último).
    const totalEliminados = p.ordenEliminacion.length;
    const puestoDe = (id: string) => {
      if (id === p.ganadorId) return 1;
      const idx = p.ordenEliminacion.indexOf(id);
      return idx === -1 ? 1 : totalEliminados + 1 - idx;
    };
    const ranking = [...p.jugadores].sort((a, b) => puestoDe(a.id) - puestoDe(b.id));
    const gane = p.ganadorId === snap.miId;

    return (
      <div className="mesa fin">
        <div className="fin-sello">
          <span className="fin-kicker">La Asociación de Cachos</span>
          <h1 className="fin-titulo">{gane ? "Ganaste la mesa" : `Ganó ${nombre(p.ganadorId)}`}</h1>
        </div>
        <ol className="resultados">
          {ranking.map((j) => {
            const puesto = puestoDe(j.id);
            const soyYo = j.id === snap.miId;
            return (
              <li
                key={j.id}
                className={
                  "resultado" +
                  (puesto === 1 ? " resultado--campeon" : "") +
                  (soyYo ? " resultado--yo" : "")
                }
              >
                <span className="res-puesto">{puesto}.º</span>
                <div className="res-info">
                  <div className="res-nombre">
                    {j.nombre}
                    {soyYo && <span className="yo"> (tú)</span>}
                    {j.yaJugoObligado && <span className="res-tag">obligó</span>}
                  </div>
                  <div className="res-estado">
                    {puesto === 1
                      ? `Campeón · ${j.cantidadDados} ${j.cantidadDados === 1 ? "dado" : "dados"} en pie`
                      : `Eliminado en la ronda ${j.eliminadoEnRonda}`}
                  </div>
                </div>
                <div className="res-stats">
                  <span className="res-stat" title="Dados perdidos">
                    {j.stats.dadosPerdidos} <i>perdidos</i>
                  </span>
                  {j.stats.calzosAcertados > 0 && (
                    <span className="res-stat" title="Calzos acertados">
                      {j.stats.calzosAcertados} <i>calzos</i>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <button className="btn btn--apostar grande" onClick={salir}>
          Volver al menú
        </button>
      </div>
    );
  }

  return (
    <div className={"mesa" + (miTurno ? " mesa--mi-turno" : "")}>
      {snap.historia && snap.historia.faseHistoria === "mesa" && (
        <div className="historia-hud">
          <span className="hh-rival">
            {snap.historia.rival.esBoss && <span className="hh-boss">JEFE</span>}
            {snap.historia.rival.nombre}
            {snap.historia.desafio && (
              <span className="hh-desafio" title={snap.historia.desafio.desc}>
                {snap.historia.desafio.nombre}
              </span>
            )}
          </span>
          {p.fase === "EN_RONDA" && (
            <div className="hh-poderes">
              {snap.historia.suerteDisponible > 0 && (
                <button className="hh-chip hh-suerte" onClick={() => transporte.historiaSuerte?.()} title="Re-tira tu mano">
                  <IconoDado /> Suerte ({snap.historia.suerteDisponible})
                </button>
              )}
              {snap.historia.itemsEnMano.map((it) => (
                <button
                  key={it.id}
                  className="hh-chip hh-item"
                  onClick={() => transporte.historiaUsarItem?.(it.id)}
                  title={it.desc}
                >
                  {it.corto} ({it.cantidad})
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <header className="mesa-top">
        <span className="ronda">Ronda {p.numeroRonda}</span>
        {p.esRondaObligado && <span className="badge badge--obligado">OBLIGADO</span>}
        {p.esRondaCerrada && <span className="badge badge--cerrada">CERRADA · a ciegas</span>}
        <span className="badge">{p.sentido === 1 ? "derecha →" : "← izquierda"}</span>
        <span className="dados-mesa">{p.totalDadosEnMesa} dados</span>
        <button
          className="mute"
          onClick={() => setSonando(alternarSonido())}
          aria-label={sonando ? "Silenciar" : "Activar sonido"}
        >
          <IconoSonido activo={sonando} />
        </button>
        <button className="salir-mesa" onClick={abandonar}>
          Salir
        </button>
      </header>

      {(p.fase === "EN_RONDA" || p.fase === "FIN_RONDA") && (
        <div className={"turno-barra" + (miTurno ? " turno-barra--yo" : "")} aria-live="polite">
          {miTurno ? (
            <>
              <span className="tb-flecha" aria-hidden="true">▸</span> Tu turno
            </>
          ) : (
            <>
              Juega <b>{nombre(p.turnoJugadorId)}</b>
              <span className="puntos-vivos" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </span>
            </>
          )}
        </div>
      )}

      <section className="vasos">
        {p.ordenAsientos.map((id) => {
          const j = p.jugadores.find((x) => x.id === id)!;
          const esTurno = p.turnoJugadorId === id && p.fase === "EN_RONDA";
          const ev = ultimoEventoDe(id);
          return (
            <div
              key={id}
              className={
                "vaso" +
                (esTurno ? " vaso--turno" : "") +
                (esTurno && id === snap.miId ? " vaso--mi-turno" : "") +
                (j.eliminado ? " vaso--out" : "")
              }
            >
              {esTurno && <span className="vaso-turno" aria-hidden="true">juega</span>}
              <div className="vaso-cara">
                <Avatar id={id} nombre={j.nombre} tam={30} anillo={id === snap.miId} />
              </div>
              <div className="vaso-nombre">
                {j.nombre} {id === snap.miId && <span className="yo">(tú)</span>}
              </div>
              <div className="vaso-conteo">
                {j.eliminado ? (
                  <span className="out">fuera</span>
                ) : (
                  <>
                    <IconoDado /> <b>{j.cantidadDados}</b>
                  </>
                )}
              </div>
              {ev && !esTurno && (
                <div className={"burbuja" + (ev.tipo === "PASO" ? " burbuja--paso" : "")}>{textoEvento(ev)}</div>
              )}
            </div>
          );
        })}
      </section>

      {p.historialRonda.length > 0 && (
        <section className="bitacora" aria-label="Lo que dijo cada jugador esta ronda">
          {p.historialRonda.map((e, i) => (
            <span key={i} className={"globo" + (e.jugadorId === snap.miId ? " globo--yo" : "")}>
              <b>{nombre(e.jugadorId)}</b> {textoEvento(e)}
            </span>
          ))}
        </section>
      )}

      <section className="centro">
        {p.apuestaActual ? (
          <div className="apuesta-grande">
            <span className="quien">{nombre(p.apuestaActualJugadorId)} apostó</span>
            {/* key: al cambiar la apuesta, el texto entra con un "pop" */}
            <strong key={`${p.apuestaActual.cantidad}-${p.apuestaActual.pinta}`} className="apuesta-pop">
              {nombrarApuesta(p.apuestaActual)}
            </strong>
          </div>
        ) : (
          <div className="apuesta-grande">
            <strong>Abre {nombre(p.abridorRondaId)}</strong>
          </div>
        )}
      </section>

      <section className="mi-mano">
        <div className="mi-mano-titulo">Tu mano</div>
        {snap.miMano ? (
          <ManoAgitada caras={snap.miMano} tam={46} />
        ) : (
          <div className="a-ciegas">A ciegas · ronda cerrada</div>
        )}
      </section>

      {p.fase === "EN_RONDA" && (
        <BarraAcciones
          publico={p}
          miId={snap.miId}
          miMano={snap.miMano}
          ojo={snap.historia?.ojo ?? 0}
          colmillo={snap.historia?.colmillo ?? 0}
          transporte={transporte}
        />
      )}

      {p.fase === "FIN_RONDA" && p.ultimaResolucion && (
        <Revelacion res={p.ultimaResolucion} publico={p} snap={snap} transporte={transporte} />
      )}
    </div>
  );
}

function Revelacion({
  res,
  publico,
  snap,
  transporte,
}: {
  res: ResolucionRonda;
  publico: EstadoPublico;
  snap: Instantanea;
  transporte: Transporte;
}) {
  const nombre = (id: string | null) => publico.jugadores.find((j) => j.id === id)?.nombre ?? "—";
  const esPaso = res.tipo === "PASO";
  const esMatch = (c: Pinta) => c === res.pinta || (res.asesComoComodin && res.pinta !== 1 && c === 1);
  const cuenta = (caras: Pinta[]) => caras.filter(esMatch).length;

  // Redoble + háptica al destaparse los vasos (una vez por revelación).
  useEffect(() => {
    Sonidos.revelar();
    vibrar([12, 50, 12]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const razonPaso = (caras: Pinta[]): string => {
    const m = new Map<number, number>();
    caras.forEach((c) => m.set(c, (m.get(c) ?? 0) + 1));
    const g = [...m.values()].sort((a, b) => a - b);
    if (g.length === 1) return "Cinco iguales: paso válido.";
    if (g.length === 5) return "Cinco caras distintas: paso válido.";
    if (g.length === 2 && g[0] === 2) return "Full (tres y dos): paso válido.";
    return "No formó mano de paso.";
  };

  const texto = esPaso
    ? `${nombre(res.pasadorId ?? null)} pasó. El paso ${res.pasoEraValido ? "estaba validado" : "no estaba validado"}: ${nombre(res.perdedorId)} pierde un dado.`
    : res.tipo === "CALZO"
      ? res.perdedorId === null
        ? `¡${nombre(res.calzadorId ?? null)} calzó! Había justo ${res.cantidadReal} ${PLURAL_PINTA[res.pinta]}.${res.ganadorDadoId ? " Recupera un dado." : " (ya estaba al máximo de dados)."}`
        : `Calzo fallido: ${nombre(res.calzadorId ?? res.perdedorId)} dijo ${res.cantidadDeclarada} pero había ${res.cantidadReal}. Pierde un dado.`
      : `Se dudó ${res.cantidadDeclarada} ${PLURAL_PINTA[res.pinta]}: había ${res.cantidadReal}. ${nombre(res.perdedorId)} pierde ${res.dadosPerdidos} dado${res.dadosPerdidos > 1 ? "s" : ""}.`;

  const soyAbridor = snap.miId === publico.abridorRondaId;
  const humanoFuera = snap.esSolo && (publico.jugadores.find((j) => j.id === snap.miId)?.eliminado ?? false);
  const iniciar = (sentido: Sentido) => transporte.siguienteRonda(sentido);

  return (
    <div className="revelacion">
      <div className="revelacion-caja">
        <h2>{esPaso ? "Paso dudado" : "Revelación"}</h2>
        <p className="resultado">{texto}</p>
        {res.siciliana && <p className="siciliana">¡La siciliana! (−2 dados, ases no cuentan)</p>}
        {esPaso && res.pasadorId && (
          <p className="siciliana">{razonPaso(res.dadosRevelados[res.pasadorId] ?? [])}</p>
        )}
        <div className="reveal-grid">
          {Object.entries(res.dadosRevelados).map(([id, caras], fila) => (
            <div
              key={id}
              className={"reveal-fila" + (id === res.perdedorId ? " reveal-fila--perdedor" : "")}
              style={{ animationDelay: `${fila * 110}ms` }}
            >
              <span className="reveal-nombre">
                {nombre(id)}
                {id === snap.miId && <span className="yo"> (tú)</span>}
              </span>
              <div className="reveal-dados">
                {caras.map((c, i) => (
                  // Los dados que cuentan para la apuesta brillan; el resto se apaga.
                  <span key={i} className={esPaso ? "" : esMatch(c) ? "dado-cuenta" : "dado-fuera"}>
                    <Dado cara={c} tam={30} />
                  </span>
                ))}
              </div>
              {!esPaso && (
                <span className={"reveal-cuenta" + (cuenta(caras) > 0 ? " reveal-cuenta--con" : "")}>
                  cuenta {cuenta(caras)}
                </span>
              )}
            </div>
          ))}
        </div>
        {humanoFuera ? (
          <div className="siguiente">
            <span>Quedaste fuera de la mesa.</span>
            <button className="btn btn--apostar grande" onClick={() => transporte.terminarSolo()}>
              "Ver resultado final"
            </button>
          </div>
        ) : soyAbridor ? (
          <div className="siguiente">
            <span>Abres tú. ¿Hacia dónde?</span>
            <div className="botonera">
              <button className="btn btn--apostar" onClick={() => iniciar(-1)}>
                ← izquierda
              </button>
              <button className="btn btn--apostar" onClick={() => iniciar(1)}>
                derecha →
              </button>
            </div>
          </div>
        ) : snap.esSolo ? (
          <div className="siguiente">
            <span>Abre {nombre(publico.abridorRondaId)}.</span>
            <button className="btn btn--apostar grande" onClick={() => transporte.siguienteRonda()}>
              Continuar
            </button>
          </div>
        ) : (
          <p className="siguiente">Abre {nombre(publico.abridorRondaId)}…</p>
        )}
      </div>
    </div>
  );
}
