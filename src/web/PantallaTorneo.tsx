// Pantallas del torneo alrededor del CUADRO de duelos: presentación (antes de
// empezar), entre rondas, campeón y eliminado. El cuadro se va llenando solo.
import { Avatar } from "./Avatar";
import { MapaDuelos } from "./MapaTorneo";
import { Emblema } from "./Iconos";
import type { Instantanea, Transporte } from "./transporte";
import type { MapaMesa, VistaTorneo } from "./torneo";

const ETIQUETA_NIVEL: Record<string, string> = {
  facil: "Fácil",
  medio: "Medio",
  avanzado: "Avanzado",
  experto: "Experto",
};

function miMesaActual(t: VistaTorneo): MapaMesa | null {
  return t.mapa?.rondas.find((r) => r.estado === "actual")?.mesas.find((m) => m.esLaDelHumano) ?? null;
}

function TuMesa({ mesa, primera }: { mesa: MapaMesa; primera: boolean }) {
  return (
    <div className="tu-mesa">
      <div className="tu-mesa-tit">Tu {primera ? "primera " : ""}mesa</div>
      <div className="tu-mesa-jug">
        {mesa.participantes.map((p) => (
          <div key={p.id} className="tu-mesa-j">
            <Avatar id={p.id} nombre={p.nombre} tam={46} anillo={p.esHumano} />
            <span className={"tu-mesa-n" + (p.esHumano ? " yo" : "")}>{p.esHumano ? "Tú" : p.nombre}</span>
          </div>
        ))}
      </div>
    </div>
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
  const miMesa = miMesaActual(t);

  // --- Presentación: el cuadro antes de empezar ---
  if (t.faseTorneo === "presentacion") {
    return (
      <div className="pantalla torneo-pantalla">
        <span className="torneo-kicker">{t.presetNombre}</span>
        <h1 className="torneo-titulo">El cuadro</h1>
        <p className="torneo-sub">
          {t.totalParticipantes} socios, eliminación directa. Gana tu mesa y avanzas hasta la copa.
        </p>
        {miMesa && <TuMesa mesa={miMesa} primera />}
        {t.mapa && <MapaDuelos mapa={t.mapa} />}
        <div className="torneo-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.avanzarTorneo?.()}>
            Comenzar el torneo
          </button>
          <button className="btn-link" onClick={salir}>
            Volver al menú
          </button>
        </div>
      </div>
    );
  }

  // --- Entre rondas: ganaste, el cuadro avanza ---
  if (t.faseTorneo === "entre-rondas") {
    return (
      <div className="pantalla torneo-pantalla">
        <span className="torneo-kicker">{t.presetNombre}</span>
        <h1 className="torneo-titulo">Ganaste tu mesa</h1>
        <p className="torneo-sub">
          Avanzas a <b>{t.etiquetaRonda}</b>. Quedan <b>{t.vivos}</b> socios · rivales <b>{nivel}</b>.
        </p>
        {t.mapa && <MapaDuelos mapa={t.mapa} />}
        <div className="torneo-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.avanzarTorneo?.()}>
            Jugar {t.etiquetaRonda}
          </button>
          <button className="btn-link" onClick={salir}>
            Abandonar el torneo
          </button>
        </div>
      </div>
    );
  }

  // --- Campeón / eliminado ---
  const campeon = t.faseTorneo === "campeon";
  return (
    <div className={"pantalla torneo-pantalla torneo-fin" + (campeon ? " es-campeon" : "")}>
      {campeon && (
        <div className="torneo-emblema">
          <Emblema tam={86} />
        </div>
      )}
      <span className="torneo-kicker">{t.presetNombre}</span>
      <h1 className="torneo-titulo">{campeon ? "¡Campeón de la Asociación!" : "Quedaste eliminado"}</h1>
      {campeon ? (
        <p className="torneo-sub">
          Ganaste las <b>{t.totalRondas}</b> rondas entre <b>{t.totalParticipantes}</b> socios.
        </p>
      ) : (
        <p className="torneo-sub">
          Caíste en <b>{t.etiquetaRonda}</b>. Se quedó con la copa <b>{t.campeonNombre}</b>.
        </p>
      )}
      {t.mapa && <MapaDuelos mapa={t.mapa} />}
      <div className="torneo-acciones">
        <button className="btn btn--apostar grande" onClick={salir}>
          Volver al menú
        </button>
      </div>
    </div>
  );
}
