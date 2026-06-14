import { useEffect, useReducer } from "react";
import type { Apuesta, Pinta } from "../engine";
import type { Instantanea, Transporte } from "./transporte";

export const PLURAL_PINTA: Record<Pinta, string> = {
  1: "ases",
  2: "tontos",
  3: "trenes",
  4: "cuadras",
  5: "quinas",
  6: "sextas",
};
export const SINGULAR_PINTA: Record<Pinta, string> = {
  1: "as",
  2: "tonto",
  3: "tren",
  4: "cuadra",
  5: "quina",
  6: "sexta",
};

export function nombrarApuesta(a: Apuesta): string {
  const nombre = a.cantidad === 1 ? SINGULAR_PINTA[a.pinta] : PLURAL_PINTA[a.pinta];
  return `${a.cantidad} ${nombre}`;
}

export const PINTAS: Pinta[] = [2, 3, 4, 5, 6, 1]; // ases al final (son comodín)

/** Hook: se re-renderiza cuando el transporte emite, devuelve la instantánea. */
export function useInstantanea(t: Transporte): Instantanea {
  const [, forzar] = useReducer((x: number) => x + 1, 0);
  useEffect(() => t.suscribir(() => forzar()), [t]);
  return t.instantanea();
}
