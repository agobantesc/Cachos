// Galería de pillos: rostros SVG PROCEDURALES y deterministas (semilla = id del
// participante), sin librerías ni red. Cada socio de la máquina tiene una cara
// propia y estable, en la paleta humo/oro/hueso de la casa. Algunos rasgos se
// sesgan por el nombre (p.ej. "El Tuerto" lleva parche; "Doña…" es femenina).
import { memo } from "react";

// --- Aleatoriedad determinista a partir del id ----------------------------
function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function prng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// --- Paletas temáticas -----------------------------------------------------
const PIEL = ["#d8b48f", "#caa07a", "#b07f55", "#9c6b46", "#8a5a3b", "#e0c4a4"];
const PELO = ["#17150f", "#2b2620", "#4a3a28", "#6e5a40", "#9a8a74", "#cfc7b6"];
const FIELTRO = "#24222b"; // sombreros/gorras/capucha
const ORO = "#c8a24a";

type Cara = {
  piel: string;
  pelo: string;
  top: "corto" | "raya" | "calvo" | "gorra" | "fedora" | "capucha" | "largo" | "mono";
  cejas: "normal" | "sinistra" | "alta";
  ojos: "normal" | "entrecerrado" | "grande";
  parche: boolean;
  boca: "neutra" | "torcida" | "seria" | "mueca";
  vello: "nada" | "bigote" | "barba" | "perilla" | "candado";
  extra: "nada" | "cicatriz" | "monoculo" | "cigarro";
  femenina: boolean;
};

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

function caraDe(id: string, nombre: string): Cara {
  const r = prng(hash(id));
  const n = nombre.toLowerCase();
  // "La …" / "Doña …" / "vieja"/"dama"/"suerte" ⇒ rostro femenino.
  const femenina = /^(doña |la |señora |reina|dama)/.test(n) || /vieja|suerte/.test(n);

  let top: Cara["top"] = pick(
    r,
    femenina ? (["largo", "mono", "largo", "corto"] as const) : (["corto", "raya", "calvo", "gorra", "fedora", "corto", "raya"] as const),
  );
  let cejas: Cara["cejas"] = pick(r, ["normal", "normal", "alta", "sinistra"] as const);
  const ojos = pick(r, ["normal", "normal", "entrecerrado", "grande"] as const);
  const boca = pick(r, ["neutra", "torcida", "seria", "mueca"] as const);
  let vello: Cara["vello"] = femenina ? "nada" : pick(r, ["nada", "bigote", "barba", "perilla", "candado", "nada"] as const);
  let extra: Cara["extra"] = pick(r, ["nada", "nada", "nada", "cicatriz", "monoculo", "cigarro"] as const);
  let parche = false;

  // Sesgos por el nombre (apodos de la casa).
  if (/tuert/.test(n)) parche = true;
  if (/sombra|capuch|encapuch/.test(n)) top = "capucha";
  if (/viej|abuel/.test(n)) { /* pelo cano se aplica abajo */ }
  if (/brujo|diablo|cuervo|mudo/.test(n)) { cejas = "sinistra"; }
  if (/conde|galán|galan|maestro|señor/.test(n)) { top = top === "capucha" ? top : "fedora"; if (!femenina) vello = "bigote"; extra = extra === "nada" ? "monoculo" : extra; }
  if (/croata|turco|patas negras|charqui/.test(n) && !femenina) vello = vello === "nada" ? "barba" : vello;

  const pelo = /viej|abuel|cano|vieja/.test(n) ? pick(r, ["#9a8a74", "#cfc7b6"] as const) : pick(r, PELO);
  const piel = pick(r, PIEL);

  return {
    piel,
    pelo,
    top: top as Cara["top"],
    cejas: cejas as Cara["cejas"],
    ojos,
    parche,
    boca,
    vello: vello as Cara["vello"],
    extra,
    femenina,
  };
}

