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
  // P(hay al menos `cant` de la pinta P en toda la mesa).
  const probAlMenos = (P: Pinta, cant: number) =>
    binomColaMayorIgual(desconocidos, cant - propiosDe(P), probUnidad(P));
  const probExacto = (P: Pinta, cant: number) => {
    const faltan = cant - propiosDe(P);
    return faltan < 0 ? 0 : binomPMF(desconocidos, faltan, probUnidad(P));
  };

  // Pinta donde el bot es más fuerte (más propios; desempata por estimado).
  const mejorPinta = (): Pinta => {
    let mejor: Pinta = 5;
    let score = -1;
    for (const P of PINTAS) {
      const s = propiosDe(P) * 2 + estimadoDe(P);
      if (s > score) {
        score = s;
        mejor = P;
      }
    }
    return mejor;
  };

  const actual = publico.apuestaActual;

  // --- Apertura PRUDENTE -----------------------------------------------------
  // Abre con la cantidad más alta que aún sea muy probable que se cumpla (~72%).
  // Así un dudo inmediato (siciliana) lo paga normalmente el que duda, no el bot.
  if (!actual) {
    const P = mejorPinta();
    let cantidad = 1;
    while (probAlMenos(P, cantidad + 1) >= 0.72) cantidad++;
    return { tipo: "APOSTAR", apuesta: { cantidad: Math.max(1, cantidad), pinta: P } };
  }

  const obligadoBloqueaPinta = publico.esRondaObligado && misDados > 1;
  const probSostiene = probAlMenos(actual.pinta, actual.cantidad);

  // Mejor subida VÁLIDA y su credibilidad (la cantidad mínima legal por pinta).
  const pintasPosibles: Pinta[] = obligadoBloqueaPinta ? [actual.pinta] : PINTAS;
  const candidatos: { apuesta: Apuesta; prob: number }[] = [];
  for (const Q of pintasPosibles) {
    for (let c = actual.cantidad; c <= actual.cantidad + 3; c++) {
      const apuesta: Apuesta = { cantidad: c, pinta: Q };
      if (!validarApuesta(actual, apuesta).valida) continue;
      candidatos.push({ apuesta, prob: probAlMenos(Q, c) });
      break;
    }
  }
  candidatos.sort((a, b) => b.prob - a.prob || a.apuesta.cantidad - b.apuesta.cantidad);
  const mejorSubida = candidatos[0];

  // --- Calzar: si está disponible y el valor EXACTO es lo más probable. ------
  if (publico.calzoDisponible && !obligadoBloqueaPinta) {
    const pe = probExacto(actual.pinta, actual.cantidad);
    if (pe >= 0.28 && pe > 1 - probSostiene) return { tipo: "CALZAR" };
  }

  // --- Dudar vs Subir --------------------------------------------------------
  const umbralDuda = 0.33 + (Math.random() - 0.5) * 0.06; // leve variación humana

  // La apuesta vigente es poco creíble: dudar, salvo que tenga una subida segura.
  if (probSostiene < umbralDuda) {
    if (mejorSubida && mejorSubida.prob >= 0.6) {
      return { tipo: "APOSTAR", apuesta: mejorSubida.apuesta };
    }
    return { tipo: "DUDAR" };
  }

  // La apuesta vigente es creíble: subir con lo mejor. Pero si ninguna subida es
  // defendible y la vigente está al borde, es mejor dudar que mentir a ciegas.
  if (mejorSubida && (mejorSubida.prob >= 0.32 || probSostiene >= 0.55)) {
    return { tipo: "APOSTAR", apuesta: mejorSubida.apuesta };
  }
  return { tipo: "DUDAR" };
}
