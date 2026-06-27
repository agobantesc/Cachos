// Pantallas de transición del torneo: entre rondas, campeón y eliminado.
// Se muestran cuando la Instantánea trae torneo.faseTorneo distinto de "mesa".
import { Emblema } from "./Iconos";
import type { Instantanea, Transporte } from "./transporte";
import type { VistaTorneo } from "./torneo";

const ETIQUETA_NIVEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Medio",
  avanzado: "Avanzado",
  experto: "Experto",
};

function Camino({ torneo }: { torneo: VistaTorneo }) {
  return (
    <ol className="torneo-camino" aria-label="Tu recorrido en el torneo">
      {torneo.camino.map((p, i) => (
        <li key={i} className={"camino-paso camino--" + p.estado}>
          <span className="camino-punto" aria-hidden="true" />
          <span className="camino-etq">{p.etiqueta}</span>
        </li>
      ))}
    </ol>
  );
}

export function PantallaTorneo({
  snap,
  transporte,
  salir,
}: {
  snap: Instantanea;
  transporte: Transporte;
  salir: () => void;
}) {
  const t = snap.torneo!;
  const nivel = ETIQUETA_NIVEL[t.nivelRonda] ?? t.nivelRonda;

  if (t.faseTorneo === "entre-rondas") {
    return (
      <div className="pantalla torneo-pantalla">
        <span className="torneo-kicker">{t.presetNombre}</span>
        <h1 className="torneo-titulo">Ganaste tu mesa</h1>
        <p className="torneo-sub">
          Avanzas a <b>{t.etiquetaRonda}</b>. Quedan <b>{t.vivos}</b> socios en carrera.
        </p>
        <Camino torneo={t} />
        <div className="torneo-info">
          <div className="torneo-dato">
            <span className="torneo-dato-n">{t.mesasEnRonda}</span>
            <span className="torneo-dato-l">{t.mesasEnRonda === 1 ? "mesa" : "mesas"}</span>
          </div>
          <div className="torneo-dato">
            <span className="torneo-dato-n">{t.vivos}</span>
            <span className="torneo-dato-l">en pie</span>
          </div>
          <div className="torneo-dato">
            <span className="torneo-dato-n">{nivel}</span>
            <span className="torneo-dato-l">rivales</span>
          </div>
        </div>
        {t.acompanantes.length > 0 && (
          <p className="torneo-acomp">
            También avanzaron: {t.acompanantes.join(" · ")}
            {t.acompanantes.length < t.vivos - 1 ? "…" : ""}
          </p>
        )}
        <button className="btn btn--apostar grande" onClick={() => transporte.avanzarTorneo?.()}>
          Jugar {t.etiquetaRonda}
        </button>
        <button className="btn-link" onClick={salir}>
          Abandonar el torneo
        </button>
      </div>
    );
  }

  // Campeón o eliminado
  const campeon = t.faseTorneo === "campeon";
  return (
    <div className={"pantalla torneo-pantalla torneo-fin" + (campeon ? " es-campeon" : "")}>
      {campeon && (
        <div className="torneo-emblema">
          <Emblema tam={92} />
        </div>
      )}
      <span className="torneo-kicker">{t.presetNombre}</span>
      <h1 className="torneo-titulo">{campeon ? "¡Campeón de la Asociación!" : "Quedaste eliminado"}</h1>
      {campeon ? (
        <p className="torneo-sub">
          Ganaste las <b>{t.totalRondas}</b> rondas y te coronaste entre <b>{t.totalParticipantes}</b> socios.
        </p>
      ) : (
        <p className="torneo-sub">
          Caíste en <b>{t.etiquetaRonda}</b>. Se quedó con la copa <b>{t.campeonNombre}</b>.
        </p>
      )}
      <Camino torneo={t} />
      <button className="btn btn--apostar grande" onClick={salir}>
        Volver al menú
      </button>
    </div>
  );
}
