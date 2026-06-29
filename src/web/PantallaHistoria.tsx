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
      <span className="hist-atr">Ojo {t.atributos.ojo}</span>
      <span className="hist-atr">Colmillo {t.atributos.colmillo}</span>
      <span className="hist-atr">Suerte {t.atributos.suerte}</span>
    </div>
  );
}

function Bolsa({ t }: { t: VistaHistoria }) {
  if (t.itemsEnMano.length === 0) return null;
  return (
    <div className="hist-bolsa" aria-label="Tus items">
      <span className="hb-tit">Bajo la manga</span>
      <div className="hb-items">
        {t.itemsEnMano.map((it) => (
          <span key={it.id} className="hb-item" title={it.desc}>
            {it.nombre} <b>x{it.cantidad}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function MesaInfo({ t }: { t: VistaHistoria }) {
  if (t.mesa <= 2) return <p className="hist-mesa">Mano a mano.</p>;
  return (
    <p className="hist-mesa">
      Mesa de {t.mesa}
      {t.acompanantes.length > 0 && <> · también juegan: {t.acompanantes.join(", ")}</>}
    </p>
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
    return (
      <div className="pantalla historia-pantalla">
        {t.narrativa.prologo && <p className="hist-prologo">{t.narrativa.prologo}</p>}
        <span className="hist-kicker">
          {t.escenario.lugar} · Cap. {t.escenario.idx + 1}/{t.escenario.total}
        </span>
        <h1 className="hist-titulo">{t.escenario.nombre}</h1>
        {t.narrativa.intro && <p className="hist-ambiente">{t.narrativa.intro}</p>}
        <FichaRival t={t} />
        <MesaInfo t={t} />
        {t.narrativa.presentacion && <p className="hist-relato">{t.narrativa.presentacion}</p>}
        {r.esBoss && r.habilidad && (
          <div className="boss-habilidad">
            <span className="bh-tit">Habilidad · {r.habilidad.nombre}</span>
            {r.habilidad.desc}
          </div>
        )}
        <p className="hist-dialogo">“{r.dialogo}”</p>
        <BarraStats t={t} />
        <Bolsa t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaEmpezar?.()}>
            {t.mesa <= 2 ? "Sentarse al duelo" : "Sentarse a la mesa"}
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
        <h1 className="hist-titulo hist-gano">{r.esBoss ? "Cayó el jefe" : "Le ganaste a " + r.nombre}</h1>
        <FichaRival t={t} tam={84} />
        <p className="hist-dialogo">“{r.dialogo}”</p>
        <div className="hist-premio">
          Te llevas <Plata n={r.plata ?? 0} />
        </div>
        {t.narrativa.relato && <p className="hist-relato">{t.narrativa.relato}</p>}
        {t.narrativa.epilogo && <p className="hist-ambiente">{t.narrativa.epilogo}</p>}
        <BarraStats t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
            {r.esBoss ? "Seguir bajando al fondo" : "Seguir el camino"}
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
        <h1 className="hist-titulo hist-perdio">Te limpiaron</h1>
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

  // --- DILEMA: una decisión de calle ---
  if (t.faseHistoria === "dilema" && t.dilema) {
    const dil = t.dilema;
    return (
      <div className="pantalla historia-pantalla">
        <span className="hist-kicker">{t.escenario.lugar}</span>
        <h1 className="hist-titulo">{dil.titulo}</h1>
        <p className="hist-dialogo dilema-texto">{dil.texto}</p>
        {dil.resultado ? (
          <>
            <div className="dilema-desenlace">{dil.resultado}</div>
            <BarraStats t={t} />
            <div className="hist-acciones">
              <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
                A la mesa
              </button>
            </div>
          </>
        ) : (
          <div className="dilema-opciones">
            {dil.opciones.map((o, i) => (
              <button key={i} className="btn btn--calzar dilema-opcion" onClick={() => transporte.historiaElegir?.(i)}>
                {o.etiqueta}
              </button>
            ))}
          </div>
        )}
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
        <div className="tienda-seccion-tit">Atributos</div>
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

        <div className="tienda-seccion-tit">Bajo la manga</div>
        <div className="tienda-mejoras">
          {t.itemsTienda.map((it) => (
            <div key={it.id} className="mejora">
              <div className="mejora-cab">
                <span className="mejora-nombre">{it.nombre}</span>
                <span className="mejora-cant">x{it.cantidad}{it.cantidad >= it.max ? " · lleno" : ""}</span>
              </div>
              <p className="mejora-desc">{it.desc}</p>
              {it.cantidad >= it.max ? (
                <div className="mejora-tope">Bolsillo lleno</div>
              ) : (
                <button
                  className="btn btn--calzar mejora-btn"
                  disabled={!it.alcanzable}
                  onClick={() => transporte.historiaComprarItem?.(it.id)}
                >
                  Comprar · ${it.costo.toLocaleString("es-CL")}
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
