// EL MAPA DEL HAMPA: el ascenso completo, del muelle al penthouse, en una
// sola estampa. Cada barrio es un nodo del camino; lo conquistado brilla en
// oro, el barrio actual late, y lo que falta ni siquiera tiene nombre.
// Vive en el Cuaderno del Tahúr y en la puerta del modo historia.
import { memo } from "react";
import { CAMPANA } from "./historia";

/** Posición de cada barrio en el mapa (zigzag ascendente, 320×300). */
const NODOS: { x: number; y: number }[] = [
  { x: 62, y: 262 }, // La Pocilga (muelle, abajo)
  { x: 212, y: 232 }, // La Vega Chica
  { x: 84, y: 182 }, // La Maestranza
  { x: 222, y: 138 }, // La Trastienda
  { x: 96, y: 92 }, // El Subterráneo
  { x: 196, y: 38 }, // La Cumbre (penthouse, arriba)
];

export const MapaHampa = memo(function MapaHampa({
  escenarioIdx,
  completado,
}: {
  escenarioIdx: number;
  completado: boolean;
}) {
  const estado = (i: number): "conquistado" | "actual" | "incognita" =>
    completado || i < escenarioIdx ? "conquistado" : i === escenarioIdx ? "actual" : "incognita";

  // El camino: segmentos entre nodos consecutivos (recorrido en oro, resto punteado).
  const segmentos = NODOS.slice(0, -1).map((a, i) => {
    const b = NODOS[i + 1]!;
    const recorrido = completado || i < escenarioIdx;
    return { a, b, recorrido, key: i };
  });

  return (
    <svg
      className="mapa-hampa"
      viewBox="0 0 320 300"
      role="img"
      aria-label={`El mapa del hampa: vas por ${CAMPANA[Math.min(escenarioIdx, CAMPANA.length - 1)]!.nombre}`}
    >
      <defs>
        <linearGradient id="mh-cielo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12141c" />
          <stop offset="0.65" stopColor="#0d0f14" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>
        <linearGradient id="mh-rio" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(58,90,110,0)" />
          <stop offset="0.5" stopColor="rgba(58,90,110,0.35)" />
          <stop offset="1" stopColor="rgba(58,90,110,0)" />
        </linearGradient>
      </defs>

      {/* El cielo, la luna y el perfil de Santiago al fondo. */}
      <rect x="0" y="0" width="320" height="300" fill="url(#mh-cielo)" rx="14" />
      <circle cx="278" cy="26" r="11" fill="rgba(230,200,120,0.16)" />
      <circle cx="281" cy="24" r="8" fill="rgba(230,200,120,0.22)" />
      {/* siluetas de edificios (más altos hacia la cumbre) */}
      <g fill="rgba(217,213,201,0.05)">
        <rect x="18" y="220" width="26" height="60" />
        <rect x="120" y="200" width="20" height="80" />
        <rect x="238" y="180" width="30" height="100" />
        <rect x="60" y="120" width="22" height="60" />
        <rect x="160" y="80" width="26" height="90" />
        <rect x="248" y="52" width="34" height="70" />
      </g>
      {/* el Mapocho, cruzando bajo el Subterráneo */}
      <path d="M0 118 Q 80 108 160 116 T 320 112" stroke="url(#mh-rio)" strokeWidth="7" fill="none" />
      {/* las olas del puerto, al pie */}
      <g stroke="rgba(58,90,110,0.5)" strokeWidth="1.4" fill="none">
        <path d="M14 286 q 7 -5 14 0 t 14 0" />
        <path d="M40 292 q 7 -5 14 0 t 14 0" />
      </g>

      {/* El camino entre barrios. */}
      {segmentos.map((s) => (
        <line
          key={s.key}
          x1={s.a.x}
          y1={s.a.y}
          x2={s.b.x}
          y2={s.b.y}
          className={"mh-tramo" + (s.recorrido ? " mh-tramo--recorrido" : "")}
        />
      ))}

      {/* Los barrios. */}
      {CAMPANA.map((esc, i) => {
        const { x, y } = NODOS[i]!;
        const st = estado(i);
        const conocido = st !== "incognita";
        return (
          <g key={esc.clave} className={"mh-nodo mh-nodo--" + st}>
            {st === "actual" && <circle cx={x} cy={y} r="15" className="mh-halo" />}
            <circle cx={x} cy={y} r="10.5" className="mh-ficha" />
            <text x={x} y={y + 3.5} textAnchor="middle" className="mh-num">
              {st === "conquistado" ? "★" : i + 1}
            </text>
            <text x={x} y={y + 24} textAnchor="middle" className="mh-nombre">
              {conocido ? esc.nombre : "???"}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
