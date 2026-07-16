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

    // ---- Ambiente de cada capítulo (la llegada al barrio) ----

    // Muelle de Valparaíso: pilotes, agua negra, la ventana de la pocilga.
    case "cap-muelle":
      return (
        <g>
          {/* luna velada */}
          <circle cx="258" cy="30" r="14" fill="#e9e3d2" opacity="0.5" />
          <circle cx="252" cy="27" r="13" fill="#13111b" opacity="0.85" />
          {/* agua */}
          <rect x="0" y="92" width="320" height="48" fill="#0b0e14" />
          <g stroke="#3a4a5a" strokeWidth="1" opacity="0.5">
            <path d="M18 104 h34 M70 112 h26 M130 100 h40 M210 116 h30 M262 104 h34" />
          </g>
          <path d="M236 96 h44 l-4 6 h-36 z" fill={NEGRO} />
          {/* muelle en perspectiva */}
          <path d="M0 92 L190 92 L150 140 L0 140 Z" fill="#181420" />
          <g fill={NEGRO}>
            <rect x="24" y="92" width="7" height="36" />
            <rect x="74" y="92" width="7" height="42" />
            <rect x="124" y="92" width="7" height="48" />
          </g>
          {/* taberna con ventana encendida */}
          <path d="M8 30 h96 v62 H8 z" fill={NEGRO} />
          <path d="M4 30 L56 12 L108 30 Z" fill="#070609" />
          <g className="esc-flicker"><rect x="26" y="46" width="22" height="26" fill={ORO} opacity="0.55" /></g>
          <rect x="30" y="50" width="6" height="8" fill={NEGRO} opacity="0.6" />
          <path d="M26 72 l60 22" stroke={ORO} strokeOpacity="0.14" strokeWidth="10" />
          {/* gaviota lejana */}
          <path d="M196 44 q4 -4 8 0 M204 44 q4 -4 8 0" stroke="#8b8678" strokeWidth="1.2" fill="none" opacity="0.6" />
        </g>
      );

    // La Vega de noche: toldos, cajones apilados, un farol.
    case "cap-vega":
      return (
        <g>
          <Suelo />
          {/* toldo */}
          <path d="M0 26 L150 20 L150 44 Q112 34 75 44 Q38 54 0 44 Z" fill="#241016" />
          <path d="M0 44 Q38 54 75 44 Q112 34 150 44" stroke={SANGRE} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
          {/* pilas de cajones */}
          <g fill="#1c160f" stroke="#4a3c22" strokeWidth="1.1">
            <rect x="16" y="84" width="46" height="30" />
            <rect x="22" y="56" width="42" height="28" />
            <rect x="196" y="90" width="52" height="28" />
            <rect x="206" y="64" width="44" height="26" />
            <rect x="214" y="40" width="36" height="24" />
          </g>
          <g stroke="#4a3c22" strokeWidth="1"><path d="M16 98 h46 M22 68 h42 M196 104 h52 M206 76 h44 M214 52 h36" /></g>
          {/* fruta caída */}
          <circle cx="84" cy="118" r="5" fill="#5a2d2a" />
          <circle cx="96" cy="122" r="4" fill="#6e3a22" />
          {/* farol colgante */}
          <line x1="160" y1="0" x2="160" y2="34" stroke={NEGRO} strokeWidth="2.4" />
          <circle cx="160" cy="40" r="7" fill={ORO} opacity="0.85" />
          <g className="esc-brilla"><circle cx="160" cy="40" r="16" fill={ORO} opacity="0.14" /></g>
          <path d="M160 48 L128 132 L192 132 Z" fill={ORO} opacity="0.07" />
        </g>
      );

    // La Maestranza: locomotora muerta, vigas, chispas de soldadura.
    case "cap-maestranza":
      return (
        <g>
          <Suelo />
          {/* vigas del galpón */}
          <g stroke="#34303c" strokeWidth="5">
            <line x1="30" y1="0" x2="30" y2="52" />
            <line x1="290" y1="0" x2="290" y2="52" />
            <line x1="0" y1="16" x2="320" y2="16" />
          </g>
          <g stroke="#211d29" strokeWidth="2"><path d="M30 16 L80 52 M290 16 L240 52" /></g>
          {/* locomotora en silueta */}
          <g fill={NEGRO}>
            <rect x="58" y="62" width="150" height="46" rx="4" />
            <rect x="188" y="46" width="52" height="62" rx="3" />
            <rect x="70" y="46" width="22" height="18" />
            <circle cx="88" cy="112" r="12" />
            <circle cx="128" cy="112" r="12" />
            <circle cx="168" cy="112" r="12" />
            <circle cx="216" cy="112" r="12" />
          </g>
          <circle cx="88" cy="112" r="5" fill="#211d29" />
          <circle cx="168" cy="112" r="5" fill="#211d29" />
          {/* farol delantero apagado y chispas al fondo */}
          <circle cx="240" cy="58" r="5" fill="#3a3038" stroke={ORO} strokeOpacity="0.4" />
          <g className="esc-chispa" fill={ORO}>
            <circle cx="277" cy="86" r="1.6" opacity="0.9" />
            <circle cx="284" cy="94" r="1.1" opacity="0.7" />
            <circle cx="271" cy="96" r="1" opacity="0.6" />
            <circle cx="288" cy="82" r="0.9" opacity="0.5" />
          </g>
          <path d="M276 100 q6 8 2 18" stroke={ORO} strokeOpacity="0.25" strokeWidth="1.2" fill="none" />
        </g>
      );

    // La Trastienda: foco sobre el paño verde, botellas al fondo.
    case "cap-trastienda":
      return (
        <g>
          {/* estante de botellas */}
          <rect x="18" y="26" width="120" height="4" fill="#211d29" />
          <g fill={NEGRO}>
            <path d="M30 8 h8 v6 l3 4 v8 h-14 v-8 l3 -4 z" />
            <path d="M56 4 h7 v8 l3 4 v10 h-13 v-10 l3 -4 z" />
            <path d="M84 10 h8 v5 l3 3 v8 h-14 v-8 l3 -3 z" />
            <path d="M112 6 h7 v7 l3 4 v9 h-13 v-9 l3 -4 z" />
          </g>
          {/* foco colgante */}
          <line x1="200" y1="0" x2="200" y2="30" stroke={NEGRO} strokeWidth="2.5" />
          <path d="M192 30 h16 l-3 8 h-10 z" fill={NEGRO} />
          <circle className="esc-brilla" cx="200" cy="44" r="6" fill={ORO} opacity="0.95" />
          <path d="M200 50 L146 128 L254 128 Z" fill={ORO} opacity="0.1" />
          {/* mesa de paño */}
          <ellipse cx="200" cy="112" rx="86" ry="20" fill="#15251a" />
          <ellipse cx="200" cy="108" rx="86" ry="20" fill="#1c3323" />
          <ellipse cx="200" cy="108" rx="86" ry="20" fill="none" stroke={ORO} strokeOpacity="0.25" />
          {/* cacho y dados sobre el paño */}
          <path d="M180 96 l10 -4 8 4 -2 10 -8 3 -8 -4 z" fill="#241a12" stroke={ORO} strokeOpacity="0.5" />
          <rect x="212" y="100" width="9" height="9" rx="2" fill="#e9e3d2" />
          <rect x="226" y="104" width="9" height="9" rx="2" fill="#e9e3d2" transform="rotate(14 230 108)" />
          <circle cx="216.5" cy="104.5" r="1.2" fill="#15110a" />
          {/* humo */}
          <path className="esc-humo" d="M70 118 q10 -14 2 -28 q-8 -12 2 -24" stroke="#7a7484" strokeWidth="2" fill="none" opacity="0.35" strokeLinecap="round" />
        </g>
      );

    // El Subterráneo: cortinas de terciopelo, lámpara, mesa redonda.
    case "cap-club":
      return (
        <g>
          {/* cortinas */}
          <path d="M0 0 h74 q-10 70 8 140 h-82 z" fill="#2a0f12" />
          <path d="M320 0 h-74 q10 70 -8 140 h82 z" fill="#2a0f12" />
          <g stroke="#180a0c" strokeWidth="3" opacity="0.8">
            <path d="M22 0 q-4 70 6 140 M48 0 q-6 70 4 140 M298 0 q4 70 -6 140 M272 0 q6 70 -4 140" />
          </g>
          <path d="M74 0 q-10 70 8 140" stroke={ORO} strokeOpacity="0.3" fill="none" />
          <path d="M246 0 q10 70 -8 140" stroke={ORO} strokeOpacity="0.3" fill="none" />
          {/* lámpara de tres brazos */}
          <line x1="160" y1="0" x2="160" y2="22" stroke={NEGRO} strokeWidth="2.4" />
          <path d="M136 30 q24 -16 48 0" stroke={NEGRO} strokeWidth="3" fill="none" />
          <g className="esc-brilla">
            <circle cx="136" cy="33" r="3.6" fill={ORO} opacity="0.9" />
            <circle cx="160" cy="26" r="3.6" fill={ORO} opacity="0.9" />
            <circle cx="184" cy="33" r="3.6" fill={ORO} opacity="0.9" />
          </g>
          <path d="M160 36 L108 128 L212 128 Z" fill={ORO} opacity="0.08" />
          {/* mesa redonda con copas */}
          <ellipse cx="160" cy="110" rx="64" ry="16" fill="#241016" />
          <ellipse cx="160" cy="106" rx="64" ry="16" fill="#33161b" />
          <ellipse cx="160" cy="106" rx="64" ry="16" fill="none" stroke={ORO} strokeOpacity="0.3" />
          <g stroke="#e9e3d2" strokeWidth="1.2" opacity="0.7" fill="none">
            <path d="M130 84 h8 l-2.5 6 h-3 Z M134 90 v6 M131 96 h6" />
            <path d="M182 86 h8 l-2.5 6 h-3 Z M186 92 v6 M183 98 h6" />
          </g>
        </g>
      );

    // La Cumbre: el skyline por el ventanal del penthouse.
    case "cap-cumbre":
      return (
        <g>
          {/* cielo nocturno */}
          <rect x="16" y="10" width="288" height="104" fill="#0b1018" />
          <circle cx="270" cy="26" r="9" fill="#e9e3d2" opacity="0.4" />
          {/* cordillera al fondo */}
          <path d="M16 58 L70 34 L120 54 L170 30 L220 52 L270 38 L304 50 V114 H16 Z" fill="#10151d" />
          {/* skyline encendido */}
          <g className="esc-titila"><g fill={ORO} opacity="0.65">
            {Array.from({ length: 24 }).map((_, i) => (
              <rect key={i} x={22 + i * 12} y={96 - ((i * 41) % 34)} width="7" height={((i * 41) % 34) + 18} opacity={0.25 + ((i * 17) % 6) / 10} />
            ))}
          </g></g>
          {/* marco del ventanal */}
          <rect x="16" y="10" width="288" height="104" fill="none" stroke="#0a0810" strokeWidth="7" />
          <line x1="160" y1="10" x2="160" y2="114" stroke="#0a0810" strokeWidth="5" />
          <line x1="16" y1="62" x2="304" y2="62" stroke="#0a0810" strokeWidth="3" />
          {/* copa en el alféizar */}
          <g stroke="#e9e3d2" strokeWidth="1.4" opacity="0.85" fill="none">
            <path d="M37 111 h10 l-3 8 h-4 Z M42 119 v8 M38.5 127 h7" />
          </g>
        </g>
      );

    // ---- Los tres finales (tres pasajes cada uno) ----

    // Estándar, pasaje 1: el Rey se derrumba sobre el paño, testigos a contraluz.
    case "fin-trono-mesa":
      return (
        <g>
          {/* foco cenital, intenso: el instante de la caída */}
          <line x1="160" y1="0" x2="160" y2="26" stroke={NEGRO} strokeWidth="2.5" />
          <path d="M150 26 h20 l-4 9 h-12 z" fill={NEGRO} />
          <circle cx="160" cy="42" r="7" fill={ORO} opacity="0.95" />
          <path d="M160 49 L92 128 L228 128 Z" fill={ORO} opacity="0.13" />
          {/* mesa de paño */}
          <ellipse cx="160" cy="112" rx="96" ry="20" fill="#15251a" />
          <ellipse cx="160" cy="108" rx="96" ry="20" fill="#1c3323" />
          <ellipse cx="160" cy="108" rx="96" ry="20" fill="none" stroke={ORO} strokeOpacity="0.25" />
          {/* el Rey, derrumbado sobre el paño */}
          <g fill={NEGRO}>
            <ellipse cx="150" cy="98" rx="11" ry="8" />
            <path d="M138 100 q14 10 34 2 l6 14 q-24 10 -46 0 z" />
          </g>
          {/* cacho volcado y dados desparramados */}
          <path d="M182 96 l9 -10 -4 -6 -10 3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.5" />
          <rect x="196" y="98" width="8" height="8" rx="1.8" fill="#e9e3d2" transform="rotate(22 200 102)" />
          <rect x="118" y="104" width="8" height="8" rx="1.8" fill="#e9e3d2" transform="rotate(-14 122 108)" />
          <rect x="176" y="112" width="8" height="8" rx="1.8" fill="#e9e3d2" transform="rotate(40 180 116)" />
          {/* testigos, recortados contra el paño a los bordes de la mesa */}
          <g fill="#1c1626" stroke={ORO} strokeOpacity="0.3" strokeWidth="1">
            <path d="M18 138 q0 -22 14 -30 q10 6 8 30 z" />
            <path d="M280 138 q0 -24 16 -32 q11 7 8 32 z" />
          </g>
        </g>
      );

    // Estándar, pasaje 2: la noticia baja por la ciudad, de barrio en barrio.
    case "fin-trono-calle":
      return (
        <g>
          {/* cielo nocturno sobre los techos */}
          <rect x="0" y="0" width="320" height="90" fill="#12101c" />
          <circle cx="60" cy="24" r="7" fill="#e9e3d2" opacity="0.35" />
          {/* skyline de varios barrios, luces sueltas encendidas */}
          <g fill="#0d0c14">
            <rect x="0" y="46" width="46" height="52" />
            <rect x="44" y="30" width="38" height="68" />
            <rect x="80" y="52" width="50" height="46" />
            <rect x="128" y="20" width="34" height="78" />
            <rect x="160" y="44" width="46" height="54" />
            <rect x="204" y="34" width="40" height="64" />
            <rect x="242" y="54" width="42" height="44" />
            <rect x="282" y="24" width="38" height="74" />
          </g>
          <g fill={ORO} opacity="0.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <rect key={i} x={10 + i * 22} y={40 + ((i * 23) % 40)} width="5" height="7" opacity={0.3 + ((i * 13) % 5) / 10} />
            ))}
          </g>
          {/* piso de calle */}
          <rect x="0" y="98" width="320" height="42" fill="#0d0b11" />
          {/* el tahúr, a contraluz, alejándose por el medio de la calle */}
          <g fill={NEGRO}>
            <circle cx="160" cy="106" r="6" />
            <path d="M150 114 q10 -5 20 0 l3 26 q-13 4 -26 0 z" />
          </g>
          <ellipse cx="160" cy="140" rx="18" ry="3" fill="#000" opacity="0.4" />
        </g>
      );

    // Estándar, pasaje 3: el trono vacío y el cacho sobre el brazo.
    case "fin-trono":
      return (
        <g>
          <Suelo />
          {/* ventanal tenue */}
          <rect x="200" y="14" width="104" height="86" fill="#0b1018" />
          <g fill={ORO} opacity="0.4">
            {Array.from({ length: 9 }).map((_, i) => (
              <rect key={i} x={206 + i * 11} y={78 - ((i * 29) % 24)} width="6" height={((i * 29) % 24) + 10} />
            ))}
          </g>
          <rect x="200" y="14" width="104" height="86" fill="none" stroke="#0a0810" strokeWidth="6" />
          {/* sillón-trono */}
          <g fill={NEGRO}>
            <rect x="66" y="30" width="76" height="78" rx="10" />
            <rect x="52" y="72" width="20" height="40" rx="6" />
            <rect x="136" y="72" width="20" height="40" rx="6" />
            <rect x="58" y="106" width="94" height="14" rx="4" />
          </g>
          <path d="M70 36 q34 -12 68 0" stroke={ORO} strokeOpacity="0.5" strokeWidth="1.6" fill="none" />
          {/* cacho y dados en el brazo */}
          <path d="M54 66 l8 -3 7 3 -2 8 -6 2 -6 -3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.6" />
          <rect x="140" y="64" width="8" height="8" rx="1.8" fill="#e9e3d2" />
          <circle cx="144" cy="68" r="1.1" fill={SANGRE} />
          {/* humo de un cigarro dejado */}
          <path className="esc-humo" d="M160 120 q8 -12 2 -24 q-6 -10 2 -20" stroke="#7a7484" strokeWidth="1.8" fill="none" opacity="0.4" strokeLinecap="round" />
        </g>
      );

    // Malo, pasaje 1: los brazos en alto, y un aplauso que se corta antes de tiempo.
    case "fin-traicion-cima":
      return (
        <g>
          <Suelo />
          {/* ventanal con la ciudad, brillante */}
          <rect x="86" y="10" width="150" height="96" fill="#0b1018" />
          <g fill={ORO} opacity="0.55">
            {Array.from({ length: 13 }).map((_, i) => (
              <rect key={i} x={92 + i * 11} y={82 - ((i * 31) % 30)} width="6" height={((i * 31) % 30) + 14} />
            ))}
          </g>
          <rect x="86" y="10" width="150" height="96" fill="none" stroke="#0a0810" strokeWidth="6" />
          {/* el tahúr, brazos en alto, al centro */}
          <g fill={NEGRO}>
            <circle cx="160" cy="70" r="9" />
            <path d="M150 80 q10 -5 20 0 l3 34 q-13 5 -26 0 z" />
            <path d="M150 84 l-18 -30 M170 84 l18 -30" stroke={NEGRO} strokeWidth="5" strokeLinecap="round" />
          </g>
          {/* una silueta que ya no aplaude */}
          <g fill={NEGRO} opacity="0.9">
            <circle cx="252" cy="90" r="6" />
            <path d="M244 98 q8 -3 16 0 l2 18 q-10 3 -20 0 z" />
          </g>
        </g>
      );

    // Malo, pasaje 2: rostros pálidos superpuestos en el vidrio, la cuenta que llega.
    case "fin-traicion-fantasmas":
      return (
        <g>
          {/* ventanal, ahora frío */}
          <rect x="60" y="8" width="200" height="100" fill="#0d0f1a" />
          <rect x="60" y="8" width="200" height="100" fill="none" stroke="#0a0810" strokeWidth="6" />
          {/* rostros pálidos, apenas marcados, superpuestos en el vidrio */}
          <g fill={PIEL} opacity="0.14">
            <circle cx="96" cy="46" r="14" />
            <circle cx="140" cy="70" r="12" />
            <circle cx="196" cy="42" r="13" />
            <circle cx="228" cy="74" r="11" />
          </g>
          {/* tu propia silueta, nítida, al centro */}
          <g fill={NEGRO}>
            <circle cx="160" cy="60" r="10" />
            <path d="M148 72 q12 -6 24 0 l4 36 q-16 6 -32 0 z" />
          </g>
          {/* la copa en la mano, quieta */}
          <path d="M182 78 l7 -3 6 3 -1 7 -5 2 -6 -2 z" fill="#1a1622" stroke={ORO} strokeOpacity="0.5" />
        </g>
      );

    // Malo, pasaje 3: la copa envenenada volcada y la mano caída.
    case "fin-traicion":
      return (
        <g>
          {/* ventanal con la ciudad, torcido levemente */}
          <rect x="176" y="12" width="128" height="92" fill="#0b1018" />
          <g fill={ORO} opacity="0.35">
            {Array.from({ length: 11 }).map((_, i) => (
              <rect key={i} x={182 + i * 11} y={84 - ((i * 31) % 26)} width="6" height={((i * 31) % 26) + 10} />
            ))}
          </g>
          <rect x="176" y="12" width="128" height="92" fill="none" stroke="#0a0810" strokeWidth="6" />
          {/* piso */}
          <rect x="0" y="108" width="320" height="32" fill="#0d0b11" />
          {/* copa volcada, vino derramado */}
          <g transform="rotate(-72 96 108)">
            <path d="M96 108 l-8 -14 h16 z" fill="#1a1622" stroke="#e9e3d2" strokeOpacity="0.7" />
            <line x1="96" y1="108" x2="96" y2="118" stroke="#e9e3d2" strokeOpacity="0.7" strokeWidth="1.6" />
          </g>
          <path d="M100 112 q28 4 44 12 q10 5 2 8 q-24 -8 -48 -14 z" fill={SANGRE} opacity="0.55" />
          {/* mano caída desde fuera de cuadro */}
          <g fill={PIEL}>
            <path d="M0 116 q22 -6 40 -2 q6 4 0 8 q-14 -1 -24 2 q-10 2 -16 -2 z" />
            <path d="M40 114 q6 4 5 12 M33 115 q5 5 3 12 M26 116 q4 5 2 11" stroke={PIEL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
          {/* el anillo de la Asociación rodó lejos */}
          <circle cx="70" cy="128" r="4" fill="none" stroke={ORO} strokeWidth="1.6" />
        </g>
      );

    // Verdadero, pasaje 1: la pieza sin ventanas, el Patrón caído, el aliado en la puerta.
    case "fin-amanecer-puerta":
      return (
        <g>
          <Suelo />
          {/* la pieza sin ventanas, oscura */}
          <rect x="0" y="0" width="320" height="140" fill="#0a0810" />
          {/* la única ampolleta */}
          <line x1="160" y1="0" x2="160" y2="30" stroke={NEGRO} strokeWidth="2.5" />
          <circle cx="160" cy="38" r="6" fill={ORO} opacity="0.95" />
          <path d="M160 44 L104 118 L216 118 Z" fill={ORO} opacity="0.12" />
          {/* el Patrón, caído sobre su cacho */}
          <g fill={NEGRO}>
            <ellipse cx="160" cy="104" rx="13" ry="9" />
            <path d="M146 106 q14 10 32 2 l4 12 q-20 8 -38 0 z" />
          </g>
          <path d="M176 100 l8 -9 -3 -6 -9 3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.5" />
          {/* la puerta sin número, entreabierta, con el aliado entrando */}
          <rect x="18" y="24" width="46" height="94" fill="#050408" />
          <rect x="18" y="24" width="10" height="94" fill={NEGRO} />
          <g fill={NEGRO} opacity="0.9">
            <circle cx="40" cy="66" r="7" />
            <path d="M31 76 q9 -4 18 0 l2 30 q-11 4 -22 0 z" />
          </g>
        </g>
      );

    // Verdadero, pasaje 2: de vuelta por el penthouse, el Rey público humillado en su trono.
    case "fin-amanecer-penthouse":
      return (
        <g>
          {/* ventanal con la ciudad, de noche cerrada */}
          <rect x="0" y="8" width="320" height="92" fill="#0b1018" />
          <g fill={ORO} opacity="0.4">
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={i} x={4 + i * 20} y={70 - ((i * 29) % 30)} width="7" height={((i * 29) % 30) + 12} />
            ))}
          </g>
          <rect x="0" y="8" width="320" height="92" fill="none" stroke="#0a0810" strokeWidth="6" />
          {/* piso */}
          <rect x="0" y="100" width="320" height="40" fill="#0d0b11" />
          {/* el Rey "público", humillado en su sillón, atrás */}
          <g fill={NEGRO} opacity="0.6">
            <rect x="242" y="66" width="46" height="46" rx="8" />
            <ellipse cx="262" cy="82" rx="9" ry="7" />
          </g>
          {/* tú y tu aliado, caminando juntos hacia la salida, ya sobre el piso */}
          <g fill={NEGRO} stroke={ORO} strokeOpacity="0.3" strokeWidth="1">
            <circle cx="118" cy="112" r="7" />
            <path d="M108 121 q10 -5 20 0 l3 17 q-13 4 -26 0 z" />
            <circle cx="150" cy="114" r="6" />
            <path d="M142 122 q8 -4 16 0 l3 15 q-11 4 -22 0 z" />
          </g>
        </g>
      );

    // Verdadero, pasaje 3: amanecer sobre el río, el tahúr se va caminando.
    case "fin-amanecer":
      return (
        <g>
          {/* cielo que clarea */}
          <rect x="0" y="0" width="320" height="96" fill="#1a1520" />
          <rect x="0" y="40" width="320" height="56" fill="#2a1d1a" opacity="0.8" />
          <circle cx="160" cy="92" r="26" fill={ORO} opacity="0.75" />
          <g className="esc-brilla"><circle cx="160" cy="92" r="44" fill={ORO} opacity="0.16" /></g>
          {/* el río */}
          <rect x="0" y="92" width="320" height="24" fill="#141019" />
          <g stroke={ORO} strokeOpacity="0.4" strokeWidth="1.2">
            <path d="M120 100 h80 M136 106 h48 M148 112 h24" />
          </g>
          {/* puente lejano */}
          <path d="M0 92 h60 M260 92 h60" stroke={NEGRO} strokeWidth="4" />
          <path d="M20 92 q20 -14 40 0 M260 92 q20 -14 40 0" stroke={NEGRO} strokeWidth="3" fill="none" />
          {/* orilla y el tahúr alejándose */}
          <rect x="0" y="112" width="320" height="28" fill="#0d0b11" />
          <g fill={NEGRO}>
            <circle cx="160" cy="96" r="7" opacity="0" />
            <g>
              <circle cx="160" cy="84" r="8" />
              <path d="M146 94 q14 -7 28 0 l4 34 h-36 z" />
              <path d="M150 78 q10 -5 20 0 l-3 -6 q-7 -3 -14 0 z" />
              <rect x="147" y="76" width="26" height="4" rx="2" />
            </g>
          </g>
          <path d="M160 128 h0" stroke="none" />
          <ellipse cx="160" cy="130" rx="26" ry="4" fill="#000" opacity="0.4" />
        </g>
      );

    // El candado de la cifra: un cofre con tres dados por marcar.
    case "cifra":
      return (
        <g>
          <Suelo />
          <ellipse cx="160" cy="50" rx="70" ry="40" fill={ORO} opacity="0.07" />
          {/* cofre */}
          <g>
            <rect x="96" y="58" width="128" height="58" rx="6" fill="#241a12" stroke="#4a3c22" strokeWidth="1.6" />
            <path d="M96 76 h128" stroke="#4a3c22" strokeWidth="1.6" />
            <rect x="96" y="52" width="128" height="12" rx="6" fill="#2e2117" stroke="#4a3c22" strokeWidth="1.4" />
            <g stroke={ORO} strokeOpacity="0.65" strokeWidth="1.4">
              <path d="M108 58 v58 M212 58 v58" />
            </g>
          </g>
          {/* los tres dados-cerradura */}
          <g>
            <rect x="124" y="82" width="20" height="20" rx="4" fill="#15110a" stroke={ORO} />
            <rect x="150" y="82" width="20" height="20" rx="4" fill="#15110a" stroke={ORO} />
            <rect x="176" y="82" width="20" height="20" rx="4" fill="#15110a" stroke={ORO} />
            <text x="134" y="97" textAnchor="middle" fill={ORO} fontSize="13" fontFamily="Georgia, serif">?</text>
            <text x="160" y="97" textAnchor="middle" fill={ORO} fontSize="13" fontFamily="Georgia, serif">?</text>
            <text x="186" y="97" textAnchor="middle" fill={ORO} fontSize="13" fontFamily="Georgia, serif">?</text>
          </g>
          {/* candado colgando */}
          <g transform="rotate(8 160 116)">
            <rect x="152" y="108" width="16" height="14" rx="3" fill="#1a1420" stroke={ORO} strokeWidth="1.4" />
            <path d="M155 108 v-5 q5 -6 10 0 v5" stroke={ORO} strokeWidth="1.6" fill="none" />
          </g>
        </g>
      );

    // ---- Cinemáticas de entrada de los jefes (segundo pasaje) ----

    // Doña Berta: tras la cortina de humo, tres vasos-trofeo en el borde de la mesa.
    case "jefe-berta":
      return (
        <g>
          <Suelo />
          <ellipse cx="160" cy="46" rx="130" ry="50" fill="#8b8678" opacity="0.09" />
          <ellipse cx="120" cy="60" rx="90" ry="40" fill="#8b8678" opacity="0.07" />
          <rect x="60" y="104" width="200" height="10" rx="3" fill="#241a12" />
          <g fill="none" stroke="#e9e3d2" strokeWidth="1.4" strokeOpacity="0.8">
            <path d="M196 104 v-11 M192 93 h8" />
            <path d="M212 104 v-11 M208 93 h8" />
            <path d="M228 104 v-11 M224 93 h8" />
          </g>
          <g fill={NEGRO}>
            <circle cx="130" cy="66" r="10" />
            <path d="M117 78 q13 -6 26 0 l4 34 q-17 6 -34 0 z" />
          </g>
          <path d="M106 96 l8 -3 7 3 -2 8 -6 2 -6 -3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.6" />
        </g>
      );

    // El Carnicero: ganchos y reses colgando, cuchillo en mano, mancha de sangre.
    case "jefe-carnicero":
      return (
        <g>
          <Suelo />
          <g fill={NEGRO}>
            <path d="M60 8 v14 M60 22 q-10 4 -8 22 q2 14 8 14 q6 0 8 -14 q2 -18 -8 -22" />
            <path d="M120 6 v12 M120 18 q-9 4 -7 24 q2 16 7 16 q5 0 7 -16 q2 -20 -7 -24" />
          </g>
          <path d="M40 118 q40 -6 80 2 q30 5 10 12 q-46 8 -90 -2 z" fill={SANGRE} opacity="0.45" />
          <g fill={NEGRO}>
            <circle cx="190" cy="64" r="10" />
            <path d="M177 76 q13 -6 26 0 l4 36 q-17 6 -34 0 z" />
          </g>
          <path d="M214 82 l18 -10" stroke={NEGRO} strokeWidth="4" strokeLinecap="round" />
          <path d="M230 71 l10 -6 3 3 -8 8 z" fill="#c8c4bc" stroke={NEGRO} strokeWidth="1" />
        </g>
      );

    // El Verdugo: foco único, saco de género sobre la mesa, mole inmóvil.
    case "jefe-verdugo":
      return (
        <g>
          <Suelo />
          <line x1="160" y1="0" x2="160" y2="28" stroke={NEGRO} strokeWidth="2.5" />
          <circle className="esc-brilla" cx="160" cy="36" r="6" fill={ORO} opacity="0.9" />
          <path d="M160 42 L110 118 L210 118 Z" fill={ORO} opacity="0.1" />
          <path d="M0 128 h320 M0 134 h320" stroke="#241a12" strokeWidth="2" opacity="0.6" />
          <path d="M140 96 q20 -14 40 0 q4 14 -4 20 q-16 8 -32 0 q-8 -6 -4 -20 z" fill="#2a2118" stroke="#4a3c22" />
          <g fill={NEGRO}>
            <circle cx="160" cy="66" r="12" />
            <path d="M140 80 q20 -8 40 0 l6 40 q-26 8 -52 0 z" />
          </g>
        </g>
      );

    // El Croata: un tinte helado sobre la trastienda, humo de cigarro perfectamente recto.
    case "jefe-croata":
      return (
        <g>
          <Suelo />
          <rect x="0" y="0" width="320" height="140" fill="#0c1622" opacity="0.4" />
          <ellipse cx="160" cy="112" rx="86" ry="20" fill="#15251a" opacity="0.5" />
          <g fill={NEGRO}>
            <circle cx="160" cy="62" r="10" />
            <path d="M148 74 q12 -6 24 0 l4 38 q-16 6 -32 0 z" />
          </g>
          <path d="M178 90 l10 -3" stroke={NEGRO} strokeWidth="3" strokeLinecap="round" />
          <path className="esc-humo" d="M189 88 q1 -18 0 -34" stroke="#9fb3c2" strokeWidth="1.4" fill="none" opacity="0.5" />
          <circle cx="190" cy="87" r="1.6" fill={SANGRE} opacity="0.8" />
        </g>
      );

    // El Senador: cortinas de terciopelo, sombrero, el brillo de algo bajo la mesa.
    case "jefe-senador":
      return (
        <g>
          <Suelo />
          <path d="M0 0 q10 70 0 140 h40 q-14 -70 0 -140 z" fill="#3a1a2e" opacity="0.7" />
          <path d="M320 0 q-10 70 0 140 h-40 q14 -70 0 -140 z" fill="#3a1a2e" opacity="0.7" />
          <g fill={NEGRO}>
            <path d="M182 52 q-2 -8 18 -8 q20 0 18 8 z" />
            <ellipse cx="200" cy="53" rx="22" ry="4" />
            <circle cx="200" cy="66" r="9" />
            <path d="M188 76 q12 -6 24 0 l4 38 q-16 6 -32 0 z" />
          </g>
          <circle cx="205" cy="112" r="2.4" fill={ORO} opacity="0.9" />
          <path d="M256 140 q0 -20 12 -28 q9 6 7 28 z" fill={NEGRO} opacity="0.8" />
        </g>
      );

    // El Rey del Cacho: el ventanal de siempre, sentado con calma de treinta años.
    case "jefe-rey":
      return (
        <g>
          <rect x="16" y="10" width="288" height="104" fill="#0b1018" />
          <g fill={ORO} opacity="0.5">
            {Array.from({ length: 20 }).map((_, i) => (
              <rect key={i} x={22 + i * 14} y={92 - ((i * 23) % 60)} width="7" height={((i * 23) % 60) + 16} />
            ))}
          </g>
          <rect x="16" y="10" width="288" height="104" fill="none" stroke="#0a0810" strokeWidth="7" />
          <g fill={NEGRO}>
            <rect x="130" y="70" width="60" height="44" rx="8" />
            <circle cx="160" cy="66" r="10" />
          </g>
          <path d="M118 96 l9 -3 8 3 -2 9 -6 2 -7 -3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.6" />
        </g>
      );

    // El Patrón: mirando desde el umbral hacia la pieza sin ventanas.
    case "jefe-patron":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#050408" />
          <rect x="90" y="8" width="140" height="124" fill="#0a0810" />
          <rect x="90" y="8" width="140" height="124" fill="none" stroke="#000000" strokeWidth="8" />
          <g className="esc-flicker">
            <circle cx="160" cy="52" r="4" fill={ORO} opacity="0.85" />
            <path d="M160 56 L136 110 L184 110 Z" fill={ORO} opacity="0.08" />
          </g>
          <g fill={NEGRO} opacity="0.9">
            <circle cx="160" cy="86" r="8" />
            <path d="M149 96 q11 -5 22 0 l3 22 q-14 5 -28 0 z" />
          </g>
          <rect x="0" y="0" width="20" height="140" fill="#050408" />
          <rect x="300" y="0" width="20" height="140" fill="#050408" />
        </g>
      );

    // ---- Retratos de primer plano (tercer pasaje de la cinemática) ----

    // Doña Berta: moño, arete de oro y un cigarrillo sin apuro.
    case "retrato-berta":
      return (
        <g>
          <ellipse cx="160" cy="64" rx="92" ry="58" fill={ORO} opacity="0.06" />
          <path d="M88 140 q12 -44 72 -46 q60 2 72 46 z" fill={NEGRO} />
          <ellipse cx="160" cy="60" rx="27" ry="31" fill={NEGRO} />
          <ellipse cx="160" cy="26" rx="14" ry="10" fill={NEGRO} />
          <path d="M148 26 q12 -7 24 0" stroke="#3a3440" strokeWidth="1.4" fill="none" />
          {/* media cara iluminada, arrugas de treinta años */}
          <path d="M160 32 q25 4 25 29 q0 22 -14 28 q-9 2 -11 -3 z" fill={PIEL} opacity="0.85" />
          <path d="M170 52 q6 1 9 4 M169 66 q7 2 9 6 M172 78 q4 2 5 5" stroke="#8a6a4a" strokeWidth="1.1" fill="none" opacity="0.8" />
          <path d="M168 50 h9" stroke={NEGRO} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="134" cy="66" r="3" fill="none" stroke={ORO} strokeWidth="1.3" />
          {/* cigarrillo con brasa */}
          <path d="M172 84 l16 5" stroke="#e9e3d2" strokeWidth="2.6" strokeLinecap="round" />
          <circle className="esc-brilla" cx="189" cy="89.5" r="1.8" fill={SANGRE} />
          <path className="esc-humo" d="M190 86 q3 -10 -1 -18 q-3 -8 1 -14" stroke="#7a7484" strokeWidth="1.3" fill="none" opacity="0.45" />
        </g>
      );

    // El Carnicero: cuello de toro, cicatriz en la ceja y el delantal manchado.
    case "retrato-carnicero":
      return (
        <g>
          <ellipse cx="160" cy="64" rx="96" ry="60" fill={SANGRE} opacity="0.05" />
          <path d="M74 140 q10 -50 86 -52 q76 2 86 52 z" fill={NEGRO} />
          {/* tira del delantal y mancha */}
          <path d="M126 108 l14 32 M194 108 l-14 32" stroke="#2a2118" strokeWidth="7" />
          <path d="M150 122 q12 -4 22 2 q6 8 -4 12 q-14 2 -20 -4 z" fill={SANGRE} opacity="0.4" />
          <path d="M160 20 q30 0 30 34 q0 14 -6 22 q-10 12 -24 12 q-14 0 -24 -12 q-6 -8 -6 -22 q0 -34 30 -34 z" fill={NEGRO} />
          {/* media cara: pomulo ancho y mandibula de piedra */}
          <path d="M160 26 q26 2 26 30 q0 18 -9 26 q-9 8 -17 6 z" fill={PIEL} opacity="0.85" />
          <path d="M166 44 h14" stroke={NEGRO} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M170 38 l7 -5" stroke={PIEL} strokeWidth="1.6" opacity="0.9" />
          <path d="M167 52 q4 2 7 1" stroke={NEGRO} strokeWidth="2" strokeLinecap="round" />
          <path d="M164 74 q8 2 12 -1" stroke="#6a4a34" strokeWidth="1.6" fill="none" />
        </g>
      );

    // El Verdugo: un silencio con mandibula. Dos puntas de fierro por ojos.
    case "retrato-verdugo":
      return (
        <g>
          <path d="M160 4 L104 132 L216 132 Z" fill={ORO} opacity="0.05" />
          <path d="M64 140 q14 -54 96 -56 q82 2 96 56 z" fill={NEGRO} />
          <path d="M160 14 q34 0 34 38 q0 18 -8 28 q-12 14 -26 14 q-14 0 -26 -14 q-8 -10 -8 -28 q0 -38 34 -38 z" fill="#070609" />
          {/* solo la mandibula recibe luz */}
          <path d="M138 82 q22 14 44 0 q-6 12 -22 12 q-16 0 -22 -12 z" fill={PIEL} opacity="0.5" />
          {/* dos puntas de fierro frio */}
          <circle className="esc-brilla" cx="147" cy="56" r="1.8" fill="#7a95a5" />
          <circle className="esc-brilla" cx="173" cy="56" r="1.8" fill="#7a95a5" />
        </g>
      );

    // El Croata: pomulos de hielo, ojo gris y el cigarro que no tiembla.
    case "retrato-croata":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#0c1622" opacity="0.35" />
          <ellipse cx="160" cy="62" rx="80" ry="56" fill="#9fb3c2" opacity="0.05" />
          <path d="M96 140 q10 -40 64 -42 q54 2 64 42 z" fill={NEGRO} />
          <path d="M160 18 q24 0 24 34 q0 20 -8 30 q-8 10 -16 10 q-8 0 -16 -10 q-8 -10 -8 -30 q0 -34 24 -34 z" fill={NEGRO} />
          {/* el filo del pomulo, iluminado desde un costado */}
          <path d="M160 26 q20 4 20 28 q0 18 -8 26 l-6 4 q-4 -2 -4 -6 z" fill={PIEL} opacity="0.7" />
          <path d="M164 48 l12 0" stroke={NEGRO} strokeWidth="2.6" strokeLinecap="round" />
          <circle className="esc-brilla" cx="170" cy="48" r="1.6" fill="#9fb3c2" />
          {/* cigarro perfectamente quieto */}
          <path d="M170 78 l14 2" stroke="#e9e3d2" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="185" cy="80.5" r="1.6" fill={SANGRE} />
          <path className="esc-humo" d="M186 77 q1 -14 0 -26" stroke="#9fb3c2" strokeWidth="1.2" fill="none" opacity="0.5" />
        </g>
      );

    // El Senador: sombrero fino, lentes con reflejo y sonrisa de afiche.
    case "retrato-senador":
      return (
        <g>
          <path d="M0 0 q10 70 0 140 h30 q-12 -70 0 -140 z" fill="#3a1a2e" opacity="0.5" />
          <path d="M320 0 q-10 70 0 140 h-30 q12 -70 0 -140 z" fill="#3a1a2e" opacity="0.5" />
          <ellipse cx="160" cy="64" rx="90" ry="58" fill={ORO} opacity="0.06" />
          <path d="M92 140 q12 -42 68 -44 q56 2 68 44 z" fill={NEGRO} />
          {/* solapa y prendedor */}
          <path d="M144 104 l16 20 l16 -20" stroke="#211d29" strokeWidth="3" fill="none" />
          <circle className="esc-brilla" cx="140" cy="116" r="2.2" fill={ORO} />
          <ellipse cx="160" cy="62" rx="25" ry="28" fill={NEGRO} />
          {/* sombrero fino */}
          <path d="M126 40 q34 -10 68 0 l-6 -6 q-28 -20 -56 0 z" fill="#070609" />
          <ellipse cx="160" cy="41" rx="36" ry="5" fill="#070609" />
          <path d="M132 36 q28 -8 56 0" stroke={ORO} strokeOpacity="0.5" strokeWidth="1.4" fill="none" />
          {/* media cara con lentes redondos */}
          <path d="M160 46 q22 4 22 24 q0 16 -10 22 q-8 4 -12 0 z" fill={PIEL} opacity="0.8" />
          <circle cx="149" cy="60" r="6.5" fill="none" stroke="#211d29" strokeWidth="1.6" />
          <circle cx="171" cy="60" r="6.5" fill="none" stroke="#211d29" strokeWidth="1.6" />
          <path d="M155 60 h10" stroke="#211d29" strokeWidth="1.4" />
          <path className="esc-brilla" d="M167 57 l5 3" stroke={ORO} strokeWidth="1.4" opacity="0.8" />
          <path d="M152 82 q8 4 16 0" stroke="#6a4a34" strokeWidth="1.6" fill="none" />
        </g>
      );

    // El Rey del Cacho: canas de tres decadas, ojo de halcon, prendedor de oro.
    case "retrato-rey":
      return (
        <g>
          <g className="esc-titila"><g fill={ORO} opacity="0.3">
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={i} x={12 + i * 32} y={90 - ((i * 29) % 40)} width="6" height={((i * 29) % 40) + 12} />
            ))}
          </g></g>
          <ellipse cx="160" cy="62" rx="92" ry="58" fill={ORO} opacity="0.07" />
          <path d="M90 140 q12 -44 70 -46 q58 2 70 46 z" fill={NEGRO} />
          {/* corbata y prendedor */}
          <path d="M160 96 l-7 18 l7 22 l7 -22 z" fill="#211d29" />
          <circle className="esc-brilla" cx="160" cy="112" r="2.4" fill={ORO} />
          <ellipse cx="160" cy="58" rx="26" ry="30" fill={NEGRO} />
          {/* canas peinadas hacia atras */}
          <path d="M136 44 q6 -22 24 -22 q18 0 24 22 q-10 -10 -24 -10 q-14 0 -24 10 z" fill="#c8c4bc" opacity="0.85" />
          {/* media cara: el ojo que lo ha visto todo */}
          <path d="M160 32 q24 4 24 28 q0 20 -12 27 q-9 4 -12 -1 z" fill={PIEL} opacity="0.85" />
          <path d="M166 50 l12 -2" stroke={NEGRO} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="172" cy="52" r="1.7" fill="#0a0810" />
          <circle cx="172.6" cy="51.4" r="0.5" fill="#e9e3d2" />
          <path d="M164 76 q8 2 13 -2" stroke="#6a4a34" strokeWidth="1.5" fill="none" />
        </g>
      );

    // El Patron: la luz le tiene miedo. Solo el menton y dos brillos de ojos.
    case "retrato-patron":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#050408" />
          <g className="esc-flicker">
            <circle cx="160" cy="10" r="5" fill={ORO} opacity="0.9" />
            <path d="M160 14 L112 130 L208 130 Z" fill={ORO} opacity="0.06" />
          </g>
          <path d="M84 140 q14 -46 76 -48 q62 2 76 48 z" fill="#070609" />
          <path d="M160 20 q30 0 30 36 q0 18 -9 28 q-10 12 -21 12 q-11 0 -21 -12 q-9 -10 -9 -28 q0 -36 30 -36 z" fill="#030205" />
          {/* el menton, lo unico que la ampolleta alcanza */}
          <path d="M144 86 q16 10 32 0 q-4 10 -16 10 q-12 0 -16 -10 z" fill={PIEL} opacity="0.35" />
          {/* dos brillos donde deberian ir los ojos */}
          <circle className="esc-brilla" cx="149" cy="58" r="1.2" fill="#e9e3d2" opacity="0.7" />
          <circle className="esc-brilla" cx="171" cy="58" r="1.2" fill="#e9e3d2" opacity="0.7" />
        </g>
      );

    // El pasillo sin número: angosto, larguísimo, una puerta al fondo.
    case "pasillo-sin-numero":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#050408" />
          {/* fuga del pasillo hacia la puerta del fondo */}
          <path d="M0 0 L140 34 L140 106 L0 140 Z" fill="#0a0810" />
          <path d="M320 0 L180 34 L180 106 L320 140 Z" fill="#0a0810" />
          <path d="M0 0 L320 0 L180 34 L140 34 Z" fill="#070609" />
          <path d="M0 140 L320 140 L180 106 L140 106 Z" fill="#0c0a12" />
          {/* líneas de fuga apenas doradas */}
          <g stroke={ORO} strokeOpacity="0.14" strokeWidth="1">
            <path d="M0 18 L146 40" />
            <path d="M320 18 L174 40" />
            <path d="M0 122 L146 100" />
            <path d="M320 122 L174 100" />
          </g>
          {/* la puerta sin número, con un hilo de luz abajo */}
          <rect x="146" y="42" width="28" height="58" fill="#0d0a08" stroke="#241a12" strokeWidth="1.4" />
          <rect className="esc-brilla" x="146" y="97" width="28" height="3" fill={ORO} opacity="0.55" />
          <circle cx="168" cy="72" r="1.4" fill={ORO} opacity="0.5" />
          {/* las dos siluetas que avanzan, de espaldas */}
          <g fill={NEGRO} opacity="0.92">
            <circle cx="118" cy="70" r="7" />
            <path d="M109 78 q9 -5 18 0 l3 34 q-12 4 -24 0 z" />
            <circle cx="94" cy="74" r="6" />
            <path d="M86 81 q8 -4 16 0 l3 29 q-11 4 -22 0 z" />
          </g>
        </g>
      );

    // La leyenda del Patrón: la libreta de nombres tachados y el cacho de marfil.
    case "patron-leyenda":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#070609" />
          <Suelo />
          {/* cono de luz sobre la mesa */}
          <g className="esc-flicker">
            <circle cx="160" cy="10" r="4" fill={ORO} opacity="0.85" />
            <path d="M160 14 L100 108 L220 108 Z" fill={ORO} opacity="0.07" />
          </g>
          {/* la mesa y el paño gastado */}
          <rect x="84" y="92" width="152" height="12" rx="3" fill="#241a12" />
          <rect x="92" y="86" width="136" height="8" rx="2" fill="#1a2a1e" />
          {/* la libreta abierta, con los nombres tachados */}
          <g transform="rotate(-3 150 78)">
            <rect x="118" y="66" width="64" height="24" rx="2" fill="#d9d5c9" opacity="0.85" />
            <line x1="150" y1="66" x2="150" y2="90" stroke="#8a8477" strokeWidth="1" />
            <g stroke="#3a3630" strokeWidth="1">
              <line x1="124" y1="72" x2="144" y2="72" />
              <line x1="124" y1="77" x2="142" y2="77" />
              <line x1="124" y1="82" x2="145" y2="82" />
              <line x1="156" y1="72" x2="176" y2="72" />
              <line x1="156" y1="77" x2="174" y2="77" />
            </g>
            {/* los tachados, en sangre vieja */}
            <g stroke={SANGRE} strokeWidth="1.3" opacity="0.8">
              <line x1="123" y1="71.5" x2="145" y2="72.5" />
              <line x1="123" y1="76.5" x2="143" y2="77.5" />
              <line x1="123" y1="81.5" x2="146" y2="82.5" />
              <line x1="155" y1="71.5" x2="177" y2="72.5" />
            </g>
          </g>
          {/* el cacho de marfil y sus dados viejos */}
          <path d="M204 74 l12 -5 10 5 -3 14 -9 3 -9 -4 z" fill="#e9e3d2" opacity="0.75" stroke="#8a8477" strokeWidth="0.8" />
          <rect x="196" y="84" width="7" height="7" rx="1.6" fill="#e9e3d2" opacity="0.7" />
          <circle cx="199.5" cy="87.5" r="1" fill="#3a3630" />
        </g>
      );

    // ---- Los cierres nuevos de los finales ----

    // Final estándar, cierre: el sobre negro de LA BANCA bajo la puerta.
    case "fin-trono-carta":
      return (
        <g>
          <Suelo />
          {/* la puerta del penthouse, apenas iluminada */}
          <rect x="120" y="12" width="80" height="110" fill="#100d16" stroke="#241a12" strokeWidth="2" />
          <circle cx="188" cy="70" r="2" fill={ORO} opacity="0.6" />
          {/* el hilo de luz de abajo */}
          <rect x="120" y="118" width="80" height="4" fill={ORO} opacity="0.18" />
          {/* el sobre negro, medio adentro, con el as dorado */}
          <g transform="rotate(-8 160 116)">
            <rect x="138" y="108" width="44" height="26" rx="2" fill="#0a0810" stroke={ORO} strokeOpacity="0.55" strokeWidth="1" />
            <path d="M138 108 L160 122 L182 108" fill="none" stroke={ORO} strokeOpacity="0.4" strokeWidth="1" />
            <rect className="esc-brilla" x="152" y="114" width="16" height="14" rx="1.5" fill="#0d0a08" stroke={ORO} strokeWidth="0.8" />
            <text x="160" y="125" textAnchor="middle" fontSize="10" fill={ORO} opacity="0.9" fontStyle="italic">A</text>
          </g>
        </g>
      );

    // Final malo, cierre: la pieza sin ventanas tacha tu nombre y apaga la luz.
    case "fin-traicion-banca":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#050408" />
          {/* el Mapocho abajo, llevándose el saco */}
          <path d="M0 124 q 60 -8 120 0 t 200 0 L320 140 L0 140 Z" fill="#0b1018" />
          <path d="M228 122 q10 -6 20 0 q-2 6 -10 6 q-8 0 -10 -6 z" fill={NEGRO} />
          <g stroke="#20303e" strokeWidth="1.2" fill="none" opacity="0.8">
            <path d="M20 128 q 8 -4 16 0 t 16 0" />
            <path d="M120 132 q 8 -4 16 0 t 16 0" />
          </g>
          {/* arriba, la pieza sin ventanas con la ampolleta a punto de apagarse */}
          <rect x="96" y="12" width="128" height="84" fill="#0a0810" stroke="#000000" strokeWidth="6" />
          <g className="esc-flicker">
            <circle cx="160" cy="26" r="3" fill={ORO} opacity="0.5" />
            <path d="M160 29 L138 74 L182 74 Z" fill={ORO} opacity="0.05" />
          </g>
          {/* la mano y la libreta: tu nombre, tachado */}
          <rect x="136" y="58" width="48" height="18" rx="2" fill="#d9d5c9" opacity="0.7" transform="rotate(-2 160 67)" />
          <g stroke="#3a3630" strokeWidth="1">
            <line x1="142" y1="64" x2="170" y2="64" />
            <line x1="142" y1="69" x2="166" y2="69" />
          </g>
          <line x1="140" y1="63" x2="172" y2="65" stroke={SANGRE} strokeWidth="1.6" />
          <path d="M176 70 q6 2 8 8 l-6 2 q-4 -4 -2 -10 z" fill={NEGRO} />
        </g>
      );

    // Final verdadero: la confesión del Patrón, de tahúr a tahúr.
    case "fin-amanecer-confesion":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#070609" />
          <Suelo />
          <g className="esc-flicker">
            <circle cx="160" cy="10" r="4" fill={ORO} opacity="0.8" />
            <path d="M160 14 L96 112 L224 112 Z" fill={ORO} opacity="0.06" />
          </g>
          {/* la mesa entre los dos */}
          <rect x="120" y="92" width="80" height="10" rx="3" fill="#241a12" />
          <path d="M150 84 l8 -3 7 3 -2 8 -6 2 -6 -3 z" fill="#e9e3d2" opacity="0.6" />
          {/* el Patrón, vencido, con las manos a la vista */}
          <g fill={NEGRO} opacity="0.94">
            <circle cx="216" cy="62" r="9" />
            <path d="M204 72 q12 -6 24 0 l4 30 q-16 5 -32 0 z" />
          </g>
          <path d="M206 92 q4 3 8 1 M226 92 q-4 3 -8 1" stroke={PIEL} strokeWidth="2" opacity="0.4" fill="none" />
          {/* tú, de pie, escuchando */}
          <g fill={NEGRO} opacity="0.92">
            <circle cx="104" cy="52" r="8" />
            <path d="M94 61 q10 -5 20 0 l4 42 q-14 5 -28 0 z" />
          </g>
        </g>
      );

    // Final verdadero: la libreta abierta en la primera página, y el "no".
    case "fin-amanecer-libreta":
      return (
        <g>
          <rect x="0" y="0" width="320" height="140" fill="#070609" />
          <g className="esc-flicker">
            <circle cx="160" cy="10" r="4" fill={ORO} opacity="0.8" />
            <path d="M160 14 L110 96 L210 96 Z" fill={ORO} opacity="0.07" />
          </g>
          {/* la libreta, enorme en primer plano */}
          <g transform="rotate(-2 160 92)">
            <rect x="96" y="64" width="128" height="56" rx="3" fill="#d9d5c9" opacity="0.88" />
            <line x1="160" y1="64" x2="160" y2="120" stroke="#8a8477" strokeWidth="1.4" />
            {/* la primera página: UN solo nombre, tachado con rabia */}
            <line x1="112" y1="86" x2="148" y2="86" stroke="#3a3630" strokeWidth="1.4" />
            <g stroke={SANGRE} strokeWidth="2" opacity="0.85">
              <line x1="108" y1="83" x2="152" y2="89" />
              <line x1="108" y1="90" x2="152" y2="84" />
            </g>
            {/* la última página, en blanco: nadie más */}
            <g stroke="#b9b4a6" strokeWidth="1" opacity="0.6">
              <line x1="172" y1="78" x2="212" y2="78" />
              <line x1="172" y1="88" x2="212" y2="88" />
              <line x1="172" y1="98" x2="212" y2="98" />
            </g>
          </g>
          {/* la mano que la cierra, desde el borde */}
          <path d="M60 140 q10 -26 34 -22 l6 10 q-16 4 -22 16 z" fill={NEGRO} />
        </g>
      );

    // El Fiador: el prestamista de la tienda. Lentes chicos, chaleco y pluma.
    case "retrato-fiador":
      return (
        <g>
          {/* estantes de la tienda al fondo */}
          <g fill="#1c160f" stroke="#4a3c22" strokeWidth="1">
            <rect x="10" y="18" width="70" height="8" />
            <rect x="10" y="44" width="70" height="8" />
            <rect x="240" y="18" width="70" height="8" />
            <rect x="240" y="44" width="70" height="8" />
          </g>
          <g fill={NEGRO}>
            <path d="M20 8 h7 v5 l2.5 3 v2 h-12 v-2 l2.5 -3 z" />
            <path d="M44 6 h6 v6 l2.5 3 v3 h-11 v-3 l2.5 -3 z" />
            <path d="M252 8 h7 v5 l2.5 3 v2 h-12 v-2 l2.5 -3 z" />
            <path d="M282 6 h6 v6 l2.5 3 v3 h-11 v-3 l2.5 -3 z" />
          </g>
          <ellipse cx="160" cy="62" rx="88" ry="56" fill={ORO} opacity="0.07" />
          {/* hombros con chaleco y reloj de bolsillo */}
          <path d="M94 140 q12 -42 66 -44 q54 2 66 44 z" fill={NEGRO} />
          <path d="M146 104 l14 24 l14 -24" stroke="#2e2a24" strokeWidth="3.5" fill="none" />
          <circle className="esc-brilla" cx="146" cy="120" r="2.4" fill={ORO} />
          <path d="M146 120 q6 5 13 7" stroke={ORO} strokeOpacity="0.55" strokeWidth="1" fill="none" />
          {/* cabeza: calvo con canas a los lados */}
          <ellipse cx="160" cy="60" rx="25" ry="29" fill={NEGRO} />
          <path d="M160 32 q24 4 24 28 q0 20 -12 27 q-9 4 -12 -1 z" fill={PIEL} opacity="0.85" />
          <path d="M136 54 q-2 14 6 22 q-2 -12 0 -22 z M184 54 q2 14 -6 22 q2 -12 0 -22 z" fill="#c8c4bc" opacity="0.8" />
          {/* lentes chicos de prestamista, caídos sobre la nariz */}
          <circle cx="150" cy="63" r="5" fill="none" stroke={ORO} strokeWidth="1.3" />
          <circle cx="170" cy="63" r="5" fill="none" stroke={ORO} strokeWidth="1.3" />
          <path d="M155 63 h10 M145 62 l-8 -3 M175 62 l8 -3" stroke={ORO} strokeWidth="1.1" fill="none" />
          {/* ojos por encima de los lentes (siempre midiendo) */}
          <circle cx="150" cy="58" r="1.3" fill="#0a0810" />
          <circle cx="170" cy="58" r="1.3" fill="#0a0810" />
          {/* boca de vendedor: media sonrisa profesional */}
          <path d="M153 80 q7 3 14 0" stroke="#6a4a34" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {/* pluma detrás de la oreja */}
          <path d="M182 46 l14 -10 l-3 12 z" fill="#e9e3d2" opacity="0.85" />
        </g>
      );

    // ---- Cierre de capítulo: la caída del jefe y su secuela ----

    // La Pocilga cae: el cacho rebota sobre la mesa pegajosa de vino.
    case "caida-pocilga":
      return (
        <g>
          <Suelo />
          <rect x="40" y="100" width="240" height="8" rx="3" fill="#241a12" />
          <path d="M150 76 l9 -8 8 5 -3 10 -8 3 -6 -4 z" fill="#241a12" stroke={ORO} strokeOpacity="0.5" transform="rotate(24 155 82)" />
          <rect x="120" y="94" width="9" height="9" rx="2" fill="#e9e3d2" transform="rotate(-30 124 98)" />
          <rect x="176" y="98" width="9" height="9" rx="2" fill="#e9e3d2" transform="rotate(18 180 102)" />
          <g fill={NEGRO} opacity="0.7">
            <path d="M30 138 q0 -18 12 -24 q9 5 7 24 z" />
            <path d="M270 138 q0 -20 13 -26 q10 6 8 26 z" />
          </g>
        </g>
      );
    // La noticia sale corriendo hacia la noche del puerto.
    case "secuela-pocilga":
      return (
        <g>
          <rect x="230" y="14" width="70" height="110" fill="#10151f" />
          <circle cx="278" cy="34" r="7" fill="#e9e3d2" opacity="0.4" />
          <rect x="222" y="10" width="10" height="118" fill={NEGRO} />
          <g fill={NEGRO}>
            <circle cx="200" cy="72" r="7" />
            <path d="M191 80 q9 -4 18 0 l6 34 q-15 6 -30 0 z" />
            <path d="M191 84 l-14 10 M209 84 l16 6" stroke={NEGRO} strokeWidth="4" strokeLinecap="round" />
          </g>
          <Suelo />
        </g>
      );

    // La Vega Chica cae: el cuchillo se le clava en el aserrín.
    case "caida-vega":
      return (
        <g>
          <Suelo />
          <rect x="20" y="98" width="90" height="8" fill="#241a12" />
          <rect x="210" y="98" width="90" height="8" fill="#241a12" />
          <path d="M158 118 l16 -34 4 2 -12 34 z" fill="#c8c4bc" stroke={NEGRO} strokeWidth="1" transform="rotate(-6 160 100)" />
          <ellipse cx="160" cy="120" rx="20" ry="4" fill="#000000" opacity="0.3" />
          <path d="M140 96 q10 -6 22 -2 q4 5 -1 9 q-12 2 -20 -1 q-4 -3 -1 -6 z" fill={PIEL} />
          <circle cx="150" cy="98" r="2" fill={SANGRE} opacity="0.7" />
        </g>
      );
    // Los puestos del mercado bajan la voz; la noticia baja con ellos.
    case "secuela-vega":
      return (
        <g>
          <Suelo />
          <g fill={NEGRO} opacity="0.75">
            <rect x="16" y="80" width="46" height="50" />
            <rect x="70" y="86" width="40" height="44" />
            <rect x="210" y="84" width="42" height="46" />
            <rect x="258" y="78" width="46" height="52" />
          </g>
          <g fill={NEGRO}>
            <circle cx="130" cy="88" r="6" />
            <path d="M122 96 q8 -4 16 0 l2 26 q-10 4 -20 0 z" />
            <circle cx="190" cy="90" r="6" />
            <path d="M182 98 q8 -4 16 0 l2 24 q-10 4 -20 0 z" />
          </g>
        </g>
      );

    // La Maestranza cae: el cacho gastado rueda entre los rieles.
    case "caida-maestranza":
      return (
        <g>
          <path d="M0 110 h320 M0 118 h320" stroke="#241a12" strokeWidth="3" />
          <g stroke="#1a140c" strokeWidth="3">
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={i} x1={i * 34} y1="108" x2={i * 34} y2="120" />
            ))}
          </g>
          <path d="M150 96 l8 -3 7 3 -2 8 -6 2 -6 -3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.5" transform="rotate(40 154 100)" />
          <g className="esc-chispa" fill={ORO}>
            {Array.from({ length: 6 }).map((_, i) => (
              <circle key={i} cx={210 + i * 8} cy={70 - ((i * 13) % 20)} r="1.4" opacity={0.5 - i * 0.07} />
            ))}
          </g>
        </g>
      );
    // Los obreros se corren para abrir un boquerón oscuro entre los rieles.
    case "secuela-maestranza":
      return (
        <g>
          <Suelo />
          <path d="M130 30 q30 -10 60 0 v90 h-60 z" fill="#050408" />
          <g fill={NEGRO} opacity="0.85">
            <path d="M60 140 q0 -26 16 -34 q12 7 9 34 z" />
            <path d="M250 140 q0 -28 17 -36 q13 8 9 36 z" />
          </g>
        </g>
      );

    // La Trastienda cae: al Croata se le cae el cigarro por primera vez en diez años.
    case "caida-trastienda":
      return (
        <g>
          <Suelo />
          <ellipse cx="160" cy="112" rx="86" ry="20" fill="#15251a" />
          <ellipse cx="160" cy="108" rx="86" ry="20" fill="#1c3323" />
          <path d="M150 70 l14 -5" stroke={NEGRO} strokeWidth="3" strokeLinecap="round" transform="rotate(50 155 72)" />
          <circle cx="150" cy="92" r="1.6" fill={SANGRE} opacity="0.8" />
          <path d="M148 96 q-2 8 1 14" stroke="#7a7484" strokeWidth="1.4" fill="none" opacity="0.4" />
          <path d="M170 84 q8 -4 16 0 q2 4 -2 6 q-10 1 -16 -1 q-2 -2 2 -5 z" fill={PIEL} />
        </g>
      );
    // Una puerta que nadie sabía que estaba ahí se abre más adentro.
    case "secuela-trastienda":
      return (
        <g>
          <Suelo />
          <rect x="128" y="12" width="64" height="106" fill="#050408" />
          <rect x="128" y="12" width="64" height="106" fill="none" stroke="#0a0810" strokeWidth="6" />
          <path d="M192 12 v106" stroke={ORO} strokeOpacity="0.2" strokeWidth="1.4" />
          <ellipse cx="160" cy="70" rx="50" ry="60" fill="#0c1622" opacity="0.25" />
        </g>
      );

    // El Subterráneo cae: al Senador se le desparraman los fajos de un bolsillo roto.
    case "caida-club":
      return (
        <g>
          <Suelo />
          <path d="M0 0 q10 70 0 140 h34 q-12 -70 0 -140 z" fill="#3a1a2e" opacity="0.6" />
          <path d="M320 0 q-10 70 0 140 h-34 q12 -70 0 -140 z" fill="#3a1a2e" opacity="0.6" />
          <g fill={ORO} opacity="0.85">
            <rect x="140" y="100" width="16" height="9" rx="1.5" transform="rotate(-12 148 104)" />
            <rect x="164" y="106" width="16" height="9" rx="1.5" transform="rotate(20 172 110)" />
            <circle cx="130" cy="112" r="5" />
            <circle cx="190" cy="108" r="5" />
          </g>
        </g>
      );
    // La multitud del Subterráneo se corre un paso atrás cuando pasas.
    case "secuela-club":
      return (
        <g>
          <Suelo />
          <g fill={NEGRO} opacity="0.8">
            <path d="M40 140 q0 -22 13 -30 q10 6 8 30 z" />
            <path d="M92 140 q0 -24 14 -32 q11 7 9 32 z" />
            <path d="M214 140 q0 -24 14 -32 q11 7 9 32 z" />
            <path d="M266 140 q0 -22 13 -30 q10 6 8 30 z" />
          </g>
          <ellipse cx="160" cy="60" rx="40" ry="50" fill={ORO} opacity="0.05" />
        </g>
      );

    // La Cumbre: al Rey le tiemblan las manos por primera vez en treinta años.
    case "caida-cumbre":
      return (
        <g>
          <rect x="16" y="10" width="288" height="94" fill="#0b1018" />
          <g fill={ORO} opacity="0.4">
            {Array.from({ length: 18 }).map((_, i) => (
              <rect key={i} x={22 + i * 15} y={82 - ((i * 23) % 50)} width="7" height={((i * 23) % 50) + 14} />
            ))}
          </g>
          <rect x="16" y="10" width="288" height="94" fill="none" stroke="#0a0810" strokeWidth="6" />
          <path d="M148 96 l9 -3 8 3 -2 8 -6 2 -6 -3 z" fill="#241a12" stroke={ORO} strokeOpacity="0.6" />
          <path d="M146 100 q-2 3 0 6 M172 100 q2 3 0 6" stroke={ORO} strokeOpacity="0.3" strokeWidth="1" fill="none" />
        </g>
      );
    // El silencio que sigue: manos vacías, todo Chile encendido detrás.
    case "secuela-cumbre":
      return (
        <g>
          <rect x="16" y="10" width="288" height="94" fill="#0b1018" />
          <rect x="16" y="10" width="288" height="94" fill="none" stroke="#0a0810" strokeWidth="6" />
          <g fill={PIEL} opacity="0.9">
            <path d="M140 100 q10 -5 20 -1 q3 5 -2 8 q-11 2 -18 -1 q-3 -3 0 -6 z" />
          </g>
          <ellipse cx="160" cy="112" rx="60" ry="10" fill="#000000" opacity="0.2" />
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
