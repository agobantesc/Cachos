// Viñetas SVG para los eventos del modo historia: estampas noir (siluetas +
// luz) en la paleta de la casa, sin fotos ni red. Cada evento mapea a una
// escena por su clave (ver escenaDe en historia.ts). Estilo: panel oscuro,
// figuras casi negras a contraluz, un acento de oro o de sangre.
import { memo } from "react";

const NEGRO = "#0a0810";
const ORO = "#c8a24a";
const SANGRE = "#b23a2e";
const PIEL = "#caa07a";

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <svg className="escena" viewBox="0 0 320 140" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {/* fondo: humo con un dejo de calor arriba y sombra abajo */}
      <rect x="0" y="0" width="320" height="140" fill="#13111b" />
      <ellipse cx="160" cy="22" rx="200" ry="70" fill="#ffffff" opacity="0.035" />
      <ellipse cx="160" cy="150" rx="220" ry="78" fill="#000000" opacity="0.34" />
      {children}
      {/* viñeteado a los bordes */}
      <rect x="0" y="0" width="320" height="140" fill="none" stroke="#000000" strokeOpacity="0.5" strokeWidth="14" />
      <rect x="0.7" y="0.7" width="318.6" height="138.6" rx="13" fill="none" stroke="rgba(200,162,74,0.34)" strokeWidth="1.2" />
    </svg>
  );
}

// Piso/sombra de apoyo bajo una figura.
function Suelo() {
  return <ellipse cx="160" cy="124" rx="150" ry="10" fill="#000000" opacity="0.3" />;
}

