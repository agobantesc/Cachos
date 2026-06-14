import type { Pinta } from "./types.js";

/** Fuente de aleatoriedad inyectable (para poder testear con dados "cargados"). */
export type Aleatorio = () => number;

/** Lanza un dado con la fuente dada (default Math.random). */
export function lanzarDado(rng: Aleatorio = Math.random): Pinta {
  return ((Math.floor(rng() * 6) % 6) + 1) as Pinta;
}

/** Agita el cacho: devuelve `cantidad` caras nuevas. */
export function agitarCacho(cantidad: number, rng: Aleatorio = Math.random): Pinta[] {
  const dados: Pinta[] = [];
  for (let i = 0; i < cantidad; i++) dados.push(lanzarDado(rng));
  return dados;
}

/**
 * Cuenta cuántos dados cuentan para una pinta dada.
 *
 * Reglas:
 *  - Si se cuenta sobre ases (pinta === 1): sólo los dados que muestran 1.
 *    (El comodín no se "auto-suma": apostar ases es apostar ases.)
 *  - Si se cuenta sobre una pinta normal (2..6): los dados de esa pinta MÁS los
 *    ases, pero sólo cuando `asComodin` es true. En la ronda de obligado de esta
 *    casa el as deja de ser comodín, así que se pasa asComodin=false.
 */
export function contarPinta(dados: Pinta[], pinta: Pinta, asComodin: boolean): number {
  let total = 0;
  for (const d of dados) {
    if (d === pinta) total++;
    else if (pinta !== 1 && d === 1 && asComodin) total++;
  }
  return total;
}

/** Junta todos los dados de varias manos en un solo arreglo. */
export function juntarDados(manos: Pinta[][]): Pinta[] {
  return manos.flat();
}
