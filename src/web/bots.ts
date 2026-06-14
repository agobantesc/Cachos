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

export type Nivel = "facil" | "medio" | "avanzado" | "experto";

export type JugadaBot =
  | { tipo: "DUDAR" }
  | { tipo: "CALZAR" }
  | { tipo: "PASAR" }
  | { tipo: "DUDAR_PASO" }
  | { tipo: "APOSTAR"; apuesta: Apuesta };

interface ParamsNivel {
  /** Probabilidad mínima al abrir (más alto = aperturas más prudentes). */
  umbralApertura: number;
  /** Sesgo a subir en vez de dudar (más alto = más agresivo y menos preciso). */
  sesgoSubir: number;
  /** Amplitud del ruido aleatorio en las decisiones (más alto = más errático). */
  ruido: number;
  /** Prob. exacta mínima para considerar calzar. */
  umbralCalzo: number;
  /** Prob. de pasar cuando la mano ES un paso válido. */
  pasaConValido: number;
  /** Prob. de pasar de farol con una mano inválida. */
  bluffPaso: number;
  /** Prob. de dudar el paso de otro (llamar el farol). */
  dudaPaso: number;
  /** Dados que se asume tiene el apostador de su pinta (señal de la apuesta). */
  creditoApuesta: number;
  /** Cuánto se descuenta ese crédito por cada dado de salto agresivo (sospecha
   * de farol): a mayor salto sobre lo esperado, menos crédito y más ganas de dudar. */
  descuentoFarol: number;
  /** Prob. de farolear una subida (subir más de lo seguro) para ser impredecible. */
  farolea: number;
  /** Crédito extra por cada OTRO jugador que apostó esa pinta en la ronda
   * (apoyo en el historial: una pinta muy declarada suele ser real). */
  lecturaHistorial: number;
}

const PARAMS: Record<Nivel, ParamsNivel> = {
  // Fácil: agresivo y errático (sube de más y se deja cazar); ignora la señal de
  // la apuesta, así que duda mal. Ya no se suicida con la siciliana al abrir.
  facil: { umbralApertura: 0.56, sesgoSubir: 0.18, ruido: 0.16, umbralCalzo: 0.42, pasaConValido: 0.5, bluffPaso: 0.04, dudaPaso: 0.07, creditoApuesta: 0.1, descuentoFarol: 0, farolea: 0.06, lecturaHistorial: 0 },
  // Medio: equilibrado; lee algo la señal y sospecha un poco de los saltos grandes.
  medio: { umbralApertura: 0.74, sesgoSubir: 0.09, ruido: 0.06, umbralCalzo: 0.3, pasaConValido: 0.8, bluffPaso: 0.04, dudaPaso: 0.08, creditoApuesta: 0.8, descuentoFarol: 0.12, farolea: 0.05, lecturaHistorial: 0.2 },
  // Avanzado: EV fuerte —lee la señal, calza/pasa bien y farolea de a poco.
  avanzado: { umbralApertura: 0.8, sesgoSubir: 0.05, ruido: 0.035, umbralCalzo: 0.23, pasaConValido: 0.95, bluffPaso: 0.05, dudaPaso: 0.09, creditoApuesta: 1.1, descuentoFarol: 0.18, farolea: 0.06, lecturaHistorial: 0.3 },
  // Experto: el núcleo EV de avanzado + castigo a los errores del humano —lee el
  // HISTORIAL de la ronda (apoyo por pinta), afila la sospecha de farol y el calzo
  // y es algo más impredecible. Contra un humano que farolea, pega más fuerte.
  experto: { umbralApertura: 0.8, sesgoSubir: 0.04, ruido: 0.02, umbralCalzo: 0.2, pasaConValido: 1, bluffPaso: 0.05, dudaPaso: 0.09, creditoApuesta: 1.15, descuentoFarol: 0.28, farolea: 0.07, lecturaHistorial: 0.5 },
};

const PINTAS: Pinta[] = [2, 3, 4, 5, 6, 1]; // ases al final

