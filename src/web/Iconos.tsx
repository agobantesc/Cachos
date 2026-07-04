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

/** Calavera, para el modo historia (bajo mundo). */
export function IconoCalavera({ tam = 28 }: { tam?: number }) {
  return (
    <svg className="ico" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2C7.6 2 4 5.4 4 9.6c0 2.3 1 4.2 2.6 5.5.3.2.4.5.4.9V18c0 .8.7 1.5 1.5 1.5h.4v1c0 .3.2.5.5.5h1c.3 0 .5-.2.5-.5v-1h2v1c0 .3.2.5.5.5h1c.3 0 .5-.2.5-.5v-1h.4c.8 0 1.5-.7 1.5-1.5v-2c0-.4.1-.7.4-.9C19 13.8 20 11.9 20 9.6 20 5.4 16.4 2 12 2z"
      />
      <g fill="#15110a">
        <circle cx="9" cy="10.5" r="2.1" />
        <circle cx="15" cy="10.5" r="2.1" />
        <path d="M12 13.2l1 2.2h-2z" />
      </g>
    </svg>
  );
}

/** Dos figuras: para la mesa en línea (jugar con amigos). */
export function IconoPersonas({ tam = 28 }: { tam?: number }) {
  return (
    <svg className="ico" width={tam} height={tam} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="currentColor">
        <circle cx="8.5" cy="8" r="3.2" />
        <path d="M2.5 19.5 c0 -3.6 2.7 -6 6 -6 c3.3 0 6 2.4 6 6 z" />
        <circle cx="16.4" cy="8.8" r="2.7" opacity="0.85" />
        <path d="M13.6 14.2 c0.9 -0.5 1.8 -0.7 2.8 -0.7 c3 0 5.1 2.1 5.1 5.3 h-5.1 c0 -1.9 -1 -3.5 -2.8 -4.6 z" opacity="0.85" />
      </g>
    </svg>
  );
}

/** Glifo de WhatsApp (burbuja con teléfono), para el botón de invitar. */
export function IconoWhatsApp({ tam = 20 }: { tam?: number }) {
  return (
    <svg className="ico" width={tam} height={tam} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.05L2 22l5.1-1.34A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 0 16 8 8 0 0 1-4.08-1.12l-.3-.18-2.6.68.7-2.53-.2-.32A8 8 0 0 1 12 4z" />
      <path d="M8.5 7.2c-.2 0-.5 0-.7.4-.3.4-1 1-1 2.4s1 2.8 1.2 3c.2.2 2 3.1 4.9 4.2 2.4 1 2.9.8 3.4.7.5 0 1.6-.6 1.8-1.3.2-.6.2-1.2.16-1.3-.07-.1-.26-.18-.55-.32-.3-.15-1.65-.82-1.9-.9-.26-.1-.45-.15-.63.14-.18.3-.7.9-.86 1.08-.16.18-.32.2-.6.07-.3-.15-1.2-.45-2.3-1.42-.84-.75-1.4-1.67-1.57-1.96-.16-.3 0-.45.13-.6.13-.13.3-.34.44-.5.15-.18.2-.3.3-.5.1-.2.05-.36-.02-.5-.08-.16-.63-1.56-.88-2.13-.2-.46-.4-.4-.55-.4z" />
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
