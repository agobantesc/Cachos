// Iconografía de la Asociación: SVG monoline, sin emojis. Mantiene la línea
// gráfica del sello de la casa (humo, oro viejo) y se ve igual en todo navegador.

/** Sello de la casa: el dado de cinco (quina), igual que el favicon. */
export function Emblema({ tam = 104 }: { tam?: number }) {
  return (
    <svg
      className="emblema"
      width={tam}
      height={tam}
      viewBox="0 0 512 512"
      role="img"
      aria-label="La Asociación de Cachos"
    >
      <rect width="512" height="512" rx="96" fill="#0c0d10" />
      <rect x="40" y="40" width="432" height="432" rx="72" fill="none" stroke="#c8a24a" strokeWidth="6" opacity="0.55" />
      <rect x="96" y="96" width="320" height="320" rx="56" fill="#e9e3d2" />
      <rect x="96" y="96" width="320" height="320" rx="56" fill="none" stroke="#c8a24a" strokeWidth="6" />
      <g fill="#15110a">
        <circle cx="176" cy="176" r="34" />
        <circle cx="336" cy="176" r="34" />
        <circle cx="256" cy="256" r="34" />
        <circle cx="176" cy="336" r="34" />
        <circle cx="336" cy="336" r="34" />
      </g>
    </svg>
  );
}

/** Dado en miniatura (silueta de oro) para acompañar conteos. */
export function IconoDado({ tam = 15 }: { tam?: number }) {
  return (
    <svg className="ico" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <g fill="currentColor">
        <circle cx="8" cy="8" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="16" cy="16" r="1.7" />
      </g>
    </svg>
  );
}

/** Bocina con/sin ondas, para el control de sonido. */
export function IconoSonido({ activo, tam = 19 }: { activo: boolean; tam?: number }) {
  return (
    <svg
      className="ico"
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9 H7.5 L13 5 V19 L7.5 15 H4 Z" fill="currentColor" stroke="none" />
      {activo ? (
        <>
          <path d="M16.5 8.6 a5 5 0 0 1 0 6.8" />
          <path d="M19 6 a8.5 8.5 0 0 1 0 12" />
        </>
      ) : (
        <path d="M16.5 9.5 l5 5 M21.5 9.5 l-5 5" />
      )}
    </svg>
  );
}
