// Pantallas del modo historia alrededor de la mesa: intro del rival, victoria,
// derrota, la tienda (subir atributos) y el final de la campaña.
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";
import { Escena } from "./Escena";
import { FINALES } from "./historia";
import { Sonidos, vibrar } from "./sonido";
import { registrarFinal } from "./palmares";
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

  // Ambiente sonoro de la campaña: sting de evento, sting de jefe, y el final
  // (que además queda registrado en el palmarés). Una vez por pantalla.
  const escenaPrev = useRef("");
  useEffect(() => {
    const clave = `${t.faseHistoria}:${t.evento?.titulo ?? r.id}:${t.finalTipo ?? ""}`;
    if (escenaPrev.current === clave) return;
    escenaPrev.current = clave;
    if (t.faseHistoria === "evento") {
      Sonidos.evento();
    } else if (t.faseHistoria === "intro" && r.esBoss) {
      Sonidos.boss();
      vibrar([40, 80, 40]);
    } else if (t.faseHistoria === "final") {
      registrarFinal(t.finalTipo ?? "estandar");
      if (t.finalTipo === "malo") Sonidos.perder();
      else Sonidos.ganar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.faseHistoria, t.evento?.titulo, r.id, r.esBoss, t.finalTipo]);

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
        {t.narrativa.epilogo && (
          <p className={"hist-ambiente" + (t.haySecreto ? " hist-twist" : "")}>{t.narrativa.epilogo}</p>
        )}
        <BarraStats t={t} />
        <div className="hist-acciones">
          <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
            {t.haySecreto ? "Entra a esa pieza sin número" : r.esBoss ? "Seguir bajando al fondo" : "Seguir el camino"}
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

  // --- EVENTO de calle: decisión (dilema/pelea) o lectura de suerte ---
  if (t.faseHistoria === "evento" && t.evento) {
    const ev = t.evento;
    const esPelea = ev.tipo === "pelea";
    const esLectura = ev.tipo === "lectura";
    const kicker = esPelea ? "Bronca en el bajo mundo" : esLectura ? "Lectura de suerte" : t.escenario.lugar;
    return (
      <div className={"pantalla historia-pantalla" + (esPelea ? " hist-pelea" : "")}>
        <span className="hist-kicker">{kicker}</span>
        <h1 className="hist-titulo">{ev.titulo}</h1>
        <Escena escena={ev.imagen} />
        <p className="hist-dialogo dilema-texto">{ev.texto}</p>

        {ev.resultado ? (
          <>
            {esLectura && (
              <div className="lectura-cartas reveladas">
                {ev.cartas.map((c, i) => (
                  <div key={i} className={"carta carta--abierta" + (c.elegida ? " carta--elegida" : " carta--otra")}>
                    <span className="carta-nombre">{c.nombre}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="dilema-desenlace">{ev.resultado}</div>
            {ev.efecto && (
              <div className={"efecto-aviso" + (ev.efecto.bueno ? " efecto--bueno" : " efecto--malo")} role="status">
                {ev.efecto.titulo}
              </div>
            )}
            <BarraStats t={t} />
            <div className="hist-acciones">
              <button className="btn btn--apostar grande" onClick={() => transporte.historiaContinuar?.()}>
                A la mesa
              </button>
            </div>
          </>
        ) : esLectura ? (
          <>
            <p className="lectura-instr">Elige una carta. Lo que salga, salió.</p>
            <div className="lectura-cartas">
              {ev.cartas.map((c, i) => (
                <button
                  key={i}
                  className="carta carta--dorso"
                  onClick={() => {
                    Sonidos.carta();
                    vibrar(15);
                    transporte.historiaSacarCarta?.(i);
                  }}
                  aria-label={`Dar vuelta la carta ${i + 1}`}
                >
                  <span className="carta-marca" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="dilema-opciones">
            {ev.opciones.map((o, i) => (
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

  // --- FINAL (estándar / malo / verdadero) ---
  const tipo = t.finalTipo ?? "estandar";
  const fin = FINALES[tipo];
  const esMalo = tipo === "malo";
  return (
    <div className={"pantalla historia-pantalla hist-final" + (esMalo ? " hist-final-malo" : "")}>
      <span className="hist-kicker">{esMalo ? "Penthouse, lo más alto de Santiago" : t.escenario.lugar}</span>
      <h1 className={"hist-titulo " + (esMalo ? "hist-perdio" : "hist-gano")}>{fin.titulo}</h1>
      <p className="hist-ambiente">{fin.texto}</p>
      <BarraStats t={t} />
      <div className="hist-acciones">
        <button className="btn btn--apostar grande" onClick={salir}>
          Volver al menú
        </button>
      </div>
    </div>
  );
}
