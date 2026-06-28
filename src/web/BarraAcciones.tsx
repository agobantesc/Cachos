import { useMemo, useState } from "react";
import { contarPinta, validarApuesta, type Apuesta, type EstadoPublico, type Pinta } from "../engine";
import { nombrarApuesta, PINTAS, PLURAL_PINTA, SINGULAR_PINTA } from "./util";
import { Sonidos } from "./sonido";
import type { Transporte } from "./transporte";

// Cola binomial P(X >= kmin) para la pista "Colmillo".
function combinaciones(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
function colaMayorIgual(n: number, kmin: number, p: number): number {
  if (kmin <= 0) return 1;
  let s = 0;
  for (let k = kmin; k <= n; k++) s += combinaciones(n, k) * p ** k * (1 - p) ** (n - k);
  return s;
}

/** Apertura sugerida: la pinta que más tienes (con su cantidad), para no abrir
 *  con "1 tonto" —la apuesta más débil, que invita a la siciliana—. */
function aperturaSugerida(mano: Pinta[] | null, asesComodin: boolean): Apuesta {
  if (!mano || mano.length === 0) return { cantidad: 1, pinta: 5 };
  let mejor: Pinta = 5;
  let mejorN = 0;
  for (const p of PINTAS) {
    const n = contarPinta(mano, p, asesComodin);
    if (n > mejorN) {
      mejorN = n;
      mejor = p;
    }
  }
  return { cantidad: Math.max(1, mejorN), pinta: mejor };
}

export function BarraAcciones({
  publico,
  miId,
  miMano,
  ojo = 0,
  colmillo = 0,
  transporte,
}: {
  publico: EstadoPublico;
  miId: string;
  miMano: Pinta[] | null;
  /** Modo historia: atributo "Ojo del tahúr" (0 = sin pista de apuesta). */
  ojo?: number;
  /** Modo historia: atributo "Colmillo" (0 = sin pista de mentira). */
  colmillo?: number;
  transporte: Transporte;
}) {
  const esMiTurno = publico.fase === "EN_RONDA" && publico.turnoJugadorId === miId;
  const misDados = publico.jugadores.find((j) => j.id === miId)?.cantidadDados ?? 0;

  // En obligado, con 2+ dados no se puede cambiar la pinta (sólo subir cantidad).
  const pintaBloqueada =
    publico.esRondaObligado && misDados > 1 && publico.apuestaActual !== null
      ? publico.apuestaActual.pinta
      : null;

  const inicial: Apuesta = publico.apuestaActual
    ? { cantidad: publico.apuestaActual.cantidad + 1, pinta: publico.apuestaActual.pinta }
    : aperturaSugerida(miMano, publico.asesComodin);
  const [propuesta, setPropuesta] = useState<Apuesta>(inicial);

  // Si cambia la apuesta vigente, re-sembramos la propuesta.
  const claveApuesta = publico.apuestaActual ? `${publico.apuestaActual.cantidad}-${publico.apuestaActual.pinta}` : "abre";
  const [clavePrev, setClavePrev] = useState(claveApuesta);
  if (clavePrev !== claveApuesta) {
    setClavePrev(claveApuesta);
    setPropuesta(inicial);
  }

  const validez = useMemo(
    () => validarApuesta(publico.apuestaActual, propuesta, publico.asesComodinApuesta),
    [publico.apuestaActual, propuesta, publico.asesComodinApuesta],
  );
  const rompeObligado = pintaBloqueada !== null && propuesta.pinta !== pintaBloqueada;
  const apuestaOk = validez.valida && !rompeObligado;

  const puedeDudar = publico.apuestaActual !== null;
  const puedeCalzar = publico.calzoDisponible && !(publico.esRondaObligado && misDados > 1);

  // Paso: con los 5 dados se puede pasar; pero NO como abridor (debes abrir con
  // una apuesta). Si hay un paso pendiente, sólo cabe dudar el paso o subir.
  const hayPaso = publico.pasoPendienteJugadorId !== null;
  const nombrePasador =
    publico.jugadores.find((j) => j.id === publico.pasoPendienteJugadorId)?.nombre ?? "Alguien";
  const yaPase = publico.historialRonda.some((ev) => ev.tipo === "PASO" && ev.jugadorId === miId);
  const puedoPasar =
    !hayPaso &&
    !yaPase &&
    !publico.esRondaObligado &&
    publico.apuestaActual !== null &&
    misDados === publico.dadosIniciales;

  if (!esMiTurno) {
    return (
      <div className="acciones acciones--espera" aria-live="polite">
        Esperando a <b>{publico.jugadores.find((j) => j.id === publico.turnoJugadorId)?.nombre ?? "…"}</b>
        <span className="puntos-vivos" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </span>
      </div>
    );
  }

  const setCantidad = (d: number) => setPropuesta((p) => ({ ...p, cantidad: Math.max(1, p.cantidad + d) }));
  const setPinta = (pinta: Pinta) => setPropuesta((p) => ({ ...p, pinta }));

  // "Ojo del tahúr" (modo historia): cuántos dados de la pinta elegida se esperan.
  let pistaOjo: string | null = null;
  if (ojo > 0 && miMano) {
    const propios = contarPinta(miMano, propuesta.pinta, publico.asesComodin);
    const desconocidos = Math.max(0, publico.totalDadosEnMesa - miMano.length);
    const prob = publico.asesComodin && propuesta.pinta !== 1 ? 1 / 3 : 1 / 6;
    const esperado = propios + desconocidos * prob;
    pistaOjo = `≈ ${esperado.toFixed(1)} ${PLURAL_PINTA[propuesta.pinta]} en la mesa`;
  }

  // "Colmillo" (modo historia): probabilidad de que la apuesta vigente sea mentira.
  let pistaColmillo: string | null = null;
  if (colmillo > 0 && miMano && publico.apuestaActual) {
    const a = publico.apuestaActual;
    const propios = contarPinta(miMano, a.pinta, publico.asesComodin);
    const desconocidos = Math.max(0, publico.totalDadosEnMesa - miMano.length);
    const prob = publico.asesComodin && a.pinta !== 1 ? 1 / 3 : 1 / 6;
    const pSostiene = colaMayorIgual(desconocidos, a.cantidad - propios, prob);
    pistaColmillo = `Probabilidad de mentira: ${Math.round((1 - pSostiene) * 100)}%`;
  }

  const botonApostar = (
    <button
      className="btn btn--apostar grande"
      disabled={!apuestaOk}
      onClick={() => {
        Sonidos.apostar();
        void transporte.apostar(propuesta);
      }}
    >
      Apostar {nombrarApuesta(propuesta)}
    </button>
  );

  return (
    <div className="acciones">
      {hayPaso && (
        <div className="aviso-paso" role="status">
          <b>{nombrePasador}</b> pasó. Dúdale el paso o sube la apuesta.
        </div>
      )}

      <div className="constructor">
        <div className="stepper" role="group" aria-label="Cantidad de dados">
          <button onClick={() => setCantidad(-1)} aria-label="Menos cantidad">−</button>
          <span className="cantidad" aria-live="polite">{propuesta.cantidad}</span>
          <button onClick={() => setCantidad(1)} aria-label="Más cantidad">+</button>
        </div>
        <div className="pintas" role="group" aria-label="Pinta">
          {PINTAS.map((p) => {
            const bloq = pintaBloqueada !== null && p !== pintaBloqueada;
            return (
              <button
                key={p}
                disabled={bloq}
                aria-pressed={propuesta.pinta === p}
                className={"pinta-btn" + (propuesta.pinta === p ? " sel" : "") + (p === 1 ? " as" : "")}
                onClick={() => setPinta(p)}
              >
                {SINGULAR_PINTA[p]}
              </button>
            );
          })}
        </div>
      </div>

      {pistaOjo && <div className="ojo-pista" aria-live="polite">Ojo del tahúr · {pistaOjo}</div>}
      {pistaColmillo && <div className="ojo-pista colmillo-pista" aria-live="polite">Colmillo · {pistaColmillo}</div>}

      {hayPaso ? (
        <>
          {botonApostar}
          <button
            className="btn btn--dudar grande"
            onClick={() => {
              Sonidos.dudar();
              void transporte.dudarPaso();
            }}
          >
            Dudar el paso
          </button>
        </>
      ) : (
        <>
          {botonApostar}
          <div className="botonera">
            <button
              className="btn btn--dudar"
              disabled={!puedeDudar}
              onClick={() => {
                Sonidos.dudar();
                void transporte.dudar();
              }}
            >
              Dudo
            </button>
            <button
              className="btn btn--calzar"
              disabled={!puedeCalzar}
              onClick={() => {
                Sonidos.calzar();
                void transporte.calzar();
              }}
            >
              Calzo
            </button>
          </div>
          {puedoPasar && (
            <button
              className="btn btn--pasar"
              onClick={() => {
                Sonidos.pasar();
                void transporte.pasar();
              }}
            >
              Pasar <span className="btn-sub">(con tus 5 dados)</span>
            </button>
          )}
        </>
      )}

      {!apuestaOk && (
        <div className="hint" role="alert">
          {rompeObligado ? "Obligado: con 2+ dados no puedes cambiar la pinta." : validez.motivo}
        </div>
      )}
    </div>
  );
}
