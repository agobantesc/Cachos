// Galería de pillos: rostros SVG PROCEDURALES y deterministas (semilla = id del
// participante), sin librerías ni red. Cada socio de la máquina tiene una cara
// propia y estable, en la paleta humo/oro/hueso de la casa. Algunos rasgos se
// sesgan por el nombre (p.ej. "El Tuerto" lleva parche; "Doña…" es femenina).
//
// El dibujo usa SÓLO superposiciones de color con opacidad (sin <defs>/gradients
// con id) para dar volumen: así no hay choque de ids al pintar muchas caras en
// la misma pantalla.
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
export const PIEL = ["#d8b48f", "#caa07a", "#b07f55", "#9c6b46", "#8a5a3b", "#e0c4a4"];
export const PELO = ["#17150f", "#2b2620", "#4a3a28", "#6e5a40", "#9a8a74", "#cfc7b6"];
const FIELTRO = "#24222b"; // sombreros/gorras/capucha
const FIELTRO_2 = "#312f3a"; // ala/realce del sombrero
const ORO = "#c8a24a";
const ORO_CLARO = "#e6c878";

export type Cara = {
  piel: string;
  pelo: string;
  top: "corto" | "raya" | "calvo" | "gorra" | "fedora" | "tongo" | "capucha" | "largo" | "mono";
  cejas: "normal" | "sinistra" | "alta";
  ojos: "normal" | "entrecerrado" | "grande";
  parche: boolean;
  boca: "neutra" | "torcida" | "seria" | "mueca";
  vello: "nada" | "bigote" | "barba" | "perilla" | "candado";
  extra: "nada" | "cicatriz" | "monoculo" | "cigarro" | "diente" | "arete";
  femenina: boolean;
};

function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)]!;
}

// Opciones editables (para el editor de personaje).
export const TOPS_M = ["corto", "raya", "calvo", "gorra", "fedora", "tongo", "capucha"] as const;
export const TOPS_F = ["largo", "mono", "corto", "capucha"] as const;
export const CEJAS = ["normal", "sinistra", "alta"] as const;
export const OJOS = ["normal", "entrecerrado", "grande"] as const;
export const BOCAS = ["neutra", "torcida", "seria", "mueca"] as const;
export const VELLOS = ["nada", "bigote", "barba", "perilla", "candado"] as const;
export const EXTRAS = ["nada", "cicatriz", "monoculo", "cigarro", "diente", "arete"] as const;

/** Cara estándar (limpia) del jugador antes de personalizar: sin barba ni cigarro. */
export const CARA_DEFECTO: Cara = {
  piel: PIEL[1]!,
  pelo: PELO[2]!,
  top: "corto",
  cejas: "normal",
  ojos: "normal",
  parche: false,
  boca: "neutra",
  vello: "nada",
  extra: "nada",
  femenina: false,
};

/** Una cara totalmente aleatoria (para el botón "Al azar" del editor). */
export function caraAleatoria(): Cara {
  const r = Math.random;
  const femenina = r() < 0.42;
  return {
    piel: pick(r, PIEL),
    pelo: pick(r, PELO),
    top: pick(r, femenina ? TOPS_F : TOPS_M),
    cejas: pick(r, CEJAS),
    ojos: pick(r, OJOS),
    parche: r() < 0.12,
    boca: pick(r, BOCAS),
    vello: femenina ? "nada" : pick(r, VELLOS),
    extra: pick(r, ["nada", "nada", ...EXTRAS]),
    femenina,
  };
}

// Registro del rostro elegido por el jugador humano: cuando se pide el avatar de
// "humano" se usa este, así la cara personalizada aparece en toda la app sin
// tener que pasarla por cada lugar.
let _caraJugador: Cara | null = null;
export function fijarCaraJugador(c: Cara | null): void {
  _caraJugador = c;
}

