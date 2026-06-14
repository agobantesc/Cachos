import { useMemo, useState } from "react";
import { validarApuesta, type Apuesta, type EstadoPublico, type Pinta } from "../engine";
import { nombrarApuesta, PINTAS, SINGULAR_PINTA } from "./util";
import type { Transporte } from "./transporte";

export function BarraAcciones({
  publico,
  miId,
  transporte,
}: {
  publico: EstadoPublico;
  miId: string;
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
    : { cantidad: 1, pinta: 2 };
  const [propuesta, setPropuesta] = useState<Apuesta>(inicial);

  // Si cambia la apuesta vigente, re-sembramos la propuesta.
  const claveApuesta = publico.apuestaActual ? `${publico.apuestaActual.cantidad}-${publico.apuestaActual.pinta}` : "abre";
  const [clavePrev, setClavePrev] = useState(claveApuesta);
  if (clavePrev !== claveApuesta) {
    setClavePrev(claveApuesta);
    setPropuesta(inicial);
  }

  const validez = useMemo(() => validarApuesta(publico.apuestaActual, propuesta), [publico.apuestaActual, propuesta]);
  const rompeObligado = pintaBloqueada !== null && propuesta.pinta !== pintaBloqueada;
  const apuestaOk = validez.valida && !rompeObligado;

  const puedeDudar = publico.apuestaActual !== null;
  const puedeCalzar = publico.calzoDisponible && !(publico.esRondaObligado && misDados > 1);

  if (!esMiTurno) {
    return (
      <div className="acciones acciones--espera">
        Esperando a <b>{publico.jugadores.find((j) => j.id === publico.turnoJugadorId)?.nombre ?? "…"}</b>
      </div>
    );
  }

  const setCantidad = (d: number) => setPropuesta((p) => ({ ...p, cantidad: Math.max(1, p.cantidad + d) }));
  const setPinta = (pinta: Pinta) => setPropuesta((p) => ({ ...p, pinta }));

  return (
    <div className="acciones">
      <div className="constructor">
        <div className="stepper">
          <button onClick={() => setCantidad(-1)} aria-label="menos">−</button>
          <span className="cantidad">{propuesta.cantidad}</span>
          <button onClick={() => setCantidad(1)} aria-label="más">+</button>
        </div>
        <div className="pintas">
          {PINTAS.map((p) => {
            const bloq = pintaBloqueada !== null && p !== pintaBloqueada;
            return (
              <button
                key={p}
                disabled={bloq}
                className={"pinta-btn" + (propuesta.pinta === p ? " sel" : "") + (p === 1 ? " as" : "")}
                onClick={() => setPinta(p)}
              >
                {SINGULAR_PINTA[p]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="botonera">
        <button className="btn btn--apostar" disabled={!apuestaOk} onClick={() => transporte.apostar(propuesta)}>
          Apostar {nombrarApuesta(propuesta)}
        </button>
        <button className="btn btn--dudar" disabled={!puedeDudar} onClick={() => transporte.dudar()}>
          Dudo
        </button>
        <button className="btn btn--calzar" disabled={!puedeCalzar} onClick={() => transporte.calzar()}>
          Calzo
        </button>
      </div>

      {!apuestaOk && (
        <div className="hint">{rompeObligado ? "Obligado: con 2+ dados no puedes cambiar la pinta." : validez.motivo}</div>
      )}
    </div>
  );
}
