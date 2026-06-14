// IA de los jugadores controlados por la máquina (modo solitario), con niveles.
//
// El bot decide SOLO con lo que un jugador real sabría: su propia mano y la
// información pública de la mesa. Estima por probabilidad (binomial) cuántos
// dados de cada pinta hay y elige entre pasar, dudar, calzar o subir. Además
// maneja la regla del "paso" (pasar con 5 dados; dudar el paso ajeno).
import {
  contarPinta,
  pasoValido,
  validarApuesta,
  type Apuesta,
  type EstadoPublico,
  type Pinta,
} from "../engine";

export type Nivel = "facil" | "medio" | "avanzado";

export type JugadaBot =
  | { tipo: "DUDAR" }
  | { tipo: "CALZAR" }
  | { tipo: "PASAR" }
  | { tipo: "DUDAR_PASO" }
  | { tipo: "APOSTAR"; apuesta: Apuesta };

interface ParamsNivel {
  /** Probabilidad mínima al abrir (más alto = aperturas más prudentes). */
  umbralApertura: number;
  /** Si la apuesta vigente tiene menos prob. que esto, el bot duda. */
  umbralDuda: number;
  /** Amplitud del ruido aleatorio en las decisiones (más alto = más errático). */
  ruido: number;
  /** Prob. exacta mínima para animarse a calzar. */
  umbralCalzo: number;
  /** Prob. de pasar cuando la mano ES un paso válido. */
  pasaConValido: number;
  /** Prob. de pasar de farol con una mano inválida. */
  bluffPaso: number;
  /** Prob. de dudar el paso de otro (llamar el farol). */
  dudaPaso: number;
  /** Prob. mínima de una subida para preferirla a dudar. */
  subeSiSeguro: number;
}

const PARAMS: Record<Nivel, ParamsNivel> = {
  // Fácil: algo más arriesgado y errático, pero ya no se suicida con la siciliana.
  facil: { umbralApertura: 0.58, umbralDuda: 0.4, ruido: 0.15, umbralCalzo: 0.42, pasaConValido: 0.5, bluffPaso: 0.03, dudaPaso: 0.06, subeSiSeguro: 0.7 },
  // Medio: prudente y razonable.
  medio: { umbralApertura: 0.74, umbralDuda: 0.33, ruido: 0.06, umbralCalzo: 0.27, pasaConValido: 0.85, bluffPaso: 0.05, dudaPaso: 0.16, subeSiSeguro: 0.6 },
  // Avanzado: muy fino —abre seguro, calza y pasa óptimo, farolea de vez en cuando.
  avanzado: { umbralApertura: 0.85, umbralDuda: 0.3, ruido: 0.025, umbralCalzo: 0.22, pasaConValido: 0.98, bluffPaso: 0.1, dudaPaso: 0.33, subeSiSeguro: 0.55 },
};

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
function binomColaMayorIgual(n: number, kmin: number, p: number): number {
  if (kmin <= 0) return 1;
  let s = 0;
  for (let k = kmin; k <= n; k++) s += binomPMF(n, k, p);
  return s;
}

