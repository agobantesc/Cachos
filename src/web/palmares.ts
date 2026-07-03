// El PALMARÉS del socio: récords persistentes (partidas, victorias, rachas,
// copas y finales de la historia). Vive en su propia clave de localStorage y
// falla en silencio donde no hay almacenamiento (tests, SSR).
const CLAVE = "cachos.palmares";

export interface Palmares {
  /** Mesas jugadas y ganadas (solo, torneo, historia y en línea). */
  jugadas: number;
  ganadas: number;
  /** Racha de mesas ganadas seguidas (actual y la mejor de la historia). */
  racha: number;
  mejorRacha: number;
  /** Torneos coronados. */
  copas: number;
  /** Finales de la campaña vistos ("estandar" | "malo" | "verdadero"). */
  finales: string[];
}

const VACIO: Palmares = { jugadas: 0, ganadas: 0, racha: 0, mejorRacha: 0, copas: 0, finales: [] };

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
    };
  } catch {
    return { ...VACIO };
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

/** Registra un torneo coronado. */
export function registrarCopa(): void {
  const p = leerPalmares();
  p.copas += 1;
  guardar(p);
}

/** Registra un final de la campaña visto (una sola vez por tipo). */
export function registrarFinal(tipo: string): void {
  const p = leerPalmares();
  if (!p.finales.includes(tipo)) {
    p.finales.push(tipo);
    guardar(p);
  }
}
