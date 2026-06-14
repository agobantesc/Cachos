import type { Apuesta, Pinta } from "./types.js";

/**
 * Validación de apuestas (el corazón del juego).
 *
 * Una apuesta nueva debe ser ESTRICTAMENTE mayor que la vigente. El detalle fino
 * es la pinta 1 (As), que al ser comodín "vale el doble" y tiene reglas de
 * conversión propias. Acá usamos la convención estilo Perudo (la más difundida):
 *
 *  Apuesta vigente sobre pinta NORMAL (2..6) -> nueva sobre pinta NORMAL:
 *    - Sube la cantidad (con cualquier pinta), o
 *    - Mantiene la cantidad y sube la pinta.
 *
 *  Pinta NORMAL -> ASES (cambiar a comodín):
 *    - cantidadAses >= techo(cantidadActual / 2).
 *      Ej: tras "6 quinas" se puede entrar con "3 ases".
 *
 *  ASES -> pinta NORMAL (salir de comodín):
 *    - cantidad >= cantidadAses * 2 + 1, con cualquier pinta.
 *      Ej: tras "3 ases" se puede salir con "7 de cualquier pinta".
 *
 *  ASES -> ASES:
 *    - Sube la cantidad de ases.
 *
 * Si tu grupo usa otra conversión, este es el único lugar a tocar.
 */

const ES_AS = (p: Pinta) => p === 1;

/** Mínimo de ases necesario para entrar a ases desde una cantidad normal. */
export function asesMinimosDesdeNormal(cantidadNormal: number): number {
  return Math.ceil(cantidadNormal / 2);
}

/** Mínima cantidad normal para salir de ases. */
export function normalMinimoDesdeAses(cantidadAses: number): number {
  return cantidadAses * 2 + 1;
}

export interface ResultadoValidacion {
  valida: boolean;
  motivo?: string;
}

/** ¿Es la apuesta una jugada bien formada? (cantidad >= 1, pinta 1..6) */
export function apuestaBienFormada(a: Apuesta): boolean {
  return (
    Number.isInteger(a.cantidad) &&
    a.cantidad >= 1 &&
    Number.isInteger(a.pinta) &&
    a.pinta >= 1 &&
    a.pinta <= 6
  );
}

/**
 * ¿Puede `nueva` reemplazar a `actual`? Si `actual` es null, es la apertura de la
 * ronda y basta con que esté bien formada.
 *
 * `asesComodin` (por defecto true) controla las reglas del As: cuando es comodín
 * se usa la conversión estilo Perudo. En una ronda de obligado los ases NO son
 * comodín: ahí el As vale como la pinta 1 normal (1 < 2 < … < 6), sin conversión.
 */
export function validarApuesta(
  actual: Apuesta | null,
  nueva: Apuesta,
  asesComodin = true,
): ResultadoValidacion {
  if (!apuestaBienFormada(nueva)) {
    return { valida: false, motivo: "Apuesta mal formada (cantidad >= 1, pinta 1..6)." };
  }
  if (actual === null) {
    return { valida: true };
  }

  // Obligado (ases sin comodín): el As es la pinta 1, una pinta normal más.
  if (!asesComodin) {
    if (nueva.cantidad > actual.cantidad) return { valida: true };
    if (nueva.cantidad === actual.cantidad && nueva.pinta > actual.pinta) return { valida: true };
    return { valida: false, motivo: "Debes subir la cantidad, o mantenerla subiendo la pinta." };
  }

  const actualEsAs = ES_AS(actual.pinta);
  const nuevaEsAs = ES_AS(nueva.pinta);

  // ASES -> ASES
  if (actualEsAs && nuevaEsAs) {
    return nueva.cantidad > actual.cantidad
      ? { valida: true }
      : { valida: false, motivo: "Debes subir la cantidad de ases." };
  }

  // ASES -> NORMAL
  if (actualEsAs && !nuevaEsAs) {
    const min = normalMinimoDesdeAses(actual.cantidad);
    return nueva.cantidad >= min
      ? { valida: true }
      : { valida: false, motivo: `Para salir de ${actual.cantidad} ases necesitas al menos ${min}.` };
  }

  // NORMAL -> ASES
  if (!actualEsAs && nuevaEsAs) {
    const min = asesMinimosDesdeNormal(actual.cantidad);
    return nueva.cantidad >= min
      ? { valida: true }
      : { valida: false, motivo: `Para entrar a ases necesitas al menos ${min}.` };
  }

  // NORMAL -> NORMAL
  if (nueva.cantidad > actual.cantidad) return { valida: true };
  if (nueva.cantidad === actual.cantidad && nueva.pinta > actual.pinta) return { valida: true };
  return {
    valida: false,
    motivo: "Debes subir la cantidad, o mantenerla subiendo la pinta.",
  };
}
