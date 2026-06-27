// El cuadro de duelos: rondas que se angostan (8 mesas → 2 → final), cada mesa
// con los rostros de sus jugadores. Se va llenando: ganadores con halo de oro,
// perdedores apagados, rondas futuras como incógnitas. La mesa del humano va
// resaltada. Pensado para móvil (cada ronda hace scroll horizontal).
import { Avatar } from "./Avatar";
import type { MapaTorneo, MapaMesa } from "./torneo";

function Chip({ mesa }: { mesa: MapaMesa }) {
  const incog = mesa.participantes[0]?.estado === "incognito";
  const tam = mesa.participantes.length <= 2 ? 30 : 24;
  return (
    <div
      className={
        "md-chip" +
        (mesa.esLaDelHumano ? " md-chip--humano" : "") +
        (incog ? " md-chip--incog" : "") +
        (mesa.resuelta ? " md-chip--ok" : "")
      }
    >
      <div className={"md-caras n" + mesa.participantes.length}>
        {mesa.participantes.map((p, i) => (
          <span key={p.id + i} className={"md-cara md-" + p.estado}>
            {incog ? (
              <span className="md-incface" aria-hidden="true" />
            ) : (
              <Avatar id={p.id} nombre={p.nombre} tam={tam} anillo={p.esHumano} />
            )}
          </span>
        ))}
      </div>
      <div className="md-chip-pie">
        {mesa.esLaDelHumano && !mesa.resuelta ? (
          <span className="md-tu">Tu mesa</span>
        ) : mesa.ganador ? (
          <span className="md-gan">{mesa.ganador}</span>
        ) : (
          <span className="md-vs">{incog ? "¿?" : "—"}</span>
        )}
      </div>
    </div>
  );
}

export function MapaDuelos({ mapa }: { mapa: MapaTorneo }) {
  return (
    <div className="mapa-duelos">
      {mapa.rondas.map((r, i) => (
        <section key={i} className={"md-ronda md-ronda--" + r.estado}>
          <div className="md-ronda-cab">
            <span className="md-ronda-etq">{r.etiqueta}</span>
            <span className="md-ronda-meta">
              {r.estado === "futura" ? "por definir" : `${r.mesas.length} ${r.mesas.length === 1 ? "mesa" : "mesas"}`}
            </span>
          </div>
          <div className="md-mesas">
            {r.mesas.map((m, j) => (
              <Chip key={j} mesa={m} />
            ))}
          </div>
          {i < mapa.rondas.length - 1 && <div className="md-conector" aria-hidden="true" />}
        </section>
      ))}
    </div>
  );
}