function Escenas({ escena }: { escena: string }) {
  switch (escena) {
    // El cabro de la puerta: niño a contraluz en un vano iluminado.
    case "cabro":
      return (
        <g>
          <Suelo />
          {/* vano iluminado */}
          <rect x="126" y="20" width="68" height="102" fill="#2a1d0e" />
          <rect x="133" y="26" width="54" height="96" fill={ORO} opacity="0.22" />
          <path d="M133 122 L92 136 L228 136 L187 122 Z" fill={ORO} opacity="0.1" />
          {/* marco de la puerta */}
          <rect x="120" y="16" width="8" height="106" fill={NEGRO} />
          <rect x="192" y="16" width="8" height="106" fill={NEGRO} />
          <rect x="120" y="14" width="80" height="8" fill={NEGRO} />
          {/* niño harapiento a contraluz */}
          <g fill={NEGRO}>
            <circle cx="160" cy="62" r="9" />
            <path d="M150 73 q10 -5 20 0 l3 40 q-13 5 -26 0 z" />
            <rect x="151" y="112" width="6" height="10" />
            <rect x="163" y="112" width="6" height="10" />
            <path d="M150 80 l-9 16" stroke={NEGRO} strokeWidth="5" strokeLinecap="round" />
          </g>
          <path d="M168 64 q4 1 7 0" stroke={ORO} strokeWidth="1" opacity="0.5" />
        </g>
      );

    // La billetera en el cajón: mano fría del muerto entre cajones de fruta.
    case "billetera":
      return (
        <g>
          <Suelo />
          {/* cajones */}
          <g stroke="#4a3c22" strokeWidth="1.2" fill="#1c160f">
            <rect x="40" y="78" width="64" height="44" />
            <rect x="104" y="86" width="60" height="36" />
            <rect x="206" y="74" width="70" height="48" />
            <path d="M40 92 h64 M40 106 h64 M206 90 h70 M206 106 h70" />
          </g>
          {/* fruta (manchas) */}
          <circle cx="120" cy="84" r="6" fill="#5a2d2a" />
          <circle cx="134" cy="86" r="5" fill="#6e3a22" />
          {/* mano floja colgando del cajón */}
          <g fill={PIEL}>
            <path d="M150 96 q14 -2 24 6 q3 6 -2 9 q-10 -2 -16 1 q-9 2 -10 -7 q-1 -7 4 -9 z" />
            <path d="M174 108 q5 4 4 12" stroke={PIEL} strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M170 110 q5 5 3 13 M165 111 q4 6 1 13" stroke={PIEL} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </g>
          <path d="M150 96 q12 -2 22 5" stroke="#000" strokeOpacity="0.25" strokeWidth="1.4" fill="none" />
          {/* billetera con un dejo de oro */}
          <g transform="rotate(-8 150 116)">
            <rect x="132" y="110" width="30" height="18" rx="2" fill="#241a12" stroke={ORO} strokeOpacity="0.7" />
            <rect x="150" y="115" width="9" height="8" rx="1" fill={ORO} opacity="0.7" />
          </g>
        </g>
      );

    // Lectura / naipes: mano de uñas largas abriendo cartas sobre terciopelo.
    case "lectura":
      return (
        <g>
          {/* terciopelo */}
          <path d="M0 104 q160 -22 320 0 v36 H0 z" fill="#2a0f12" />
          <path d="M0 104 q160 -22 320 0" fill="none" stroke={SANGRE} strokeOpacity="0.4" strokeWidth="1.2" />
          {/* resplandor de vela */}
          <ellipse cx="60" cy="60" rx="42" ry="46" fill={ORO} opacity="0.08" />
          {/* cartas en abanico */}
          <g>
            {[-26, -13, 0, 13, 26].map((rot, i) => (
              <g key={i} transform={`rotate(${rot} 168 118)`}>
                <rect x="150" y="44" width="36" height="58" rx="4" fill="#1a1622" stroke={ORO} strokeWidth="1.2" />
                <rect x="156" y="58" width="24" height="30" rx="2" fill="none" stroke={ORO} strokeOpacity="0.5" />
                <path d="M168 64 l8 9 l-8 9 l-8 -9 z" fill={ORO} opacity="0.5" />
              </g>
            ))}
          </g>
          {/* mano con uñas */}
          <g fill={PIEL}>
            <path d="M236 120 q-10 -22 6 -40 q10 -10 22 -6 l-4 10 q-10 -2 -16 6 q-8 12 -2 30 z" />
            <g stroke={SANGRE} strokeWidth="2.6" strokeLinecap="round">
              <path d="M250 78 l6 -8" />
              <path d="M258 82 l7 -7" />
              <path d="M264 90 l8 -5" />
            </g>
          </g>
        </g>
      );

    // El quiltro entre los fierros: perro flaco entre rieles verticales.
    case "perro":
      return (
        <g>
          <Suelo />
          {/* rieles / fierros verticales */}
          <g stroke="#34303c" strokeWidth="6">
            <line x1="44" y1="14" x2="44" y2="120" />
            <line x1="92" y1="10" x2="92" y2="120" />
            <line x1="250" y1="12" x2="250" y2="120" />
            <line x1="292" y1="16" x2="292" y2="120" />
          </g>
          <g stroke="#1e1a24" strokeWidth="6" opacity="0.8">
            <line x1="20" y1="60" x2="300" y2="56" />
          </g>
          {/* perro flaco */}
          <g fill={NEGRO}>
            <path d="M132 100 q6 -16 26 -16 q22 0 30 4 q10 2 16 -2 q-2 8 -10 9 l2 9 h-5 l-3 -8 q-12 3 -22 1 l-2 9 h-5 l-1 -9 q-18 -1 -26 1 z" />
            <path d="M188 88 q8 -2 12 -8 q1 5 -2 9 z" />
            {/* patas */}
            <rect x="140" y="100" width="4" height="14" />
            <rect x="158" y="101" width="4" height="13" />
            <rect x="176" y="100" width="4" height="14" />
            <rect x="186" y="99" width="4" height="15" />
          </g>
          {/* costillas (un brillo tenue) */}
          <g stroke="#3a3038" strokeWidth="1" opacity="0.7">
            <path d="M150 92 q3 4 0 8 M158 91 q3 4 0 8 M166 91 q3 4 0 8" />
          </g>
        </g>
      );

    // Bronca: cuchilla clavada en la mesa, dos siluetas tensas.
    case "cuchillo":
      return (
        <g>
          {/* siluetas enfrentadas */}
          <g fill={NEGRO} opacity="0.92">
            <g>
              <circle cx="40" cy="44" r="13" />
              <path d="M20 60 q20 -8 40 0 l4 36 h-48 z" />
            </g>
            <g>
              <circle cx="282" cy="40" r="14" />
              <path d="M258 58 q24 -10 48 0 l5 38 h-58 z" />
            </g>
          </g>
          {/* mesa */}
          <rect x="70" y="92" width="180" height="12" rx="2" fill="#1c140d" />
          <rect x="70" y="92" width="180" height="3" fill={ORO} opacity="0.25" />
          <rect x="86" y="104" width="10" height="30" fill="#150f0a" />
          <rect x="224" y="104" width="10" height="30" fill="#150f0a" />
          {/* cuchilla clavada */}
          <g transform="rotate(12 160 92)">
            <rect x="156" y="58" width="8" height="22" rx="2" fill="#241a12" stroke={ORO} strokeOpacity="0.6" />
            <path d="M156 80 h8 l-1 14 q-3 4 -6 0 z" fill="#cfd2d8" />
            <path d="M163 80 l-1 14" stroke="#fff" strokeOpacity="0.5" />
          </g>
          {/* gota / brillo */}
          <circle cx="168" cy="100" r="2" fill={SANGRE} />
        </g>
      );

    // El adelanto del Notario: libro de cuentas, lapicera, mano.
    case "notario":
      return (
        <g>
          <Suelo />
          <ellipse cx="160" cy="40" rx="70" ry="34" fill={ORO} opacity="0.07" />
          {/* libro abierto */}
          <g>
            <path d="M96 104 q64 -16 128 0 l0 12 q-64 -14 -128 0 z" fill="#0e0a08" />
            <path d="M100 100 q60 -14 60 -2 l0 6 q-30 -8 -60 2 z" fill="#e9e3d2" opacity="0.92" />
            <path d="M220 100 q-60 -14 -60 -2 l0 6 q30 -8 60 2 z" fill="#d9d3c2" opacity="0.92" />
            <g stroke="#9a8e74" strokeWidth="1">
              <path d="M108 96 q26 -6 48 -1 M110 100 q24 -5 46 -1" />
              <path d="M212 96 q-26 -6 -48 -1 M210 100 q-24 -5 -46 -1" />
            </g>
            <line x1="160" y1="92" x2="160" y2="104" stroke="#0e0a08" strokeWidth="2" />
          </g>
          {/* lapicera con punta de oro */}
          <g transform="rotate(-28 170 84)">
            <rect x="150" y="70" width="44" height="6" rx="3" fill="#15110a" />
            <path d="M194 70 l10 3 l-10 3 z" fill={ORO} />
          </g>
          {/* mano que ofrece */}
          <path d="M120 116 q14 -8 30 -4 q4 4 -1 7 q-12 -2 -20 2 q-12 3 -14 -3 q-1 -4 5 -2 z" fill={PIEL} />
        </g>
      );

    // El cobrador: silueta corpulenta cerrando un callejón.
    case "cobrador":
      return (
        <g>
          <Suelo />
          {/* callejón en perspectiva */}
          <path d="M0 0 L80 30 L80 122 L0 140 z" fill="#0c0a12" />
          <path d="M320 0 L240 30 L240 122 L320 140 z" fill="#0c0a12" />
          <rect x="80" y="0" width="160" height="140" fill="#161320" opacity="0.5" />
          {/* farol al fondo */}
          <ellipse cx="160" cy="34" rx="30" ry="22" fill={ORO} opacity="0.12" />
          <rect x="158" y="14" width="4" height="22" fill="#0a0810" />
          {/* matón */}
          <g fill={NEGRO}>
            <circle cx="160" cy="56" r="18" />
            <path d="M120 84 q40 -16 80 0 l8 56 h-96 z" />
            {/* puños */}
            <circle cx="124" cy="104" r="9" />
            <circle cx="196" cy="104" r="9" />
          </g>
          <path d="M150 50 q10 -4 20 0" stroke={ORO} strokeWidth="1" opacity="0.4" />
        </g>
      );

    // El recado del Carnicero: figura con delantal ofreciendo un favor.
    case "carnicero":
      return (
        <g>
          <Suelo />
          {/* ganchos al fondo */}
          <g stroke="#2a2630" strokeWidth="2" fill="none">
            <path d="M60 14 v16 q0 8 -8 8" />
            <path d="M120 14 v12 q0 8 -8 8" />
            <path d="M250 14 v16 q0 8 8 8" />
          </g>
          {/* carnicero */}
          <g fill={NEGRO}>
            <circle cx="120" cy="48" r="16" />
            <path d="M86 70 q34 -14 68 0 l8 52 h-84 z" />
          </g>
          {/* delantal manchado */}
          <path d="M100 76 q20 -6 40 0 l4 44 h-48 z" fill="#241016" />
          <circle cx="120" cy="100" r="6" fill={SANGRE} opacity="0.7" />
          {/* mano que ofrece una bolsa con oro */}
          <path d="M158 104 q16 -6 30 0" stroke={NEGRO} strokeWidth="10" strokeLinecap="round" />
          <circle cx="196" cy="104" r="12" fill="#241a12" stroke={ORO} />
          <text x="196" y="109" textAnchor="middle" fill={ORO} fontSize="13" fontFamily="Georgia, serif">$</text>
        </g>
      );

    // La oferta del Heredero: ventanal con la ciudad y un fajo de plata.
    case "oferta":
      return (
        <g>
          {/* ventanal nocturno */}
          <rect x="22" y="14" width="276" height="100" fill="#0b1018" />
          {/* horizonte de luces */}
          <g fill={ORO} opacity="0.6">
            {Array.from({ length: 26 }).map((_, i) => (
              <rect key={i} x={28 + i * 10} y={86 - ((i * 37) % 30)} width="6" height={((i * 37) % 30) + 14} opacity={0.25 + ((i * 13) % 5) / 8} />
            ))}
          </g>
          <line x1="22" y1="94" x2="298" y2="94" stroke="#000" strokeOpacity="0.4" />
          {/* marco del ventanal */}
          <rect x="22" y="14" width="276" height="100" fill="none" stroke="#0a0810" strokeWidth="6" />
          <line x1="160" y1="14" x2="160" y2="114" stroke="#0a0810" strokeWidth="4" />
          {/* mano ofreciendo un fajo */}
          <g>
            <path d="M120 124 q22 -8 44 -2" stroke={NEGRO} strokeWidth="12" strokeLinecap="round" />
            <rect x="150" y="110" width="34" height="16" rx="2" fill="#1d2a18" stroke={ORO} strokeOpacity="0.8" transform="rotate(-6 167 118)" />
            <text x="167" y="123" textAnchor="middle" fill={ORO} fontSize="11" fontFamily="Georgia, serif" transform="rotate(-6 167 118)">$</text>
          </g>
        </g>
      );

    // El mozo que te conoce (huérfano): mesero mirando de reojo, ciudad al fondo.
    case "huerfano":
      return (
        <g>
          {/* ventanal tenue */}
          <rect x="180" y="18" width="118" height="96" fill="#0b1018" />
          <g fill={ORO} opacity="0.4">
            {Array.from({ length: 11 }).map((_, i) => (
              <rect key={i} x={186 + i * 10} y={88 - ((i * 29) % 26)} width="5" height={((i * 29) % 26) + 10} />
            ))}
          </g>
          <rect x="180" y="18" width="118" height="96" fill="none" stroke="#0a0810" strokeWidth="6" />
          <Suelo />
          {/* mesero joven, cabeza girada */}
          <g fill={NEGRO}>
            <circle cx="96" cy="46" r="13" />
            <path d="M74 64 q22 -10 44 0 l5 58 h-54 z" />
            {/* moño/corbata */}
          </g>
          <path d="M92 44 q4 3 9 1" stroke={ORO} strokeWidth="1.4" opacity="0.6" />
          <rect x="92" y="64" width="8" height="6" fill={SANGRE} opacity="0.7" />
          {/* botella en la mano */}
          <g transform="rotate(10 126 92)">
            <rect x="121" y="74" width="9" height="30" rx="3" fill="#16210f" stroke={ORO} strokeOpacity="0.5" />
            <rect x="123" y="68" width="5" height="8" fill="#16210f" />
          </g>
        </g>
      );

    // Una mano amiga: dos siluetas, una le habla al oído a la otra.
    case "manoamiga":
      return (
        <g>
          <Suelo />
          <ellipse cx="160" cy="56" rx="60" ry="40" fill={ORO} opacity="0.08" />
          {/* el que recibe (tú) */}
          <g fill={NEGRO}>
            <circle cx="120" cy="50" r="16" />
            <path d="M88 72 q32 -14 64 0 l6 50 h-76 z" />
          </g>
          {/* el aliado, inclinado hablando al oído */}
          <g fill={NEGRO} opacity="0.95">
            <circle cx="186" cy="46" r="14" />
            <path d="M176 58 q22 -8 44 4 l-4 60 h-52 q4 -34 12 -64 z" />
          </g>
          {/* susurro (un arco tenue de oro) */}
          <path d="M150 46 q12 -6 22 0" stroke={ORO} strokeWidth="1.4" opacity="0.6" fill="none" />
          <circle cx="146" cy="46" r="1.4" fill={ORO} opacity="0.8" />
        </g>
      );

    // Genérico: una silueta bajo un farol, humo de cigarro.
    default:
      return (
        <g>
          <Suelo />
          {/* farol y su cono de luz */}
          <rect x="232" y="10" width="5" height="40" fill="#0a0810" />
          <path d="M234 44 L196 124 L272 124 Z" fill={ORO} opacity="0.08" />
          <circle cx="234" cy="46" r="5" fill={ORO} opacity="0.5" />
          {/* silueta */}
          <g fill={NEGRO}>
            <circle cx="140" cy="52" r="15" />
            <path d="M110 72 q30 -14 60 0 l7 52 h-74 z" />
            {/* sombrero */}
            <path d="M120 40 q20 -10 40 0 l-6 -8 q-14 -6 -28 0 z" />
            <rect x="116" y="38" width="48" height="5" rx="2" />
          </g>
          {/* humo */}
          <path d="M158 60 q8 -10 2 -20 q-6 -8 2 -16" stroke="#7a7484" strokeWidth="2" fill="none" opacity="0.45" strokeLinecap="round" />
        </g>
      );
  }
}

export const Escena = memo(function Escena({ escena }: { escena: string }) {
  return (
    <Marco>
      <Escenas escena={escena} />
    </Marco>
  );
});