// Si la mejor jugada (dudar/subir/calzar) tiene un valor esperado por debajo de
// esto, el bot está acorralado y recién ahí considera quemar su paso defensivo.
const UMBRAL_APURO = 0.42;

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
  const asesComodin = publico.asesComodin;
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
        if (!validarApuesta(actual, apuesta, publico.asesComodinApuesta).valida) continue;
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

  // 2) Apertura: el abridor SIEMPRE abre con una apuesta. Nunca parte pasando: el
  //    paso es un recurso defensivo que se guarda para un apuro real (ver paso 5).
  if (!actual) {
    const { apuesta } = construirApuesta();
    return { tipo: "APOSTAR", apuesta };
  }

  // 4) Calzar / Dudar / Subir — elige la acción con MAYOR probabilidad de buen
  //    resultado. Todo se mide con binomial sobre los dados desconocidos, es
  //    decir, según el total de dados en juego (que baja a lo largo de la mano).
  // P(la apuesta vigente es cierta). Se acredita al apostador parte de su pinta
  // (apostó porque algo tiene), PERO ese crédito se descuenta si la apuesta es un
  // salto agresivo sobre lo esperado: ahí puede estar mintiendo. No se asume 100%.
  const pUnit = probUnidad(actual.pinta);
  const esperadoNeutral = propiosDe(actual.pinta) + desconocidos * pUnit;
  const exceso = Math.max(0, actual.cantidad - esperadoNeutral); // cuánto excede lo neutral
  // Apoyo en el historial: otros jugadores (no yo, no el apostador actual) que ya
  // declararon esta pinta en la ronda -> probablemente la tienen (lectura experta).
  const apoyadores = new Set(
    publico.historialRonda
      .filter(
        (ev) =>
          ev.tipo === "APUESTA" &&
          ev.apuesta.pinta === actual.pinta &&
          ev.jugadorId !== miId &&
          ev.jugadorId !== publico.apuestaActualJugadorId,
      )
      .map((ev) => ev.jugadorId),
  );
  const credito =
    Math.max(0, P.creditoApuesta - exceso * P.descuentoFarol) + apoyadores.size * P.lecturaHistorial;
  const kFaltan = Math.round(actual.cantidad - propiosDe(actual.pinta) - credito);
  const pSostiene = binomColaMayorIgual(desconocidos, kFaltan, pUnit);
  const pFalla = 1 - pSostiene; // P(es falsa) -> dudar gana
  const subida = construirApuesta(); // mejor subida y P(que sea cierta)
  const ruido = () => (Math.random() - 0.5) * P.ruido;

  // Valor probabilístico de cada opción (mayor = mejor):
  let mejor: JugadaBot = { tipo: "DUDAR" };
  let valor = pFalla + ruido();

  // Subir traslada el riesgo al siguiente: vale según P(mi nueva apuesta sea
  // cierta), con un pequeño sesgo a mantener presión (mayor en niveles fáciles).
  const valorSubir = subida.prob + P.sesgoSubir + ruido();
  if (valorSubir > valor) {
    mejor = { tipo: "APOSTAR", apuesta: subida.apuesta };
    valor = valorSubir;
  }

  // Calzar recupera un dado si la cantidad es EXACTA: lo valoramos con un bonus,
  // sobre un piso de probabilidad por nivel.
  if (publico.calzoDisponible && !obligadoBloqueaPinta) {
    const pExact = probExacto(actual.pinta, actual.cantidad);
    if (pExact >= P.umbralCalzo) {
      const valorCalzo = pExact + 0.18 + ruido();
      if (valorCalzo > valor) {
        mejor = { tipo: "CALZAR" };
        valor = valorCalzo;
      }
    }
  }

  // Paso DEFENSIVO: sólo como escape de un apuro real —cuando ninguna jugada es
  // buena (`valor` bajo)— y nunca al abrir. Un buen jugador guarda el paso para
  // cuando lo acorralan, no lo malgasta. Requiere los 5 dados y no haber pasado.
  const yaPase = publico.historialRonda.some((ev) => ev.tipo === "PASO" && ev.jugadorId === miId);
  const puedePasar =
    !publico.esRondaObligado && misDados === publico.dadosIniciales && !!miMano && !yaPase;
  if (puedePasar && valor < UMBRAL_APURO) {
    if (pasoValido(mano)) {
      if (Math.random() < P.pasaConValido) return { tipo: "PASAR" };
    } else if (Math.random() < P.bluffPaso) {
      return { tipo: "PASAR" };
    }
  }

  // Farol propio: a veces sube un punto más de lo seguro para no dejarse leer
  // (más frecuente en niveles altos). Sigue siendo una apuesta válida.
  if (mejor.tipo === "APOSTAR" && Math.random() < P.farolea) {
    mejor = { tipo: "APOSTAR", apuesta: { ...mejor.apuesta, cantidad: mejor.apuesta.cantidad + 1 } };
  }

  return mejor;
}
