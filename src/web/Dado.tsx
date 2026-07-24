import { memo } from "react";
import type { Pinta } from "../engine";

// --- Pieles de dados (cosméticos del Ropero) --------------------------------
// Cada piel define los colores del dado normal y del as. La piel activa es un
// global de módulo (como la cara del jugador en Avatar): se fija al arrancar
// y al equipar en el Ropero — nunca a mitad de una mesa.
export interface PielDado {
  fondo: string;
  canto: string;
  borde: string;
  punto: string;
  brillo: number;
  as: { fondo: string; canto: string; borde: string; punto: string };
}

const PIELES: Record<string, PielDado> = {
  "dados-clasicos": {
    fondo: "#ece6d5", canto: "#b8b099", borde: "rgba(60, 50, 30, 0.35)", punto: "#221c12", brillo: 0.3,
    as: { fondo: "#fbf3d6", canto: "#c9b06a", borde: "#c8a24a", punto: "#b23a2e" },
  },
  "dados-obsidiana": {
    fondo: "#23242c", canto: "#0d0e12", borde: "rgba(200, 162, 74, 0.55)", punto: "#e6c878", brillo: 0.12,
    as: { fondo: "#2c2416", canto: "#171208", borde: "#c8a24a", punto: "#e6c878" },
  },
  "dados-sangre": {
    fondo: "#8f2d24", canto: "#5c1d17", borde: "rgba(20, 8, 6, 0.5)", punto: "#f1e6d0", brillo: 0.18,
    as: { fondo: "#a83326", canto: "#6e211a", borde: "#e6c878", punto: "#e6c878" },
  },
  "dados-oro": {
    fondo: "#e6c878", canto: "#a87f2e", borde: "rgba(90, 62, 14, 0.55)", punto: "#241a08", brillo: 0.42,
    as: { fondo: "#f2daa0", canto: "#b8903c", borde: "#8f2d24", punto: "#8f2d24" },
  },
  "dados-dia": {
    fondo: "#1d2740", canto: "#101627", borde: "rgba(160, 180, 210, 0.45)", punto: "#cdd8ea", brillo: 0.15,
    as: { fondo: "#243252", canto: "#141d33", borde: "#e6c878", punto: "#e6c878" },
  },
  "dados-esmeralda": {
    fondo: "#1d4a34", canto: "#0f2e1f", borde: "rgba(200, 162, 74, 0.4)", punto: "#e9e3d2", brillo: 0.18,
    as: { fondo: "#245c40", canto: "#143526", borde: "#e6c878", punto: "#e6c878" },
  },
  "dados-campeon": {
    fondo: "#b0793e", canto: "#7a5228", borde: "rgba(40, 24, 10, 0.5)", punto: "#241408", brillo: 0.35,
    as: { fondo: "#c48a4a", canto: "#8a5e2e", borde: "#e6c878", punto: "#8f2d24" },
  },
  "dados-humo": {
    fondo: "#4a4a52", canto: "#2c2c33", borde: "rgba(200, 200, 210, 0.25)", punto: "#d9d5c9", brillo: 0.1,
    as: { fondo: "#55555e", canto: "#33333b", borde: "#c8a24a", punto: "#e6c878" },
  },
  "dados-marfil": {
    fondo: "#efe3c0", canto: "#c2ac7c", borde: "#a08c5a", punto: "#4a3a22", brillo: 0.25,
    as: { fondo: "#f6ecc9", canto: "#cbb076", borde: "#8f2d24", punto: "#8f2d24" },
  },
};

let _piel: PielDado = PIELES["dados-clasicos"]!;
export function fijarPielDados(id: string): void {
  _piel = PIELES[id] ?? PIELES["dados-clasicos"]!;
}

// Posición (en un viewBox 0..100) de cada punto posible en la grilla 3x3.
const POS: ReadonlyArray<readonly [number, number]> = [
  [27, 27], [50, 27], [73, 27],
  [27, 50], [50, 50], [73, 50],
  [27, 73], [50, 73], [73, 73],
];

// Qué celdas de la grilla 3x3 lleva encendidas cada cara.
const PIPS: Record<Pinta, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/**
 * Un dado es UN SVG autocontenido: cuerpo, bisel, brillo y puntos van dentro
 * del mismo SVG con colores en atributos `fill` — sin defs, gradientes con id
 * ni CSS, para que se vea idéntico en todo navegador (iOS Safari incluido).
 * El volumen se simula con capas: canto inferior más oscuro, cara de marfil,
 * lámina de brillo arriba y pips "grabados" (borde de luz abajo a la derecha).
 */
export const Dado = memo(function Dado({ cara, tam = 44, pielId }: { cara: Pinta; tam?: number; pielId?: string }) {
  const piel = pielId ? PIELES[pielId] ?? _piel : _piel;
  const esAs = cara === 1;
  const fondo = esAs ? piel.as.fondo : piel.fondo;
  const canto = esAs ? piel.as.canto : piel.canto;
  const borde = esAs ? piel.as.borde : piel.borde;
  const punto = esAs ? piel.as.punto : piel.punto;
  return (
    <svg
      className="dado"
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`dado ${cara}`}
    >
      {/* canto inferior (le da grosor al dado) */}
      <rect x="4" y="8" width="92" height="89" rx="19" fill={canto} />
      {/* cara */}
      <rect x="4" y="3" width="92" height="90" rx="19" fill={fondo} stroke={borde} strokeWidth={esAs ? 3 : 2} />
      {/* lámina de brillo superior */}
      <rect x="10" y="8" width="80" height="24" rx="12" fill="#ffffff" opacity={piel.brillo} />
      {/* sombra interior del borde inferior de la cara */}
      <rect x="10" y="74" width="80" height="13" rx="7" fill="#000000" opacity="0.05" />
      {PIPS[cara].map((i) => (
        <g key={i}>
          {/* borde de luz: el pip se ve grabado en el marfil */}
          <circle cx={POS[i]![0] + 1.3} cy={POS[i]![1] + 1.5} r={9.6} fill="#ffffff" opacity="0.5" />
          <circle cx={POS[i]![0]} cy={POS[i]![1]} r={9.4} fill={punto} />
          {/* chispa de luz dentro del pip */}
          <circle cx={POS[i]![0] - 3} cy={POS[i]![1] - 3.2} r={2.2} fill="#ffffff" opacity={esAs ? 0.35 : 0.18} />
        </g>
      ))}
    </svg>
  );
});

/** Dado boca abajo: para mostrar el vaso de otro jugador (sin revelar la cara). */
export function DadoOculto({ tam = 28 }: { tam?: number }) {
  return (
    <svg className="dado" width={tam} height={tam} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="4" y="8" width="92" height="89" rx="19" fill="#0e0f14" />
      <rect x="4" y="3" width="92" height="90" rx="19" fill="#1d1f27" stroke="rgba(200,162,74,0.3)" strokeWidth="2" />
      <rect x="10" y="8" width="80" height="22" rx="11" fill="#ffffff" opacity="0.05" />
      <circle cx="50" cy="50" r="7" fill="none" stroke="rgba(200,162,74,0.35)" strokeWidth="2.5" />
    </svg>
  );
}

export function ManoDados({ caras, tam }: { caras: Pinta[]; tam?: number }) {
  return (
    <div className="mano-dados">
      {caras.map((c, i) => (
        <Dado key={i} cara={c} {...(tam !== undefined ? { tam } : {})} />
      ))}
    </div>
  );
}
