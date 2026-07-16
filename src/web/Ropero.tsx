// EL ROPERO DEL TAHÚR: la colección. Paños, dados, marcos y capacidades que
// se ganan jugando. Lo visible muestra su condición ("gana 10 mesas…"); lo
// SECRETO ni el nombre suelta hasta que cae. Equipar aplica al tiro.
import { useMemo, useState } from "react";
import { Avatar } from "./Avatar";
import { Dado } from "./Dado";
import { COSMETICOS, leerRopero, equipar, revisarDesbloqueos, muestraPano, type Cosmetico, type TipoCosmetico } from "./cosmeticos";
import { Sonidos } from "./sonido";

const TITULOS: Record<TipoCosmetico, string> = {
  pano: "Paños de mesa",
  dados: "Dados",
  marco: "Marcos de avatar",
  capacidad: "Capacidades",
};

function Vista({ c }: { c: Cosmetico }) {
  if (c.tipo === "pano") return <span className="rp-pano" style={{ background: muestraPano(c.id) }} aria-hidden="true" />;
  if (c.tipo === "dados")
    return (
      <span className="rp-dados" aria-hidden="true">
        <Dado cara={5} tam={30} pielId={c.id} />
        <Dado cara={1} tam={30} pielId={c.id} />
      </span>
    );
  if (c.tipo === "marco")
    return (
      <span aria-hidden="true">
        <Avatar id="humano" nombre="Tú" tam={40} {...(c.id !== "marco-ninguno" ? { marco: c.id } : {})} />
      </span>
    );
  return <span className="rp-cap" aria-hidden="true">◆</span>;
}

export function Ropero({ volver }: { volver: () => void }) {
  // Al abrir el Ropero se revisan las condiciones: lo que ya te ganaste, cae aquí.
  const nuevos = useMemo(() => revisarDesbloqueos(), []);
  const [ropero, setRopero] = useState(() => leerRopero());
  const ganados = ropero.ganados.length;

  const vestir = (id: string) => {
    if (equipar(id)) {
      Sonidos.apostar();
      setRopero(leerRopero());
    }
  };

  return (
    <div className="pantalla ropero">
      <header className="cabecera">
        <button className="volver" onClick={volver} aria-label="Volver">
          ‹
        </button>
        <h2>El Ropero del Tahúr</h2>
      </header>
      <p className="ayuda">
        Lo que el bajo mundo te ha visto ganar. <b>{ganados}</b> de {COSMETICOS.length} piezas.
        {" "}Las tapadas son secretos: se ganan sin saber cómo.
      </p>
      {nuevos.length > 0 && (
        <div className="logro-toast" role="status">
          Cayó al ropero · <b>{nuevos.map((c) => c.nombre).join(" · ")}</b>
        </div>
      )}

      {(Object.keys(TITULOS) as TipoCosmetico[]).map((tipo) => (
        <section key={tipo} className="cua-seccion" aria-label={TITULOS[tipo]}>
          <h3 className="cua-titulo">
            {TITULOS[tipo]}
            <span className="cua-cuenta">
              {COSMETICOS.filter((c) => c.tipo === tipo && ropero.ganados.includes(c.id)).length}/
              {COSMETICOS.filter((c) => c.tipo === tipo).length}
            </span>
          </h3>
          {COSMETICOS.filter((c) => c.tipo === tipo).map((c) => {
            const ganado = ropero.ganados.includes(c.id);
            const secreto = !ganado && !!c.oculto;
            const enUso = c.tipo !== "capacidad" && ropero.equipado[c.tipo] === c.id;
            return (
              <div key={c.id} className={"rp-item" + (ganado ? "" : " rp-item--cerrado")}>
                <span className={"rp-vista" + (secreto ? " rp-vista--secreta" : "")}>
                  {secreto ? <span className="rp-secreto" aria-hidden="true">?</span> : <Vista c={c} />}
                </span>
                <span className="rp-cuerpo">
                  <b>{secreto ? "???" : c.nombre}</b>
                  <i>{secreto ? "Un secreto del hampa. Se gana sin saber cómo." : ganado ? c.desc : c.condicion}</i>
                  {ganado && !secreto && c.tipo !== "capacidad" && !enUso && (
                    <i className="rp-como">{c.condicion}</i>
                  )}
                </span>
                {c.tipo === "capacidad" ? (
                  ganado && <span className="rp-uso rp-uso--activa">Activa</span>
                ) : enUso ? (
                  <span className="rp-uso">En uso</span>
                ) : ganado ? (
                  <button className="btn btn--calzar rp-btn" onClick={() => vestir(c.id)}>
                    Usar
                  </button>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
