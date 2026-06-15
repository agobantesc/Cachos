import { useEffect, useState } from "react";
import type { EstadoPublico, EventoRonda, Pinta, ResolucionRonda, Sentido } from "../engine";
import { Dado, ManoDados } from "./Dado";
import { IconoDado, IconoSonido } from "./Iconos";
import { BarraAcciones } from "./BarraAcciones";
import { nombrarApuesta, PLURAL_PINTA } from "./util";
import { Sonidos, sonidoActivado, alternarSonido } from "./sonido";
import type { Instantanea, Transporte } from "./transporte";

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
  useEffect(() => {
    if (p.fase === "EN_RONDA") {
      Sonidos.dados();
    } else if (p.fase === "FIN_RONDA" && p.ultimaResolucion) {
      if (p.ultimaResolucion.perdedorId === snap.miId) Sonidos.perder();
      else Sonidos.ganar();
    } else if (p.fase === "FIN_JUEGO") {
      if (p.ganadorId === snap.miId) Sonidos.ganar();
      else Sonidos.perder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.fase, p.numeroRonda]);

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
    <div className="mesa">
      <header className="mesa-top">
        <span className="ronda">Ronda {p.numeroRonda}</span>
        {p.esRondaObligado && <span className="badge badge--obligado">OBLIGADO</span>}
        {p.esRondaCerrada && <span className="badge badge--cerrada">CERRADA · a ciegas</span>}
        <span className="badge">{p.sentido === 1 ? "→ izquierda" : "← derecha"}</span>
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

      <section className="vasos">
        {p.ordenAsientos.map((id) => {
          const j = p.jugadores.find((x) => x.id === id)!;
          const esTurno = p.turnoJugadorId === id && p.fase === "EN_RONDA";
          const ev = ultimoEventoDe(id);
          return (
            <div key={id} className={"vaso" + (esTurno ? " vaso--turno" : "") + (j.eliminado ? " vaso--out" : "")}>
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
              {ev && <div className={"burbuja" + (ev.tipo === "PASO" ? " burbuja--paso" : "")}>{textoEvento(ev)}</div>}
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
            <strong>{nombrarApuesta(p.apuestaActual)}</strong>
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
          <ManoDados caras={snap.miMano} tam={46} />
        ) : (
          <div className="a-ciegas">A ciegas · ronda cerrada</div>
        )}
      </section>

      {p.fase === "EN_RONDA" && <BarraAcciones publico={p} miId={snap.miId} transporte={transporte} />}

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
  const cuenta = (caras: Pinta[]) =>
    caras.filter((c) => c === res.pinta || (res.asesComoComodin && res.pinta !== 1 && c === 1)).length;

  const razonPaso = (caras: Pinta[]): string => {
    const m = new Map<number, number>();
    caras.forEach((c) => m.set(c, (m.get(c) ?? 0) + 1));
    const g = [...m.values()].sort((a, b) => a - b);
    if (g.length === 1) return "Cinco iguales: paso válido.";
    if (g.length === 5) return "Escalera (todas distintas): paso válido.";
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
          {Object.entries(res.dadosRevelados).map(([id, caras]) => (
            <div key={id} className="reveal-fila">
              <span className="reveal-nombre">{nombre(id)}</span>
              <div className="reveal-dados">
                {caras.map((c, i) => (
                  <Dado key={i} cara={c} tam={30} />
                ))}
              </div>
              {!esPaso && <span className="reveal-cuenta">cuenta {cuenta(caras)}</span>}
            </div>
          ))}
        </div>
        {humanoFuera ? (
          <div className="siguiente">
            <span>Quedaste fuera de la mesa.</span>
            <button className="btn btn--apostar grande" onClick={() => transporte.terminarSolo()}>
              Ver resultado final
            </button>
          </div>
        ) : soyAbridor ? (
          <div className="siguiente">
            <span>Abres tú. ¿Hacia dónde?</span>
            <div className="botonera">
              <button className="btn btn--apostar" onClick={() => iniciar(1)}>
                Jugar → izquierda
              </button>
              <button className="btn btn--apostar" onClick={() => iniciar(-1)}>
                ← derecha
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