export function caraDe(id: string, nombre: string): Cara {
  const r = prng(hash(id));
  const n = nombre.toLowerCase();
  // "La …" / "Doña …" / "vieja"/"dama"/"suerte" ⇒ rostro femenino.
  const femenina = /^(doña |la |señora |reina|dama)/.test(n) || /vieja|suerte|madame|cantinera|quintrala/.test(n);

  let top: Cara["top"] = pick(
    r,
    femenina
      ? (["largo", "mono", "largo", "corto"] as const)
      : (["corto", "raya", "calvo", "gorra", "fedora", "tongo", "corto", "raya"] as const),
  );
  let cejas: Cara["cejas"] = pick(r, ["normal", "normal", "alta", "sinistra"] as const);
  const ojos = pick(r, ["normal", "normal", "entrecerrado", "grande"] as const);
  const boca = pick(r, ["neutra", "torcida", "seria", "mueca"] as const);
  let vello: Cara["vello"] = femenina ? "nada" : pick(r, ["nada", "bigote", "barba", "perilla", "candado", "nada"] as const);
  let extra: Cara["extra"] = pick(r, ["nada", "nada", "nada", "cicatriz", "monoculo", "cigarro", "diente", "arete"] as const);
  let parche = false;

  // Sesgos por el nombre (apodos de la casa).
  if (/tuert/.test(n)) parche = true;
  if (/sombra|capuch|encapuch|cuervo/.test(n)) top = "capucha";
  if (/brujo|diablo|cuervo|mudo|carnicero|verdugo/.test(n)) cejas = "sinistra";
  if (/conde|galán|galan|maestro|señor|senador|notario|fino|turco|croata/.test(n)) {
    top = top === "capucha" ? top : pick(r, ["fedora", "tongo"] as const);
    if (!femenina) vello = vello === "nada" ? "bigote" : vello;
    extra = extra === "nada" ? "monoculo" : extra;
  }
  if (/croata|turco|patas negras|charqui|carnicero|estibador|cargador/.test(n) && !femenina)
    vello = vello === "nada" ? "barba" : vello;
  if (/rey|jefe|capo|patrón|patron|don /.test(n)) extra = "diente"; // diente de oro: dinero viejo

  const pelo = /viej|abuel|cano|vieja|berta/.test(n) ? pick(r, ["#9a8a74", "#cfc7b6"] as const) : pick(r, PELO);
  const piel = pick(r, PIEL);

  return {
    piel,
    pelo,
    top,
    cejas,
    ojos,
    parche,
    boca,
    vello,
    extra,
    femenina,
  };
}

// --- Dibujo (viewBox 0..64; cara centrada en x=32) -------------------------

/** Bigote de manubrio: dos lóbulos que nacen bajo la nariz y caen hacia los
 *  lados, claramente ARRIBA de la boca (que se pinta aparte, más abajo). */
function Bigote({ pelo }: { pelo: string }) {
  return (
    <g>
      <path d="M32 40.6 q-2 -1.3 -4.6 -0.9 q-3.2 0.5 -4.6 2.9 q2.6 1.1 5.4 0.5 q2.6 -0.6 3.8 -2.5 z" fill={pelo} />
      <path d="M32 40.6 q2 -1.3 4.6 -0.9 q3.2 0.5 4.6 2.9 q-2.6 1.1 -5.4 0.5 q-2.6 -0.6 -3.8 -2.5 z" fill={pelo} />
      <path d="M28 40.6 q2 -0.5 3.4 0.4 M36 40.6 q-2 -0.5 -3.4 0.4" stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.14" />
    </g>
  );
}

function Ojo({ x, tipo }: { x: number; tipo: Cara["ojos"] }) {
  if (tipo === "entrecerrado")
    return (
      <g>
        <path d={`M${x - 3} 33 q3 1.6 6 0`} stroke="#15110a" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </g>
    );
  const rx = tipo === "grande" ? 3.3 : 2.7;
  const ry = tipo === "grande" ? 2.8 : 2.2;
  return (
    <g>
      {/* cuenca (blanco hueso), iris oscuro y un brillo para dar vida */}
      <ellipse cx={x} cy={33} rx={rx} ry={ry} fill="#f5f0e4" />
      <ellipse cx={x} cy={33} rx={rx} ry={ry} fill="none" stroke="#00000022" strokeWidth="0.6" />
      <circle cx={x + 0.5} cy={33.3} r={1.35} fill="#1a1712" />
      <circle cx={x + 1.1} cy={32.5} r={0.45} fill="#ffffff" opacity="0.9" />
    </g>
  );
}

