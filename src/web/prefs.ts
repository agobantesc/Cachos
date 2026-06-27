// Preferencias del jugador, persistidas en localStorage: para que la app
// recuerde tu nombre, dificultad y el último torneo elegido entre sesiones.
import type { Nivel } from "./bots";
import type { Cara } from "./Avatar";

const CLAVE = "cachos.prefs";

export interface Prefs {
  nombre?: string;
  nivel?: Nivel;
  rivales?: number;
  preset?: string;
  rampa?: boolean;
  /** Rostro personalizado del jugador. */
  cara?: Cara;
}

export function leerPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Prefs;
  } catch {
    return {};
  }
}

export function guardarPrefs(p: Prefs): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ ...leerPrefs(), ...p }));
  } catch {
    /* sin persistencia */
  }
}
