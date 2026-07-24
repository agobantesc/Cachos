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

      {/* El cielo: estrellas, luna con halo y Santiago en dos capas de profundidad. */}
      <rect x="0" y="0" width="320" height="300" fill="url(#mh-cielo)" rx="14" />
      <g fill="#d9d5c9">
        {[[30, 22, 0.5], [88, 40, 0.3], [140, 16, 0.4], [200, 52, 0.25], [246, 70, 0.3], [60, 64, 0.2], [300, 34, 0.35], [170, 78, 0.2]].map(([x, y, o], i) => (
          <circle key={i} cx={x!} cy={y!} r="1" opacity={o!} />
        ))}
      </g>
      <circle cx="278" cy="28" r="18" fill="rgba(230, 200, 120, 0.07)" />
      <circle cx="278" cy="28" r="11" fill="rgba(230, 200, 120, 0.16)" />
      <circle cx="281" cy="26" r="8" fill="rgba(230, 200, 120, 0.28)" />
      {/* capa lejana: cerros y torres desdibujados */}
      <g fill="rgba(217, 213, 201, 0.035)">
        <path d="M0 210 q40 -26 80 -8 q50 22 90 -4 q60 -30 150 6 L320 300 L0 300 Z" />
        <rect x="150" y="60" width="18" height="120" />
        <rect x="262" y="40" width="24" height="140" />
      </g>
      {/* capa cercana: el perfil del barrio, más presente */}
      <g fill="rgba(217, 213, 201, 0.06)">
        <rect x="14" y="228" width="30" height="72" />
        <rect x="50" y="244" width="18" height="56" />
        <rect x="116" y="206" width="24" height="94" />
        <rect x="236" y="188" width="34" height="112" />
        <rect x="60" y="128" width="24" height="60" />
        <rect x="160" y="86" width="28" height="96" />
        <rect x="248" y="56" width="36" height="76" />
      </g>
      {/* ventanas encendidas, salpicadas */}
      <g fill="rgba(230, 200, 120, 0.22)">
        {[[20, 236], [30, 252], [122, 214], [130, 230], [242, 196], [252, 212], [66, 136], [166, 96], [174, 112], [254, 64], [266, 80]].map(([x, y], i) => (
          <rect key={i} x={x!} y={y!} width="3.4" height="4.6" />
        ))}
      </g>
      {/* el Mapocho, cruzando bajo el Subterráneo */}
      <path d="M0 118 Q 80 108 160 116 T 320 112" stroke="url(#mh-rio)" strokeWidth="8" fill="none" />
      <path d="M0 121 Q 80 111 160 119 T 320 115" stroke="rgba(140, 180, 205, 0.14)" strokeWidth="1.4" fill="none" />
      {/* las olas del puerto, al pie */}
      <g stroke="rgba(58, 90, 110, 0.55)" strokeWidth="1.4" fill="none">
        <path d="M14 286 q 7 -5 14 0 t 14 0" />
        <path d="M40 292 q 7 -5 14 0 t 14 0" />
        <path d="M74 288 q 6 -4 12 0" />
      </g>

      {/* El camino entre barrios. */}
      {segmentos.map((s) => {
        const mx = (s.a.x + s.b.x) / 2 + (s.a.x < s.b.x ? -14 : 14);
        const my = (s.a.y + s.b.y) / 2 + 8;
        return (
          <path
            key={s.key}
            d={`M ${s.a.x} ${s.a.y} Q ${mx} ${my} ${s.b.x} ${s.b.y}`}
            fill="none"
            className={"mh-tramo" + (s.recorrido ? " mh-tramo--recorrido" : "")}
          />
        );
      })}

      {/* Los barrios. */}
      {CAMPANA.map((esc, i) => {
        const { x, y } = NODOS[i]!;
        const st = estado(i);
        const conocido = st !== "incognita";
        return (
          <g key={esc.clave} className={"mh-nodo mh-nodo--" + st}>
            {st === "actual" && <circle cx={x} cy={y} r="16" className="mh-halo" />}
            <circle cx={x} cy={y + 1.6} r="10.5" fill="rgba(0,0,0,0.45)" />
            <circle cx={x} cy={y} r="10.5" className="mh-ficha" />
            <circle cx={x} cy={y} r="13" fill="none" className="mh-aro" />
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
