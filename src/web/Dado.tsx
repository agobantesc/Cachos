import { memo } from "react";
import type { Pinta } from "../engine";

// Posición (en un viewBox 0..100) de cada punto posible en la grilla 3x3.
const POS: ReadonlyArray<readonly [number, number]> = [
  [26, 26], [50, 26], [74, 26],
  [26, 50], [50, 50], [74, 50],
  [26, 74], [50, 74], [74, 74],
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
 * Un dado es UN SVG autocontenido: el cuerpo (rect) y los puntos (circles) van
 * dentro del mismo SVG, con tamaño en píxeles y colores en atributos `fill`.
 * No depende de CSS ni de tamaños en porcentaje —se ve igual en todo navegador
 * (iOS Safari incluido), que era justo donde los puntos desaparecían.
 */
export const Dado = memo(function Dado({ cara, tam = 44 }: { cara: Pinta; tam?: number }) {
  const esAs = cara === 1;
  const fondo = esAs ? "#fbf3d6" : "#e9e3d2";
  const borde = esAs ? "#c8a24a" : "rgba(0,0,0,0.12)";
  const punto = esAs ? "#b23a2e" : "#15110a";
  return (
    <svg
      className="dado"
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`dado ${cara}`}
    >
      <rect x="3" y="3" width="94" height="94" rx="20" fill={fondo} stroke={borde} strokeWidth={esAs ? 3 : 2} />
      {PIPS[cara].map((i) => (
        <circle key={i} cx={POS[i]![0]} cy={POS[i]![1]} r={9.5} fill={punto} />
      ))}
    </svg>
  );
});

/** Dado boca abajo: para mostrar el vaso de otro jugador (sin revelar la cara). */
export function DadoOculto({ tam = 28 }: { tam?: number }) {
  return (
    <svg className="dado" width={tam} height={tam} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="3" y="3" width="94" height="94" rx="20" fill="#1d1f27" stroke="rgba(200,162,74,0.25)" strokeWidth="2" />
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
