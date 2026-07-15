// El CUADERNO DEL TAHÚR: la bitácora del socio. Registra los barrios
// recorridos, las marcas que dejaron tus decisiones, los secretos del bajo
// mundo (candados de cifra) y los finales que ya viste. Lo que no has vivido
// aparece como "???": el cuaderno se escribe jugando.
import { CAMPANA, FINALES, MARCAS_INFO, SECRETOS, OFICIOS, LOGROS, normalizar } from "./historia";
import type { EstadoHistoria, TipoFinal } from "./historia";
import { MapaHampa } from "./Mapa";
import { leerPalmares } from "./palmares";
import { leerPrefs } from "./prefs";

export function Cuaderno({ volver }: { volver: () => void }) {
  const prefs = leerPrefs();
  const h: EstadoHistoria | null = prefs.historia ? normalizar(prefs.historia) : null;
  const palmares = leerPalmares();

  const capVisto = (idx: number) => !!h && (h.completado || idx <= h.escenarioIdx);
  const capConquistado = (idx: number) => !!h && (h.completado || idx < h.escenarioIdx);

  const secretos = CAMPANA.flatMap((esc, idx) => (esc.acertijo ? [{ idx, acertijo: esc.acertijo }] : []));
  const secretosAbiertos = secretos.filter((s) => h?.dilemasResueltos.includes(s.acertijo.clave)).length;
  const tiposFinal = Object.keys(FINALES) as TipoFinal[];
  const finalesVistos = tiposFinal.filter((tf) => palmares.finales.includes(tf)).length;
  const logrosGanados = LOGROS.filter((l) => palmares.logros.includes(l.id)).length;
  const marcas = h?.marcas ?? [];

  return (
    <div className="pantalla cuaderno">
      <header className="cabecera">
        <button className="volver" onClick={volver} aria-label="Volver">
          ‹
        </button>
        <h2>Cuaderno del Tahúr</h2>
      </header>
      <p className="ayuda">
        Todo lo que viviste en el bajo mundo, anotado con letra chueca.
        {h?.oficio && <span className="leyenda-badge"> {OFICIOS.find((o) => o.id === h.oficio)?.nombre ?? ""}</span>}
        {(h?.leyenda ?? 0) > 0 && <span className="leyenda-badge"> Leyenda {"I".repeat(Math.min(h!.leyenda ?? 0, 3))}</span>}
      </p>

      <section className="cua-seccion" aria-label="Capítulos">
        <h3 className="cua-titulo">El camino</h3>
        {h && <MapaHampa escenarioIdx={h.escenarioIdx} completado={h.completado} />}
        {CAMPANA.map((esc, i) => (
          <div key={esc.clave} className={"cua-item" + (capVisto(i) ? "" : " cua-item--incognita")}>
            <span className="cua-glifo" aria-hidden="true">
              {capConquistado(i) ? "★" : capVisto(i) ? "›" : "·"}
            </span>
            {capVisto(i) ? (
              <span className="cua-cuerpo">
                <b>{esc.nombre}</b>
                <i>{esc.lugar}</i>
              </span>
            ) : (
              <span className="cua-cuerpo">
                <b>???</b>
                <i>Todavía no llegas tan arriba.</i>
              </span>
            )}
          </div>
        ))}
      </section>

      <section className="cua-seccion" aria-label="Marcas">
        <h3 className="cua-titulo">Tus marcas</h3>
        {marcas.length === 0 ? (
          <p className="cua-vacio">Sin marcas todavía. Lo que decides en la calle te sigue a la mesa.</p>
        ) : (
          marcas.map((m) => {
            const info = MARCAS_INFO[m] ?? { nombre: m, desc: "" };
            return (
              <div key={m} className="cua-item">
                <span className="cua-glifo" aria-hidden="true">▲</span>
                <span className="cua-cuerpo">
                  <b>{info.nombre}</b>
                  <i>{info.desc}</i>
                </span>
              </div>
            );
          })
        )}
      </section>

      <section className="cua-seccion" aria-label="Secretos">
        <h3 className="cua-titulo">
          Secretos <span className="cua-cuenta">{secretosAbiertos}/{secretos.length}</span>
        </h3>
        {secretos.map(({ idx, acertijo }) => {
          const info = SECRETOS.find((s) => s.clave === acertijo.clave);
          const abierto = h?.dilemasResueltos.includes(acertijo.clave) ?? false;
          const conocido = capVisto(idx);
          return (
            <div key={acertijo.clave} className={"cua-item" + (conocido ? "" : " cua-item--incognita")}>
              <span className="cua-glifo" aria-hidden="true">{abierto ? "★" : "?"}</span>
              {conocido ? (
                <span className="cua-cuerpo">
                  <b>{info?.nombre ?? acertijo.titulo}</b>
                  <i>{abierto ? "Abierto. El botín ya es tuyo." : `${info?.pista ?? ""} Sigue cerrado.`}</i>
                </span>
              ) : (
                <span className="cua-cuerpo">
                  <b>???</b>
                  <i>Hay algo escondido en un barrio que no conoces.</i>
                </span>
              )}
            </div>
          );
        })}
      </section>

      <section className="cua-seccion" aria-label="Logros">
        <h3 className="cua-titulo">
          Logros <span className="cua-cuenta">{logrosGanados}/{LOGROS.length}</span>
        </h3>
        {LOGROS.map((l) => {
          const ganado = palmares.logros.includes(l.id);
          return (
            <div key={l.id} className={"cua-item" + (ganado ? "" : " cua-item--incognita")}>
              <span className="cua-glifo" aria-hidden="true">{ganado ? "★" : "·"}</span>
              <span className="cua-cuerpo">
                <b>{l.nombre}</b>
                <i>{l.desc}</i>
              </span>
            </div>
          );
        })}
      </section>

      <section className="cua-seccion" aria-label="Finales">
        <h3 className="cua-titulo">
          Finales <span className="cua-cuenta">{finalesVistos}/{tiposFinal.length}</span>
        </h3>
        {tiposFinal.map((tf) => {
          const visto = palmares.finales.includes(tf);
          return (
            <div key={tf} className={"cua-item" + (visto ? "" : " cua-item--incognita")}>
              <span className="cua-glifo" aria-hidden="true">{visto ? "★" : "·"}</span>
              <span className="cua-cuerpo">
                <b>{visto ? FINALES[tf].titulo : "???"}</b>
                {!visto && <i>Un destino que aún no escribes.</i>}
              </span>
            </div>
          );
        })}
      </section>
    </div>
  );
}