// --- Dibujo (viewBox 0..64; cara centrada en x=32) -------------------------
function Ojo({ x, tipo }: { x: number; tipo: Cara["ojos"] }) {
  if (tipo === "entrecerrado")
    return (
      <g>
        <path d={`M${x - 3} 33 q3 1.4 6 0`} stroke="#15110a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    );
  const rx = tipo === "grande" ? 3.2 : 2.6;
  const ry = tipo === "grande" ? 2.7 : 2.1;
  return (
    <g>
      <ellipse cx={x} cy={33} rx={rx} ry={ry} fill="#f4efe2" />
      <circle cx={x + 0.6} cy={33.2} r={1.25} fill="#1a1712" />
    </g>
  );
}

export const Avatar = memo(function Avatar({
  id,
  nombre,
  tam = 40,
  anillo = false,
}: {
  id: string;
  nombre: string;
  tam?: number;
  anillo?: boolean;
}) {
  const c = caraDe(id, nombre);
  const pielSombra = "rgba(0,0,0,0.18)";

  return (
    <svg
      className="avatar"
      width={tam}
      height={tam}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`rostro de ${nombre}`}
    >
      <circle cx="32" cy="32" r="31" fill="#201d27" />
      <circle cx="32" cy="32" r="31" fill="none" stroke={anillo ? ORO : "rgba(200,162,74,0.28)"} strokeWidth={anillo ? 2.4 : 1.2} />

      {/* hombros / cuello */}
      <path d="M14 64 q2 -13 18 -13 q16 0 18 13 z" fill="#15131a" />
      <rect x="28" y="48" width="8" height="6" rx="2" fill={c.piel} />

      {/* pelo largo detrás (femenino) */}
      {c.top === "largo" && <path d="M16 30 q0 22 6 28 h4 q-6 -10 -4 -28 z M48 30 q0 22 -6 28 h-4 q6 -10 4 -28 z" fill={c.pelo} />}

      {/* orejas */}
      <ellipse cx="18.5" cy="36" rx="2.6" ry="4" fill={c.piel} />
      <ellipse cx="45.5" cy="36" rx="2.6" ry="4" fill={c.piel} />

      {/* cabeza */}
      <rect x="18" y="18" width="28" height="35" rx="14" fill={c.piel} />
      <path d="M18 38 q14 9 28 0 v8 q-14 9 -28 0 z" fill={pielSombra} opacity="0.35" />

      {/* cejas */}
      {c.cejas === "sinistra" ? (
        <g stroke={c.pelo} strokeWidth="1.7" fill="none" strokeLinecap="round">
          <path d="M23 28 l6 2" />
          <path d="M41 28 l-6 2" />
        </g>
      ) : c.cejas === "alta" ? (
        <g stroke={c.pelo} strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M23 27 q3 -1.5 6 0" />
          <path d="M35 27 q3 -1.5 6 0" />
        </g>
      ) : (
        <g stroke={c.pelo} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M23 28.5 q3 -1 6 0" />
          <path d="M35 28.5 q3 -1 6 0" />
        </g>
      )}

      {/* ojos (con parche en uno si corresponde) */}
      {c.parche ? (
        <>
          <Ojo x={38} tipo={c.ojos} />
          <path d="M19 30 L45 27" stroke="#0c0b0e" strokeWidth="1.6" />
          <ellipse cx="26" cy="33" rx="4.2" ry="3.4" fill="#0c0b0e" />
        </>
      ) : (
        <>
          <Ojo x={26} tipo={c.ojos} />
          <Ojo x={38} tipo={c.ojos} />
        </>
      )}

      {/* nariz */}
      <path d="M32 34 v4 l1.8 1.2" stroke={pielSombra} strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* boca */}
      {c.boca === "seria" ? (
        <path d="M28 44 h8" stroke="#7a4636" strokeWidth="1.6" strokeLinecap="round" />
      ) : c.boca === "torcida" ? (
        <path d="M28 44 q4 2.5 8 -0.6" stroke="#7a4636" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : c.boca === "mueca" ? (
        <path d="M28 45 q4 -2 8 0.6" stroke="#7a4636" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M28 44 q4 2 8 0" stroke="#7a4636" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      )}

      {/* vello facial */}
      {c.vello === "bigote" && <path d="M27 42.5 q5 2.4 10 0 q-3 1.4 -5 1.4 q-2 0 -5 -1.4 z" fill={c.pelo} />}
      {c.vello === "perilla" && <path d="M30 47 q2 2 4 0 q0 3 -2 3 q-2 0 -2 -3 z" fill={c.pelo} />}
      {c.vello === "candado" && (
        <path d="M22 40 q2 10 10 11 q8 -1 10 -11 q-2 4 -10 4 q-8 0 -10 -4 z" fill="none" stroke={c.pelo} strokeWidth="2" />
      )}
      {c.vello === "barba" && <path d="M21 38 q1 13 11 14 q10 -1 11 -14 q-3 7 -11 7 q-8 0 -11 -7 z" fill={c.pelo} />}

      {/* pelo / sombrero / capucha (encima) */}
      {c.top === "corto" && <path d="M18 31 q-1 -17 14 -17 q15 0 14 17 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />}
      {c.top === "raya" && (
        <>
          <path d="M18 31 q-1 -17 14 -17 q15 0 14 17 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />
          <path d="M30 15 q4 4 1 9" stroke="#00000033" strokeWidth="1.4" fill="none" />
        </>
      )}
      {c.top === "calvo" && <path d="M20 22 q12 -7 24 0 q-4 -3 -12 -3 q-8 0 -12 3 z" fill="rgba(255,255,255,0.05)" />}
      {c.top === "mono" && (
        <>
          <path d="M18 30 q-1 -16 14 -16 q15 0 14 16 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />
          <circle cx="32" cy="11" r="5" fill={c.pelo} />
        </>
      )}
      {c.top === "largo" && <path d="M18 32 q-1 -18 14 -18 q15 0 14 18 q-3 -8 -14 -8 q-11 0 -14 8 z" fill={c.pelo} />}
      {c.top === "gorra" && (
        <>
          <path d="M17 25 q0 -13 15 -13 q15 0 15 13 z" fill={FIELTRO} />
          <path d="M30 25 h18 q1 2 -1 3 h-17 z" fill={FIELTRO} />
          <circle cx="32" cy="13" r="1.6" fill={ORO} />
        </>
      )}
      {c.top === "fedora" && (
        <>
          <path d="M12 25 q20 -8 40 0 q-20 5 -40 0 z" fill={FIELTRO} />
          <path d="M19 24 q0 -12 13 -12 q13 0 13 12 z" fill={FIELTRO} />
          <path d="M19 22 h26" stroke={ORO} strokeWidth="1.4" opacity="0.8" />
        </>
      )}
      {c.top === "capucha" && (
        <>
          <path d="M13 40 q-2 -28 19 -28 q21 0 19 28 q-5 -16 -19 -16 q-14 0 -19 16 z" fill="#16141c" />
          <path d="M13 40 q-2 -28 19 -28 q21 0 19 28" fill="none" stroke="rgba(200,162,74,0.25)" strokeWidth="1.2" />
        </>
      )}

      {/* extras */}
      {c.extra === "cicatriz" && <path d="M40 25 l1.6 8" stroke="#a86b5a" strokeWidth="1.1" strokeLinecap="round" />}
      {c.extra === "monoculo" && !c.parche && (
        <>
          <circle cx="38" cy="33" r="4.4" fill="none" stroke={ORO} strokeWidth="1.3" />
          <path d="M40 37 q2 5 0 9" stroke={ORO} strokeWidth="0.9" fill="none" opacity="0.8" />
        </>
      )}
      {c.extra === "cigarro" && (
        <>
          <rect x="36" y="45" width="9" height="2.2" rx="1" fill="#e9e3d2" transform="rotate(8 40 46)" />
          <circle cx="45.5" cy="46.6" r="1.2" fill="#e0703a" />
        </>
      )}
    </svg>
  );
});
