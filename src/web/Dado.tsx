import type { Pinta } from "../engine";

// Posición (en un viewBox 0..100) de cada punto posible en la grilla 3x3.
const POS: ReadonlyArray<readonly [number, number]> = [
  [25, 25], [50, 25], [75, 25],
  [25, 50], [50, 50], [75, 50],
  [25, 75], [50, 75], [75, 75],
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
 * Dibuja los puntos como SVG (círculos con coordenadas fijas). Es robusto en
 * todos los navegadores —en especial iOS Safari, que colapsaba los puntos
 * cuando dependían de alto en porcentaje dentro de una grilla CSS.
 */
export function Dado({ cara, tam = 44 }: { cara: Pinta; tam?: number }) {
  const esAs = cara === 1;
  return (
    <div className={"dado" + (esAs ? " dado--as" : "")} style={{ width: tam, height: tam }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label={`dado ${cara}`}>
        {PIPS[cara].map((i) => (
          <circle key={i} className="pip" cx={POS[i]![0]} cy={POS[i]![1]} r={10.5} />
        ))}
      </svg>
    </div>
  );
}

/** Dado boca abajo: para mostrar el vaso de otro jugador (sin revelar la cara). */
export function DadoOculto({ tam = 28 }: { tam?: number }) {
  return <div className="dado dado--oculto" style={{ width: tam, height: tam }} />;
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
