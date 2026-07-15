// El PALMARÉS del socio: récords persistentes (partidas, victorias, rachas,
// copas y finales de la historia). Vive en su propia clave de localStorage y
// falla en silencio donde no hay almacenamiento (tests, SSR).
const CLAVE = "cachos.palmares";

export interface Palmares {
  /** Mesas jugadas y ganadas (historia, solo y en línea). */
  jugadas: number;
  ganadas: number;
  /** Racha de mesas ganadas seguidas (actual y la mejor de la historia). */
  racha: number;
  mejorRacha: number;
  /** Torneos coronados (histórico; el modo torneo ya no existe). */
  copas: number;
  /** Finales de la campaña vistos ("estandar" | "malo" | "verdadero"). */
  finales: string[];
  /** Logros desbloqueados (ids del catálogo LOGROS de la historia). */
  logros: string[];
}

// Un palmarés en blanco, SIEMPRE fresco: si fuera un objeto compartido, sus
// arrays (finales, logros) se mutarían entre lecturas cuando no hay storage
// (tests, SSR, modo privado) y los registros se "filtrarían" entre sesiones.
function vacio(): Palmares {
  return { jugadas: 0, ganadas: 0, racha: 0, mejorRacha: 0, copas: 0, finales: [], logros: [] };
}

export function leerPalmares(): Palmares {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Partial<Palmares>;
    return {
      jugadas: p.jugadas ?? 0,
      ganadas: p.ganadas ?? 0,
      racha: p.racha ?? 0,
      mejorRacha: p.mejorRacha ?? 0,
      copas: p.copas ?? 0,
      finales: Array.isArray(p.finales) ? p.finales : [],
      logros: Array.isArray(p.logros) ? p.logros : [],
    };
  } catch {
    return vacio();
  }
}

function guardar(p: Palmares): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin persistencia */
  }
}

/** Registra el resultado de una mesa (cuenta partidas, victorias y racha). */
export function registrarPartida(gano: boolean): void {
  const p = leerPalmares();
  p.jugadas += 1;
  if (gano) {
    p.ganadas += 1;
    p.racha += 1;
    if (p.racha > p.mejorRacha) p.mejorRacha = p.racha;
  } else {
    p.racha = 0;
  }
  guardar(p);
}

/** Registra un logro desbloqueado. Devuelve true si es NUEVO (para avisar). */
export function registrarLogro(id: string): boolean {
  const p = leerPalmares();
  if (p.logros.includes(id)) return false;
  p.logros.push(id);
  guardar(p);
  return true;
}

/** Registra un final de la campaña visto (una sola vez por tipo). */
export function registrarFinal(tipo: string): void {
  const p = leerPalmares();
  if (!p.finales.includes(tipo)) {
    p.finales.push(tipo);
    guardar(p);
  }
}
