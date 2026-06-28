// Editor del personaje del jugador: arma tu propio rostro y se guarda. La cara
// elegida se registra (fijarCaraJugador) y aparece en toda la app para "humano".
import { useState } from "react";
import {
  Avatar,
  caraAleatoria,
  CARA_DEFECTO,
  fijarCaraJugador,
  PIEL,
  PELO,
  TOPS_M,
  TOPS_F,
  CEJAS,
  OJOS,
  BOCAS,
  VELLOS,
  EXTRAS,
  type Cara,
} from "./Avatar";
import { leerPrefs, guardarPrefs } from "./prefs";

const LBL_TOP: Record<string, string> = {
  corto: "Pelo corto", raya: "Con raya", calvo: "Calvo", gorra: "Gorra",
  fedora: "Fedora", tongo: "Bombín", capucha: "Capucha", largo: "Pelo largo", mono: "Moño",
};
const LBL_CEJAS: Record<string, string> = { normal: "Normales", sinistra: "Fruncidas", alta: "Levantadas" };
const LBL_OJOS: Record<string, string> = { normal: "Normales", entrecerrado: "Entornados", grande: "Grandes" };
const LBL_BOCA: Record<string, string> = { neutra: "Neutra", torcida: "Torcida", seria: "Seria", mueca: "Mueca" };
const LBL_VELLO: Record<string, string> = { nada: "Sin vello", bigote: "Bigote", barba: "Barba", perilla: "Perilla", candado: "Candado" };
const LBL_EXTRA: Record<string, string> = { nada: "Ninguno", cicatriz: "Cicatriz", monoculo: "Monóculo", cigarro: "Cigarro", diente: "Diente de oro", arete: "Arete" };

function ciclar<T>(arr: readonly T[], val: T, dir: number): T {
  const i = Math.max(0, arr.indexOf(val));
  return arr[(i + dir + arr.length) % arr.length]!;
}

function Fila({
  label,
  valor,
  swatch,
  onPrev,
  onNext,
  disabled,
}: {
  label: string;
  valor: string;
  swatch?: string;
  onPrev: () => void;
  onNext: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={"ec-fila" + (disabled ? " ec-fila--off" : "")}>
      <span className="ec-label">{label}</span>
      <div className="ec-ctrl">
        <button className="ec-arrow" onClick={onPrev} disabled={disabled} aria-label={`${label} anterior`}>‹</button>
        {swatch ? <span className="ec-swatch" style={{ background: swatch }} /> : <span className="ec-valor">{valor}</span>}
        <button className="ec-arrow" onClick={onNext} disabled={disabled} aria-label={`${label} siguiente`}>›</button>
      </div>
    </div>
  );
}

function EditorCara({ caraInicial, onGuardar, onCerrar }: { caraInicial: Cara; onGuardar: (c: Cara) => void; onCerrar: () => void }) {
  const [c, setC] = useState<Cara>(caraInicial);
  const set = (parcial: Partial<Cara>) => setC((prev) => ({ ...prev, ...parcial }));
  const tops: readonly Cara["top"][] = c.femenina ? TOPS_F : TOPS_M;

  const cambiarGenero = () => {
    const femenina = !c.femenina;
    const lista = femenina ? TOPS_F : TOPS_M;
    const top = (lista as readonly string[]).includes(c.top) ? c.top : lista[0]!;
    set({ femenina, top: top as Cara["top"], vello: femenina ? "nada" : c.vello });
  };

  return (
    <div className="editor-cara" role="dialog" aria-label="Editor de personaje">
      <div className="ec-caja">
        <div className="ec-cab">
          <h2>Tu personaje</h2>
          <button className="ec-cerrar" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </div>

        <div className="ec-preview">
          <Avatar id="preview" nombre="" cara={c} tam={132} anillo />
        </div>

        <button className="btn btn--calzar ec-azar" onClick={() => set(caraAleatoria())}>
          Al azar
        </button>

        <div className="ec-filas">
          <Fila label="Tipo" valor={c.femenina ? "Femenino" : "Masculino"} onPrev={cambiarGenero} onNext={cambiarGenero} />
          <Fila label="Piel" swatch={c.piel} onPrev={() => set({ piel: ciclar(PIEL, c.piel, -1) })} onNext={() => set({ piel: ciclar(PIEL, c.piel, 1) })} valor="" />
          <Fila label="Pelo" swatch={c.pelo} onPrev={() => set({ pelo: ciclar(PELO, c.pelo, -1) })} onNext={() => set({ pelo: ciclar(PELO, c.pelo, 1) })} valor="" />
          <Fila label="Estilo" valor={LBL_TOP[c.top]!} onPrev={() => set({ top: ciclar(tops, c.top, -1) })} onNext={() => set({ top: ciclar(tops, c.top, 1) })} />
          <Fila label="Cejas" valor={LBL_CEJAS[c.cejas]!} onPrev={() => set({ cejas: ciclar(CEJAS, c.cejas, -1) })} onNext={() => set({ cejas: ciclar(CEJAS, c.cejas, 1) })} />
          <Fila label="Ojos" valor={LBL_OJOS[c.ojos]!} onPrev={() => set({ ojos: ciclar(OJOS, c.ojos, -1) })} onNext={() => set({ ojos: ciclar(OJOS, c.ojos, 1) })} />
          <Fila label="Boca" valor={LBL_BOCA[c.boca]!} onPrev={() => set({ boca: ciclar(BOCAS, c.boca, -1) })} onNext={() => set({ boca: ciclar(BOCAS, c.boca, 1) })} />
          <Fila
            label="Vello"
            valor={c.femenina ? "—" : LBL_VELLO[c.vello]!}
            disabled={c.femenina}
            onPrev={() => set({ vello: ciclar(VELLOS, c.vello, -1) })}
            onNext={() => set({ vello: ciclar(VELLOS, c.vello, 1) })}
          />
          <Fila label="Detalle" valor={LBL_EXTRA[c.extra]!} onPrev={() => set({ extra: ciclar(EXTRAS, c.extra, -1) })} onNext={() => set({ extra: ciclar(EXTRAS, c.extra, 1) })} />
          <Fila label="Parche" valor={c.parche ? "Sí" : "No"} onPrev={() => set({ parche: !c.parche })} onNext={() => set({ parche: !c.parche })} />
        </div>

        <button className="btn btn--apostar grande" onClick={() => onGuardar(c)}>
          Listo
        </button>
      </div>
    </div>
  );
}

/** Campo "este eres tú": avatar + nombre + botón para editar el personaje. */
export function CampoJugador({ nombre, setNombre }: { nombre: string; setNombre: (s: string) => void }) {
  const [cara, setCara] = useState<Cara | null>(() => leerPrefs().cara ?? null);
  const [editando, setEditando] = useState(false);

  return (
    <>
      <div className="campo-jugador">
        <button className="cj-avatar" onClick={() => setEditando(true)} aria-label="Editar mi personaje">
          <Avatar id="humano" nombre={nombre} {...(cara ? { cara } : {})} anillo tam={52} />
          <span className="cj-edit">Editar</span>
        </button>
        <input className="cj-nombre" value={nombre} placeholder="Tu nombre" onChange={(e) => setNombre(e.target.value)} />
      </div>
      {editando && (
        <EditorCara
          caraInicial={cara ?? CARA_DEFECTO}
          onCerrar={() => setEditando(false)}
          onGuardar={(c) => {
            setCara(c);
            fijarCaraJugador(c);
            guardarPrefs({ cara: c });
            setEditando(false);
          }}
        />
      )}
    </>
  );
}