export function decidirBot(
  publico: EstadoPublico,
  miMano: Pinta[] | null,
  miId: string,
  nivel: Nivel = "medio",
): JugadaBot {
  const P = PARAMS[nivel];
  const asesComodin = !publico.esRondaObligado; // aprox. con reglas por defecto
  const total = publico.totalDadosEnMesa;
  const yo = publico.jugadores.find((j) => j.id === miId);
  const misDados = miMano ? miMano.length : yo?.cantidadDados ?? 0;
  const desconocidos = Math.max(0, total - misDados);
  const mano = miMano ?? [];

  const probUnidad = (Q: Pinta) => (asesComodin && Q !== 1 ? 1 / 3 : 1 / 6);
  const propiosDe = (Q: Pinta) => contarPinta(mano, Q, asesComodin);
  const probAlMenos = (Q: Pinta, cant: number) =>
    binomColaMayorIgual(desconocidos, cant - propiosDe(Q), probUnidad(Q));
  const probExacto = (Q: Pinta, cant: number) => {
    const faltan = cant - propiosDe(Q);
    return faltan < 0 ? 0 : binomPMF(desconocidos, faltan, probUnidad(Q));
  };

  const actual = publico.apuestaActual;
  const obligadoBloqueaPinta = publico.esRondaObligado && misDados > 1;

  // Mejor apuesta válida (apertura o subida) y su credibilidad.
  const construirApuesta = (): { apuesta: Apuesta; prob: number } => {
    if (!actual) {
      // Apertura A PRUEBA DE SICILIANA: si la dudan de inmediato, los ases NO
      // cuentan como comodín. Calculamos la apertura segura bajo ese conteo
      // (probabilidad 1/6 por dado, contando solo literales). Así abrir y que te
      // duden al toque normalmente lo paga el que duda, no el bot.
      const propiosSic = (Q: Pinta) => contarPinta(mano, Q, false);
      let Q: Pinta = 5;
      let best = -1;
      for (const cand of PINTAS) {
        const score = propiosSic(cand) * 2 + desconocidos / 6;
        if (score > best) {
          best = score;
          Q = cand;
        }
      }
      const probSic = (c: number) => binomColaMayorIgual(desconocidos, c - propiosSic(Q), 1 / 6);
      let c = 1;
      while (probSic(c + 1) >= P.umbralApertura) c++;
      const cantidad = Math.max(1, c);
      return { apuesta: { cantidad, pinta: Q }, prob: probSic(cantidad) };
    }
    const pintasPosibles: Pinta[] = obligadoBloqueaPinta ? [actual.pinta] : PINTAS;
    const cands: { apuesta: Apuesta; prob: number }[] = [];
    for (const Q of pintasPosibles) {
      for (let c = actual.cantidad; c <= actual.cantidad + 3; c++) {
        const apuesta: Apuesta = { cantidad: c, pinta: Q };
        if (!validarApuesta(actual, apuesta).valida) continue;
        cands.push({ apuesta, prob: probAlMenos(Q, c) });
        break;
      }
    }
    cands.sort((a, b) => b.prob - a.prob || a.apuesta.cantidad - b.apuesta.cantidad);
    return cands[0] ?? { apuesta: { cantidad: actual.cantidad + 1, pinta: actual.pinta }, prob: 0 };
  };

  // 1) Responder a un paso pendiente: dudar el paso o subir (no se puede calzar/dudar).
  if (publico.pasoPendienteJugadorId !== null) {
    if (Math.random() < P.dudaPaso) return { tipo: "DUDAR_PASO" };
    const { apuesta } = construirApuesta();
    return { tipo: "APOSTAR", apuesta };
  }

  // 2) ¿Pasar? Solo con los 5 dados, en ronda normal y si no pasó ya esta ronda.
  const yaPase = publico.historialRonda.some((ev) => ev.tipo === "PASO" && ev.jugadorId === miId);
  if (!publico.esRondaObligado && misDados === publico.dadosIniciales && miMano && !yaPase) {
    if (pasoValido(miMano)) {
      if (Math.random() < P.pasaConValido) return { tipo: "PASAR" };
    } else if (Math.random() < P.bluffPaso) {
      return { tipo: "PASAR" };
    }
  }

  // 3) Apertura.
  if (!actual) {
    const { apuesta } = construirApuesta();
    return { tipo: "APOSTAR", apuesta };
  }

  // 4) Calzar / Dudar / Subir.
  const probSostiene = probAlMenos(actual.pinta, actual.cantidad);
  if (publico.calzoDisponible && !obligadoBloqueaPinta) {
    const pe = probExacto(actual.pinta, actual.cantidad);
    if (pe >= P.umbralCalzo && pe > 1 - probSostiene) return { tipo: "CALZAR" };
  }

  const subida = construirApuesta();
  const umbralDuda = P.umbralDuda + (Math.random() - 0.5) * P.ruido;

  if (probSostiene < umbralDuda) {
    if (subida.prob >= P.subeSiSeguro) return { tipo: "APOSTAR", apuesta: subida.apuesta };
    return { tipo: "DUDAR" };
  }
  if (subida.prob >= 0.32 || probSostiene >= 0.55) {
    return { tipo: "APOSTAR", apuesta: subida.apuesta };
  }
  return { tipo: "DUDAR" };
}
