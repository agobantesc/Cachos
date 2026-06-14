import type { EstadoPublico, Pinta, ResolucionRonda, Sentido } from "../engine";
import { Dado, DadoOculto, ManoDados } from "./Dado";
import { BarraAcciones } from "./BarraAcciones";
import { nombrarApuesta, PLURAL_PINTA } from "./util";
import type { Instantanea, Transporte } from "./transporte";

export function Mesa({ snap, transporte }: { snap: Instantanea; transporte: Transporte }) {
  const p = snap.publico!;
  const nombre = (id: string | null) => p.jugadores.find((j) => j.id === id)?.nombre ?? "—";

  if (p.fase === "FIN_JUEGO") {
    return (
      <div className="mesa fin">
        <h1>🏆 ¡Ganó {nombre(p.ganadorId)}!</h1>
        <button className="btn btn--apostar" onClick={() => location.reload()}>
          Nueva partida
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
      </header>

      <section className="vasos">
        {p.ordenAsientos.map((id) => {
          const j = p.jugadores.find((x) => x.id === id)!;
          const esTurno = p.turnoJugadorId === id && p.fase === "EN_RONDA";
          const esApostador = p.apuestaActualJugadorId === id;
          return (
            <div key={id} className={"vaso" + (esTurno ? " vaso--turno" : "") + (j.eliminado ? " vaso--out" : "")}>
              <div className="vaso-nombre">
                {j.nombre} {id === snap.miId && <span className="yo">(tú)</span>}
              </div>
              <div className="vaso-dados">
                {j.eliminado ? <span className="out">eliminado</span> : Array.from({ length: j.cantidadDados }, (_, i) => <DadoOculto key={i} />)}
              </div>
              {esApostador && p.apuestaActual && <div className="burbuja">{nombrarApuesta(p.apuestaActual)}</div>}
            </div>
          );
        })}
      </section>

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
          <ManoDados caras={snap.miMano} tam={56} />
        ) : (
          <div className="a-ciegas">🥤 A ciegas (ronda cerrada)</div>
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
  const cuenta = (caras: Pinta[]) =>
    caras.filter((c) => c === res.pinta || (res.asesComoComodin && res.pinta !== 1 && c === 1)).length;

  const texto =
    res.tipo === "CALZO" && res.ganadorDadoId
      ? `¡Calzó! Había exactamente ${res.cantidadReal} ${PLURAL_PINTA[res.pinta]}. ${nombre(res.ganadorDadoId)} recupera un dado.`
      : res.tipo === "CALZO"
        ? `Calzo fallido: había ${res.cantidadReal}, no ${res.cantidadDeclarada}. ${nombre(res.perdedorId)} pierde un dado.`
        : `Se dudó ${res.cantidadDeclarada} ${PLURAL_PINTA[res.pinta]}: había ${res.cantidadReal}. ${nombre(res.perdedorId)} pierde ${res.dadosPerdidos} dado${res.dadosPerdidos > 1 ? "s" : ""}.`;

  const soyAbridor = snap.miId === publico.abridorRondaId;
  const iniciar = (sentido: Sentido) => transporte.siguienteRonda(sentido);

  return (
    <div className="revelacion">
      <div className="revelacion-caja">
        <h2>Revelación</h2>
        <p className="resultado">{texto}</p>
        {res.siciliana && <p className="siciliana">¡La siciliana! (−2 dados, ases no cuentan)</p>}
        <div className="reveal-grid">
          {Object.entries(res.dadosRevelados).map(([id, caras]) => (
            <div key={id} className="reveal-fila">
              <span className="reveal-nombre">{nombre(id)}</span>
              <div className="reveal-dados">
                {caras.map((c, i) => (
                  <Dado key={i} cara={c} tam={30} />
                ))}
              </div>
              <span className="reveal-cuenta">cuenta {cuenta(caras)}</span>
            </div>
          ))}
        </div>
        {soyAbridor ? (
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
        ) : (
          <p className="siguiente">Abre {nombre(publico.abridorRondaId)}…</p>
        )}
      </div>
    </div>
  );
}