export const Avatar = memo(function Avatar({
  id,
  nombre,
  tam = 40,
  anillo = false,
  cara,
  animo = null,
}: {
  id: string;
  nombre: string;
  tam?: number;
  anillo?: boolean;
  /** Cara explícita (para el editor); si no, se deriva del id/nombre. */
  cara?: Cara;
  /** Reacción pasajera: sonríe (ganó) o hace mueca (perdió). Pisa boca y cejas. */
  animo?: "feliz" | "molesto" | null;
}) {
  const base = cara ?? (id === "humano" && _caraJugador ? _caraJugador : caraDe(id, nombre));
  const c: Cara = animo === "feliz"
    ? { ...base, cejas: "alta", boca: "neutra" }
    : animo === "molesto"
      ? { ...base, cejas: "sinistra", boca: "mueca" }
      : base;
  const sombra = "#000000";

  return (
    <svg
      className="avatar"
      width={tam}
      height={tam}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`rostro de ${nombre}`}
    >
      {/* Disco: base + realce arriba + vignette abajo, para dar profundidad. */}
      <circle cx="32" cy="32" r="31" fill="#36333f" />
      <ellipse cx="32" cy="22" rx="30" ry="20" fill="#ffffff" opacity="0.06" />
      <ellipse cx="32" cy="50" rx="30" ry="22" fill={sombra} opacity="0.18" />
      <circle cx="32" cy="32" r="31" fill="none" stroke={anillo ? ORO : "rgba(200,162,74,0.32)"} strokeWidth={anillo ? 2.6 : 1.2} />

      {/* hombros / cuello */}
      <path d="M13 64 q2 -14 19 -14 q17 0 19 14 z" fill="#14121a" />
      <path d="M13 64 q2 -14 19 -14 q17 0 19 14" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      <rect x="28" y="47" width="8" height="7" rx="2.4" fill={c.piel} />
      <rect x="28" y="47" width="8" height="3" rx="1.5" fill={sombra} opacity="0.16" />

      {/* pelo largo detrás (femenino) */}
      {c.top === "largo" && (
        <path d="M15 30 q-1 23 7 29 h4 q-7 -11 -5 -29 z M49 30 q1 23 -7 29 h-4 q7 -11 5 -29 z" fill={c.pelo} />
      )}

      {/* orejas (con arete de oro si corresponde) */}
      <ellipse cx="18.5" cy="36" rx="2.7" ry="4.1" fill={c.piel} />
      <ellipse cx="45.5" cy="36" rx="2.7" ry="4.1" fill={c.piel} />
      <ellipse cx="18.5" cy="37" rx="1.2" ry="2" fill={sombra} opacity="0.18" />
      {c.extra === "arete" && (
        <>
          <circle cx="18.4" cy="40.4" r="1.5" fill="none" stroke={ORO} strokeWidth="1.1" />
          <circle cx="45.6" cy="40.4" r="1.5" fill="none" stroke={ORO} strokeWidth="1.1" />
        </>
      )}

      {/* cabeza + modelado (mejilla iluminada arriba-izq, mandíbula en sombra) */}
      <rect x="18" y="18" width="28" height="35" rx="14" fill={c.piel} />
      <path d="M20 20 q9 -5 18 0 q-5 -2 -9 -2 q-5 0 -9 2 z" fill="#ffffff" opacity="0.07" />
      <path d="M18 39 q14 9 28 0 v7 q-14 9 -28 0 z" fill={sombra} opacity="0.13" />
      <path d="M18 32 q-2 8 4 14 q-5 -7 -4 -14 z" fill={sombra} opacity="0.08" />

      {/* cejas */}
      {c.cejas === "sinistra" ? (
        <g stroke={c.pelo} strokeWidth="1.8" fill="none" strokeLinecap="round">
          <path d="M23 28 l6 2.2" />
          <path d="M41 28 l-6 2.2" />
        </g>
      ) : c.cejas === "alta" ? (
        <g stroke={c.pelo} strokeWidth="1.6" fill="none" strokeLinecap="round">
          <path d="M23 26.5 q3 -1.6 6 0" />
          <path d="M35 26.5 q3 -1.6 6 0" />
        </g>
      ) : (
        <g stroke={c.pelo} strokeWidth="1.7" fill="none" strokeLinecap="round">
          <path d="M23 28.4 q3 -1.1 6 0" />
          <path d="M35 28.4 q3 -1.1 6 0" />
        </g>
      )}

      {/* ojos (con parche en uno si corresponde) */}
      {c.parche ? (
        <>
          <Ojo x={38} tipo={c.ojos} />
          <path d="M19 30 L45 26.5" stroke="#0c0b0e" strokeWidth="1.7" />
          <ellipse cx="26" cy="33" rx="4.3" ry="3.5" fill="#0c0b0e" />
          <ellipse cx="24.6" cy="31.8" rx="1.1" ry="0.8" fill="#ffffff" opacity="0.12" />
        </>
      ) : (
        <>
          <Ojo x={26} tipo={c.ojos} />
          <Ojo x={38} tipo={c.ojos} />
        </>
      )}

      {/* nariz: tabique, ala y fosa, con un hilo de luz en el puente */}
      <path d="M32 34 v4.2 l1.9 1.3" stroke={sombra} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.4" />
      <path d="M30.2 39.3 q1 0.9 2.2 0.9" stroke={sombra} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.22" />
      <circle cx="33.7" cy="39.8" r="0.55" fill={sombra} opacity="0.3" />
      <path d="M31.2 34.5 v3.4" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.12" />
      {/* pómulos: un beso de luz a la izquierda (donde pega la lámpara) */}
      <ellipse cx="24" cy="37.6" rx="2.8" ry="1.7" fill="#ffffff" opacity="0.06" />

      {/* vello facial (bajo la boca en el orden de pintado: la enmarca, no la tapa) */}
      {c.vello === "bigote" && <Bigote pelo={c.pelo} />}
      {c.vello === "perilla" && (
        <>
          <path d="M29.6 46.6 q2.4 1.8 4.8 0 q0.2 4 -2.4 4 q-2.6 0 -2.4 -4 z" fill={c.pelo} />
          <path d="M30.6 47.6 q1.4 0.9 2.8 0" stroke="#ffffff" strokeWidth="0.6" opacity="0.1" fill="none" />
        </>
      )}
      {c.vello === "candado" && (
        <>
          <Bigote pelo={c.pelo} />
          {/* rieles que bajan del bigote al mentón, dejando la boca a la vista */}
          <path d="M26.6 43.2 q-0.6 3.4 0.8 5.8 M37.4 43.2 q0.6 3.4 -0.8 5.8" stroke={c.pelo} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M27.2 48.4 q4.8 4.4 9.6 0 q-0.9 4.6 -4.8 4.6 q-3.9 0 -4.8 -4.6 z" fill={c.pelo} />
        </>
      )}
      {c.vello === "barba" && (
        <>
          <path d="M21 38 q1 13.5 11 14.5 q10 -1 11 -14.5 q-3 7.2 -11 7.2 q-8 0 -11 -7.2 z" fill={c.pelo} />
          <path d="M24 46 q8 4 16 0 q-8 6 -16 0 z" fill={sombra} opacity="0.12" />
          {/* claro para la boca dentro de la barba */}
          <ellipse cx="32" cy="44.6" rx="4.6" ry="2" fill={c.piel} />
        </>
      )}

      {/* boca (con diente de oro si corresponde) — siempre sobre el vello */}
      {c.boca === "seria" ? (
        <path d="M28 44.5 h8" stroke="#7a4636" strokeWidth="1.7" strokeLinecap="round" />
      ) : c.boca === "torcida" ? (
        <path d="M28 44 q4 2.6 8 -0.6" stroke="#7a4636" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      ) : c.boca === "mueca" ? (
        <path d="M28 45 q4 -2.2 8 0.6" stroke="#7a4636" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M28 44 q4 2.2 8 0" stroke="#7a4636" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      )}
      {animo === "feliz" && (
        <path d="M27.5 43.2 q4.5 4.6 9 0 q-1.4 3.4 -4.5 3.4 q-3.1 0 -4.5 -3.4 z" fill="#5a2d24" stroke="#7a4636" strokeWidth="0.8" />
      )}
      {/* brillo del labio inferior: da vida sin dibujar labios completos */}
      <path d="M29.8 46.4 q2.2 1.1 4.4 0" stroke="#ffffff" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.1" />
      {c.extra === "diente" && <rect x="31.2" y="43.4" width="1.9" height="2.2" rx="0.4" fill={ORO} />}

      {/* pelo / sombrero / capucha (encima) */}
      {c.top === "corto" && (
        <>
          <path d="M18 31 q-1 -17 14 -17 q15 0 14 17 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />
          <path d="M19 27 q5 -8 13 -8 q8 0 13 8 q-6 -4 -13 -4 q-7 0 -13 4 z" fill="#ffffff" opacity="0.06" />
        </>
      )}
      {c.top === "raya" && (
        <>
          <path d="M18 31 q-1 -17 14 -17 q15 0 14 17 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />
          <path d="M30 15 q4 4 1 9" stroke="#00000044" strokeWidth="1.5" fill="none" />
          <path d="M19 27 q5 -8 13 -8 q8 0 13 8 q-6 -4 -13 -4 q-7 0 -13 4 z" fill="#ffffff" opacity="0.05" />
        </>
      )}
      {c.top === "calvo" && (
        <>
          <path d="M20 22 q12 -7 24 0 q-4 -3 -12 -3 q-8 0 -12 3 z" fill="#ffffff" opacity="0.05" />
          <ellipse cx="27" cy="20" rx="5" ry="2.4" fill="#ffffff" opacity="0.06" />
        </>
      )}
      {c.top === "mono" && (
        <>
          <path d="M18 30 q-1 -16 14 -16 q15 0 14 16 q-3 -7 -14 -7 q-11 0 -14 7 z" fill={c.pelo} />
          <circle cx="32" cy="11" r="5" fill={c.pelo} />
          <circle cx="30.5" cy="9.6" r="1.6" fill="#ffffff" opacity="0.08" />
        </>
      )}
      {c.top === "largo" && (
        <>
          <path d="M18 32 q-1 -18 14 -18 q15 0 14 18 q-3 -8 -14 -8 q-11 0 -14 8 z" fill={c.pelo} />
          <path d="M19 28 q5 -9 13 -9 q8 0 13 9 q-6 -5 -13 -5 q-7 0 -13 5 z" fill="#ffffff" opacity="0.05" />
        </>
      )}
      {c.top === "gorra" && (
        <>
          <path d="M17 25 q0 -13 15 -13 q15 0 15 13 z" fill={FIELTRO} />
          <path d="M17 25 q0 -13 15 -13 q15 0 15 13" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
          <path d="M30 25 h18 q1 2 -1 3 h-17 z" fill={FIELTRO_2} />
          <circle cx="32" cy="13" r="1.7" fill={ORO} />
        </>
      )}
      {c.top === "fedora" && (
        <>
          <path d="M12 25 q20 -8.5 40 0 q-20 5.5 -40 0 z" fill={FIELTRO} />
          <path d="M19 24 q0 -12 13 -12 q13 0 13 12 z" fill={FIELTRO} />
          <path d="M19 24 q0 -12 13 -12 q13 0 13 12" fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
          <path d="M19 22.5 h26" stroke={ORO} strokeWidth="1.6" opacity="0.85" />
          <path d="M12 25 q20 -3 40 0" fill="none" stroke={sombra} strokeOpacity="0.25" strokeWidth="0.8" />
        </>
      )}
      {c.top === "tongo" && (
        /* bombín: el sombrero del hampa elegante */
        <>
          <path d="M16 26 q16 -5 32 0 q-3 2.5 -16 2.5 q-13 0 -16 -2.5 z" fill={FIELTRO} />
          <path d="M21 26 q0 -13 11 -13 q11 0 11 13 z" fill={FIELTRO} />
          <path d="M21 26 q0 -13 11 -13 q11 0 11 13" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="1" />
          <path d="M21.5 24.5 h21" stroke={ORO} strokeWidth="1.3" opacity="0.7" />
        </>
      )}
      {c.top === "capucha" && (
        <>
          <path d="M13 40 q-2 -28 19 -28 q21 0 19 28 q-5 -16 -19 -16 q-14 0 -19 16 z" fill="#16141c" />
          <path d="M13 40 q-2 -28 19 -28 q21 0 19 28" fill="none" stroke="rgba(200,162,74,0.22)" strokeWidth="1.2" />
          <path d="M19 26 q13 -11 26 0 q-13 -6 -26 0 z" fill={sombra} opacity="0.3" />
        </>
      )}

      {/* extras puntuales */}
      {c.extra === "cicatriz" && (
        <path d="M40 24.5 l1.7 8.5" stroke="#a86b5a" strokeWidth="1.2" strokeLinecap="round" />
      )}
      {c.extra === "monoculo" && !c.parche && (
        <>
          <circle cx="38" cy="33" r="4.6" fill="#bfe0ee" opacity="0.1" />
          <circle cx="38" cy="33" r="4.6" fill="none" stroke={ORO} strokeWidth="1.4" />
          <path d="M40.5 37 q2 5 0 9" stroke={ORO} strokeWidth="0.9" fill="none" opacity="0.8" />
        </>
      )}
      {c.extra === "cigarro" && (
        <>
          <rect x="36" y="45" width="9.5" height="2.3" rx="1" fill="#e9e3d2" transform="rotate(8 40 46)" />
          <rect x="36" y="45" width="2.4" height="2.3" rx="1" fill="#8a5a3b" transform="rotate(8 40 46)" />
          <circle cx="46" cy="46.8" r="1.3" fill="#e0703a" />
          <circle cx="46" cy="46.8" r="2.2" fill="#e0703a" opacity="0.25" />
        </>
      )}
      {/* brillo de oro extra para el diente: un puntito en la mejilla, sutil */}
      {c.extra === "diente" && <circle cx="32.1" cy="44.3" r="0.5" fill={ORO_CLARO} opacity="0.9" />}
    </svg>
  );
});
