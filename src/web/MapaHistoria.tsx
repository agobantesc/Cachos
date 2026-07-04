// Vista cenital (tipo RPG) del barrio en el MODO HISTORIA. El jugador camina
// con el pad (o las flechas / WASD del teclado) entre las mesas: reta a los
// parroquianos en el orden que quiera, entra a la tienda, se topa con los
// eventos de calle y, al vencer a todos, cruza la puerta del jefe.
import { useEffect } from "react";
import { Avatar } from "./Avatar";
import type { EntidadVista, ExplorarVista } from "./historia";
import type { Instantanea, Transporte } from "./transporte";

const TILE = 32; // px por casilla

const TECLAS: Record<string, string> = {
  ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izquierda", ArrowRight: "derecha",
  w: "arriba", s: "abajo", a: "izquierda", d: "derecha",
  W: "arriba", S: "abajo", A: "izquierda", D: "derecha",
};

function glifoDe(e: EntidadVista): string {
  if (e.tipo === "tienda") return "$";
  if (e.tipo === "evento") return e.estado === "resuelto" ? "·" : "?";
  if (e.tipo === "premio") return e.estado === "resuelto" ? "·" : "★";
  if (e.tipo === "letrero") return "!";
  if (e.tipo === "puerta") return e.estado === "abierto" ? "" : "✕";
  return "";
}

function Token({ e, onTap }: { e: EntidadVista; onTap: () => void }) {
  const clase =
    "tok tok--" +
    e.tipo +
    (e.tipo === "rival" && e.esBoss ? " tok--boss" : "") +
    (e.estado === "derrotado" || e.estado === "resuelto" ? " tok--apagado" : "") +
    (e.tipo === "puerta" ? (e.estado === "abierto" ? " tok--abierta" : " tok--cerrada") : "") +
    (e.estado === "bloqueado" && e.tipo !== "puerta" ? " tok--bloqueado" : "");
  const style = { left: e.x * TILE, top: e.y * TILE, width: TILE, height: TILE };
  const label =
    e.tipo === "rival" ? (e.esBoss ? "Jefe " : "") + (e.rivalNombre ?? "rival") :
    e.tipo === "tienda" ? "Tienda" :
    e.tipo === "evento" ? "Algo pasa aquí" :
    e.tipo === "premio" ? "Botín" :
    e.tipo === "puerta" ? "Puerta del jefe" : "Letrero";

  return (
    <button className={clase} style={style} onClick={onTap} aria-label={label}>
      {e.tipo === "rival" && e.rivalId ? (
        <span className="tok-av">
          <Avatar id={e.rivalId} nombre={e.rivalNombre ?? ""} tam={TILE - 6} />
        </span>
      ) : (
        <span className="tok-glifo" aria-hidden="true">{glifoDe(e)}</span>
      )}
    </button>
  );
}

function DPad({ onMover }: { onMover: (dir: string) => void }) {
  const b = (dir: string, etq: string, flecha: string, clase: string) => (
    <button className={"dpad-btn " + clase} aria-label={etq} onClick={() => onMover(dir)}>
      <span aria-hidden="true">{flecha}</span>
    </button>
  );
  return (
    <div className="dpad" role="group" aria-label="Mover">
      {b("arriba", "Arriba", "▲", "up")}
      {b("izquierda", "Izquierda", "◀", "left")}
      <span className="dpad-centro" aria-hidden="true" />
      {b("derecha", "Derecha", "▶", "right")}
      {b("abajo", "Abajo", "▼", "down")}
    </div>
  );
}

export function MapaHistoria({
  snap,
  transporte,
  salir,
}: {
  snap: Instantanea;
  transporte: Transporte;
  salir: () => void;
}) {
  const ex: ExplorarVista = snap.historia!.explorar!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = TECLAS[e.key];
      if (dir) {
        e.preventDefault();
        transporte.historiaMover?.(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transporte]);

  // Entidad al lado del jugador (para el pie de página contextual).
  const cerca = ex.entidades.find(
    (e) => Math.abs(e.x - ex.jugador.x) + Math.abs(e.y - ex.jugador.y) <= 1,
  );
  const accionDe = (e: EntidadVista): string => {
    if (e.tipo === "rival") return e.estado === "derrotado" ? "ya lo venciste" : "camina hacia él para retarlo";
    if (e.tipo === "tienda") return "entra a comprar";
    if (e.tipo === "evento") return e.estado === "resuelto" ? "eso ya quedó atrás" : "algo pasa aquí: acércate";
    if (e.tipo === "premio") return e.estado === "resuelto" ? "ya está vacío" : e.estado === "bloqueado" ? "está cerrado" : "ábrelo";
    if (e.tipo === "puerta") return e.estado === "abierto" ? "abierta: cruza hacia el jefe" : "cerrada";
    return "míralo de cerca";
  };
  const nombreCerca = (e: EntidadVista): string =>
    e.tipo === "rival" ? (e.esBoss ? "JEFE · " : "") + (e.rivalNombre ?? "") :
    e.tipo === "tienda" ? "El fiador" :
    e.tipo === "evento" ? "Calle" :
    e.tipo === "premio" ? "Un botín" :
    e.tipo === "puerta" ? "Puerta del jefe" : "Letrero";

  return (
    <div className="pantalla explorar">
      <header className="explorar-hud">
        <div className="eh-tit">
          <span className="eh-barrio">{ex.titulo}</span>
          <span className="eh-plata">${snap.historia!.plata.toLocaleString("es-CL")}</span>
        </div>
        <button className="salir-mesa" onClick={salir}>Salir</button>
      </header>

      <p className="explorar-pista">{ex.pista}</p>

      <div className="mapa-marco">
        <div className="mapa" style={{ width: ex.ancho * TILE, height: ex.alto * TILE }}>
          <div
            className="mapa-grid"
            style={{ gridTemplateColumns: `repeat(${ex.ancho}, ${TILE}px)`, gridTemplateRows: `repeat(${ex.alto}, ${TILE}px)` }}
          >
            {ex.filas.flatMap((fila, y) =>
              fila.split("").map((c, x) => (
                <div key={`${x}-${y}`} className={"celda " + (c === "#" ? "celda--muro" : "celda--piso")} />
              )),
            )}
          </div>

          {ex.entidades.map((e) => (
            <Token key={e.id} e={e} onTap={() => transporte.historiaInteractuar?.(e.id)} />
          ))}

          <div
            className="jugador-tok"
            style={{ left: ex.jugador.x * TILE, top: ex.jugador.y * TILE, width: TILE, height: TILE }}
          >
            <span className="tok-av">
              <Avatar id="humano" nombre={ex.jugador.nombre} tam={TILE - 4} anillo />
            </span>
          </div>

          {ex.mensaje && (
            <div className="mapa-msg" role="status">{ex.mensaje}</div>
          )}
        </div>
      </div>

      <div className="explorar-cerca" aria-live="polite">
        {cerca ? (
          <>
            <b>{nombreCerca(cerca)}</b> · {accionDe(cerca)}
          </>
        ) : (
          <span className="ec-tenue">Muévete con el pad o las flechas.</span>
        )}
      </div>

      <DPad onMover={(dir) => transporte.historiaMover?.(dir)} />
    </div>
  );
}
