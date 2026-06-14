import type { ReglasCasa } from "./types.js";

/**
 * Reglas por defecto: Cacho chileno + las 3 variantes de la casa.
 *
 * NOTA: la conversión de ases al subir apuestas (ver bids.ts) usa la convención
 * estilo Perudo (la más común). Si tu grupo usa otra, se cambia ahí.
 */
export const REGLAS_POR_DEFECTO: ReglasCasa = {
  dadosIniciales: 5,
  asComodin: true,

  obligadoActivo: true,
  obligadoCerradoParaOtros: true,
  obligadoAsesNoComodin: true,

  sicilianaActiva: true,
  sicilianaDadosPerdidos: 2,

  calzarPermitido: true,
  calzarRecuperaDado: true,
};

export function crearReglas(overrides: Partial<ReglasCasa> = {}): ReglasCasa {
  return { ...REGLAS_POR_DEFECTO, ...overrides };
}
