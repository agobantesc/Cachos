import type { Pinta } from "../engine";

// Posición de los puntos (pips) en una grilla 3x3 (celdas 0..8) por cara.
const PIPS: Record<Pinta, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Dado({ cara, tam = 44 }: { cara: Pinta; tam?: number }) {
  const esAs = cara === 1;
  const pips = PIPS[cara];
  return (
    <div className={"dado" + (esAs ? " dado--as" : "")} style={{ width: tam, height: tam }}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={"pip" + (pips.includes(i) ? " pip--on" : "")} />
      ))}
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
