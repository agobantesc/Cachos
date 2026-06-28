// Pantallas del modo historia alrededor de la mesa: intro del rival, victoria,
// derrota, la tienda (subir atributos) y el final de la campaña.
import { Avatar } from "./Avatar";
import type { Instantanea, Transporte } from "./transporte";
import type { VistaHistoria } from "./historia";

const ETIQUETA_NIVEL: Record<string, string> = {
  facil: "Novato", medio: "Curtido", avanzado: "Veterano", experto: "Leyenda",
};

function Plata({ n }: { n: number }) {
  return <span className="plata">${n.toLocaleString("es-CL")}</span>;
}

function BarraStats({ t }: { t: VistaHistoria }) {
  return (
    <div className="hist-stats">
      <Plata n={t.plata} />
      <span className="hist-atr">Aguante {t.atributos.aguante}</span>
      <span className="hist-atr">Ojo {t.atributos.ojo}</span>
      <span className="hist-atr">Suerte {t.atributos.suerte}</span>
    </div>
  );
}

function FichaRival({ t, tam = 96 }: { t: VistaHistoria; tam?: number }) {
  const r = t.rival;
  return (
    <div className={"rival-ficha" + (r.esBoss ? " rival-ficha--boss" : "")}>
      <Avatar id={r.id} nombre={r.nombre} tam={tam} />
      <div className="rival-info">
        <span className="rival-nombre">{r.nombre}</span>
        <span className="rival-nivel">
          {r.esBoss ? "JEFE · " : ""}
          {ETIQUETA_NIVEL[r.nivel] ?? r.nivel}
          {r.dadosExtra > 0 ? ` · ${5 + r.dadosExtra} cachos` : ""}
        </span>
      </div>
    </div>
  );
}

export function PantallaHistoria({
  snap,
  transporte,
  salir,
}: {
  snap: Instantanea;
  transporte: Transporte;
  salir: () => void;
}) {
  const t = snap.historia!;
  const r = t.rival;

  // --- INTRO: el lugar y el rival ---
  if (t.faseHistoria === "intro") {
    const esPrimero = t.escenario.idx === 0 && t.progresoRival.idx === 0;
    return (
      <div className="pantalla historia-pantalla">
        <span className="hist-kicker">
          {t.escenario.lugar} · Cap. {t.escenario.idx + 1}/{t.escenario.total}
        </span>
        <h1 className="hist-titulo">{t.escenario.nombre}</h1>
        {(esPrimero || t.progresoRival.idx === 0) && <p className="hist-ambiente">{t.escenario.ambiente}</p>}
        <FichaRival t={t} />
        {r.esBoss && r.habilidad && (
          <div className="boss-habilidad">
            <span className="bh-tit">Habilidad</span>
            {r.habilidad}
          </div>
        )}
        <p className="hist-dialogo">“{r.dialogo}”</p>
        <BarraStats t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaEmpezar?.()}>
            Sentarse a la mesa
          </button>
          <button className="btn-link" onClick={salir}>
            Guardar y salir
          </button>
        </div>
      </div>
    );
  }

  // --- VICTORIA ---
  if (t.faseHistoria === "victoria") {
    return (
      <div className={"pantalla historia-pantalla" + (r.esBoss ? " hist-boss-caido" : "")}>
        <span className="hist-kicker">{t.escenario.nombre}</span>
        <h1 className="hist-titulo hist-gano">{r.esBoss ? "Caíste, jefe" : "Le ganaste a " + r.nombre}</h1>
        <FichaRival t={t} tam={84} />
        <p className="hist-dialogo">“{r.dialogo}”</p>
        <div className="hist-premio">
          Te llevas <Plata n={r.plata} />
        </div>
        <BarraStats t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
            Seguir bajando al fondo
          </button>
        </div>
      </div>
    );
  }

  // --- DERROTA ---
  if (t.faseHistoria === "derrota") {
    return (
      <div className="pantalla historia-pantalla">
        <span className="hist-kicker">{t.escenario.nombre}</span>
        <h1 className="hist-titulo hist-perdio">{r.nombre} te limpió</h1>
        <FichaRival t={t} tam={84} />
        <p className="hist-dialogo">“{r.dialogo}”</p>
        <BarraStats t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaReintentar?.()}>
            Otra mano (revancha)
          </button>
          <button className="btn-link" onClick={salir}>
            Guardar y salir
          </button>
        </div>
      </div>
    );
  }

  // --- TIENDA: subir atributos con plata ---
  if (t.faseHistoria === "tienda") {
    return (
      <div className="pantalla historia-pantalla">
        <span className="hist-kicker">La Trastienda</span>
        <h1 className="hist-titulo">El fiador</h1>
        <p className="hist-ambiente">
          “Sobreviviste otra cuadra, forastero. Con plata se compra de todo aquí… hasta una vida más larga.”
        </p>
        <div className="hist-plata-grande">
          Tienes <Plata n={t.plata} />
        </div>
        <div className="tienda-mejoras">
          {t.mejoras.map((m) => (
            <div key={m.clave} className={"mejora" + (m.nivel >= m.max ? " mejora--tope" : "")}>
              <div className="mejora-cab">
                <span className="mejora-nombre">{m.nombre}</span>
                <span className="mejora-nivel">
                  {Array.from({ length: m.max }, (_, i) => (
                    <i key={i} className={i < m.nivel ? "pip on" : "pip"} />
                  ))}
                </span>
              </div>
              <p className="mejora-desc">{m.desc}</p>
              {m.nivel >= m.max ? (
                <div className="mejora-tope">Al máximo</div>
              ) : (
                <button
                  className="btn btn--calzar mejora-btn"
                  disabled={!m.alcanzable}
                  onClick={() => transporte.historiaMejorar?.(m.clave)}
                >
                  Subir · ${m.costo.toLocaleString("es-CL")}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
            Seguir el camino
          </button>
        </div>
      </div>
    );
  }

  // --- FINAL ---
  return (
    <div className="pantalla historia-pantalla hist-final">
      <span className="hist-kicker">{t.escenario.lugar}</span>
      <h1 className="hist-titulo hist-gano">El mejor de Chile</h1>
      <p className="hist-ambiente">
        Partiste en una pocilga del puerto, oliendo a pescado y a fracaso. Hoy, desde lo más alto de
        Santiago, no queda un solo nombre por encima del tuyo. El cacho, por fin, tiene dueño.
      </p>
      <p className="hist-dialogo">“{r.dialogo}”</p>
      <BarraStats t={t} />
      <div className="hist-acciones">
        <button className="btn btn--apostar grande" onClick={salir}>
          Volver al menú
        </button>
      </div>
    </div>
  );
}
