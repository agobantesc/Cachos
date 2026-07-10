import { memo } from "react";
import type { Pinta } from "../engine";

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
export const Dado = memo(function Dado({ cara, tam = 44 }: { cara: Pinta; tam?: number }) {
  const esAs = cara === 1;
  const fondo = esAs ? "#fbf3d6" : "#ece6d5";
  const canto = esAs ? "#c9b06a" : "#b8b099";
  const borde = esAs ? "#c8a24a" : "rgba(60, 50, 30, 0.35)";
  const punto = esAs ? "#b23a2e" : "#221c12";
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
      <rect x="10" y="8" width="80" height="24" rx="12" fill="#ffffff" opacity="0.3" />
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
