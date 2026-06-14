// IA de los jugadores controlados por la máquina (modo solitario).
//
// El bot decide SOLO con lo que un jugador real sabría: su propia mano y la
// información pública de la mesa (total de dados, apuesta vigente, etc.). Estima
// cuántos dados de cada pinta hay usando probabilidad (binomial) y elige entre
// dudar, calzar o subir la apuesta de forma creíble.
import { contarPinta, validarApuesta, type Apuesta, type EstadoPublico, type Pinta } from "../engine";

export type JugadaBot =
  | { tipo: "DUDAR" }
  | { tipo: "CALZAR" }
  | { tipo: "APOSTAR"; apuesta: Apuesta };

const PINTAS: Pinta[] = [2, 3, 4, 5, 6, 1]; // ases al final

function combinaciones(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
function binomPMF(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  return combinaciones(n, k) * p ** k * (1 - p) ** (n - k);
}
/** P(X >= kmin) con X ~ Binomial(n, p). */
function binomColaMayorIgual(n: number, kmin: number, p: number): number {
  if (kmin <= 0) return 1;
  let s = 0;
  for (let k = kmin; k <= n; k++) s += binomPMF(n, k, p);
  return s;
}

export function decidirBot(publico: EstadoPublico, miMano: Pinta[] | null, miId: string): JugadaBot {
  // Aproxima `asesComodinEnRonda` con las reglas por defecto (ases comodín salvo
  // en obligado). El bot solo necesita una estimación, no la regla exacta.
  const asesComodin = !publico.esRondaObligado;
  const total = publico.totalDadosEnMesa;
  const yo = publico.jugadores.find((j) => j.id === miId);
  const misDados = miMano ? miMano.length : yo?.cantidadDados ?? 0;
  const desconocidos = Math.max(0, total - misDados);
  const mano = miMano ?? []; // a ciegas (ronda cerrada): juega sin ver su mano

  const probUnidad = (P: Pinta) => (asesComodin && P !== 1 ? 1 / 3 : 1 / 6);
  const propiosDe = (P: Pinta) => contarPinta(mano, P, asesComodin);
  const estimadoDe = (P: Pinta) => propiosDe(P) + desconocidos * probUnidad(P);
  const probAlMenos = (P: Pinta, cant: number) =>
    binomColaMayorIgual(desconocidos, cant - propiosDe(P), probUnidad(P));
  const probExacto = (P: Pinta, cant: number) => {
    const faltan = cant - propiosDe(P);
    return faltan < 0 ? 0 : binomPMF(desconocidos, faltan, probUnidad(P));
  };

  const actual = publico.apuestaActual;

  // --- Apertura de ronda: apuesta sobre la pinta donde el bot es más fuerte. ---
  if (!actual) {
    let mejor: Pinta = 5;
    let mejorScore = -1;
    for (const P of PINTAS) {
      const score = propiosDe(P) * 2 + estimadoDe(P);
      if (score > mejorScore) {
        mejorScore = score;
        mejor = P;
      }
    }
    const cantidad = Math.max(1, Math.round(estimadoDe(mejor) * 0.8));
    return { tipo: "APOSTAR", apuesta: { cantidad, pinta: mejor } };
  }

  const obligadoBloqueaPinta = publico.esRondaObligado && misDados > 1;
  const probSostiene = probAlMenos(actual.pinta, actual.cantidad);

  // --- Calzar: si está disponible y el valor EXACTO es bastante probable. ---
  if (publico.calzoDisponible && !obligadoBloqueaPinta) {
    const pe = probExacto(actual.pinta, actual.cantidad);
    if (pe >= 0.25 && pe > 1 - probSostiene) return { tipo: "CALZAR" };
  }

  // --- Dudar: si la apuesta vigente es poco creíble. ---
  const umbralDuda = 0.34 + (Math.random() - 0.5) * 0.08; // leve variación humana
  if (probSostiene < umbralDuda) return { tipo: "DUDAR" };

  // --- Subir: la apuesta válida más creíble. ---
  const pintasPosibles: Pinta[] = obligadoBloqueaPinta ? [actual.pinta] : PINTAS;
  const candidatos: { apuesta: Apuesta; prob: number }[] = [];
  for (const Q of pintasPosibles) {
    for (let c = actual.cantidad; c <= actual.cantidad + 3; c++) {
      const apuesta: Apuesta = { cantidad: c, pinta: Q };
      if (!validarApuesta(actual, apuesta).valida) continue;
      candidatos.push({ apuesta, prob: probAlMenos(Q, c) });
      break; // la mínima cantidad válida para esta pinta es suficiente
    }
  }
  candidatos.sort((a, b) => b.prob - a.prob || a.apuesta.cantidad - b.apuesta.cantidad);
  const elegido = candidatos[0];
  if (elegido) return { tipo: "APOSTAR", apuesta: elegido.apuesta };

  // Salvaguarda (no debería ocurrir): si no hubo subida válida, duda.
  return { tipo: "DUDAR" };
}
