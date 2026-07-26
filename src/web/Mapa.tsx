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


/** La viñeta de cada barrio: un mini-edificio de silueta, con sus luces. */
function Edificio({ clave, encendido }: { clave: string; encendido: boolean }) {
  const cuerpo = "#171a22";
  const borde = "rgba(217, 213, 201, 0.22)";
  const luz = encendido ? "rgba(230, 200, 120, 0.85)" : "rgba(120, 120, 130, 0.25)";
  switch (clave) {
    case "pocilga": // la caseta del muelle, con su bote
      return (
        <g>
          <rect x="-13" y="-8" width="20" height="16" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <path d="M-15 -8 L-3 -16 L9 -8 Z" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <rect x="-8" y="-3" width="4" height="5" fill={luz} />
          <line x1="-11" y1="8" x2="-11" y2="13" stroke={borde} strokeWidth="1.2" />
          <line x1="3" y1="8" x2="3" y2="13" stroke={borde} strokeWidth="1.2" />
          <path d="M9 6 q5 5 12 3 l-2 3 q-7 2 -11 -3 z" fill={cuerpo} stroke={borde} strokeWidth="0.7" />
        </g>
      );
    case "vega": // el puesto del mercado, con toldo y cajones
      return (
        <g>
          <rect x="-12" y="-4" width="24" height="12" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <path d="M-14 -4 L14 -4 L12 -10 L-12 -10 Z" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          {[-11, -5, 1, 7].map((x) => (
            <path key={x} d={`M${x} -4 q2 3 4 0`} fill="none" stroke={luz} strokeWidth="1" />
          ))}
          <rect x="-9" y="2" width="6" height="6" fill="none" stroke={borde} strokeWidth="0.8" />
          <rect x="0" y="3" width="6" height="5" fill="none" stroke={borde} strokeWidth="0.8" />
        </g>
      );
    case "maestranza": // el galpón dentado, con chimenea y engranaje
      return (
        <g>
          <path d="M-14 8 L-14 -6 L-7 -12 L-7 -6 L0 -12 L0 -6 L7 -12 L7 8 Z" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <rect x="9" y="-14" width="4" height="22" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <circle cx="-3" cy="0" r="4.4" fill="none" stroke={luz} strokeWidth="1.2" />
          <circle cx="-3" cy="0" r="1.4" fill={luz} />
          <path className="esc-humo" d="M11 -15 q2 -4 0 -7" stroke="rgba(150,150,160,0.4)" strokeWidth="1.4" fill="none" />
        </g>
      );
    case "trastienda": // la botillería angosta, con letrero de botella
      return (
        <g>
          <rect x="-8" y="-14" width="16" height="22" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <rect x="-3" y="0" width="6" height="8" fill="none" stroke={borde} strokeWidth="0.8" />
          <rect x="-5" y="-10" width="10" height="4" fill={luz} opacity="0.9" />
          <path d="M11 -8 l0 3 M10 -5 q1 4 -1 6 q-2 1 -3 -1 q0 -3 2 -5 z" stroke={borde} strokeWidth="0.8" fill={cuerpo} />
        </g>
      );
    case "club": // la boca del Subterráneo: arco y escalera que baja
      return (
        <g>
          <path d="M-11 8 L-11 -6 Q0 -16 11 -6 L11 8 Z" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <path d="M-6 8 L-6 -4 Q0 -10 6 -4 L6 8 Z" fill="#0a0c12" />
          <path d="M-4 8 h8 M-3 5 h6 M-2 2 h4" stroke={luz} strokeWidth="1" />
        </g>
      );
    case "cumbre": // la torre del penthouse, con la última luz encendida
      return (
        <g>
          <rect x="-7" y="-20" width="14" height="28" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <rect x="-4" y="-26" width="8" height="6" fill={cuerpo} stroke={borde} strokeWidth="0.8" />
          <line x1="0" y1="-26" x2="0" y2="-31" stroke={borde} strokeWidth="1" />
          <rect x="-2.4" y="-24" width="4.8" height="3" fill={luz} />
          {[-14, -8, -2].map((y) => (
            <g key={y} fill={encendido ? "rgba(230,200,120,0.4)" : "rgba(120,120,130,0.15)"}>
              <rect x="-4.6" y={y} width="3" height="3.6" />
              <rect x="1.6" y={y} width="3" height="3.6" />
            </g>
          ))}
        </g>
      );
  }
  return null;
}

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

      {/* Los barrios: viñetas ilustradas, no círculos. */}
      {CAMPANA.map((esc, i) => {
        const { x, y } = NODOS[i]!;
        const st = estado(i);
        const conocido = st !== "incognita";
        return (
          <g key={esc.clave} className={"mh-nodo mh-nodo--" + st}>
            {st === "actual" && <ellipse cx={x} cy={y + 10} rx="22" ry="6" className="mh-halo" />}
            <ellipse cx={x} cy={y + 10} rx="18" ry="4.5" fill="rgba(0,0,0,0.5)" />
            <g transform={`translate(${x} ${y})`} opacity={conocido ? 1 : 0.4}>
              <Edificio clave={esc.clave} encendido={st !== "incognita"} />
            </g>
            {st === "conquistado" && (
              <text x={x + 16} y={y - 12} textAnchor="middle" className="mh-estrella">★</text>
            )}
            <text x={x} y={y + 24} textAnchor="middle" className={"mh-nombre" + (st === "actual" ? " mh-nombre--actual" : "")}>
              {conocido ? esc.nombre.toUpperCase() : "???"}
            </text>
          </g>
        );
      })}
    </svg>
  );
});
