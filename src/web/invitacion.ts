// Invitar amigos a una sala en línea: enlace directo + compartir por WhatsApp.
// El enlace lleva la contraseña como `?sala=CODIGO`; al abrirlo, la app entra
// directo a "Mesa en línea" con el código ya puesto (sólo falta el nombre).

/** URL del juego con la sala precargada (respeta el base de la PWA). */
export function enlaceSala(codigo: string): string {
  const base = `${window.location.origin}${import.meta.env.BASE_URL}`;
  return `${base}?sala=${encodeURIComponent(codigo)}`;
}

/** Mensaje de invitación listo para pegar en un chat. */
export function mensajeInvitacion(codigo: string): string {
  return (
    `Te invito a una mesa de Cachos 🎲\n` +
    `Entra aquí: ${enlaceSala(codigo)}\n` +
    `(o pon la contraseña ${codigo} en "Mesa en línea")`
  );
}

/** Abre WhatsApp con la invitación lista. */
export function invitarWhatsApp(codigo: string): void {
  const url = `https://wa.me/?text=${encodeURIComponent(mensajeInvitacion(codigo))}`;
  window.open(url, "_blank", "noopener");
}

/** Copia la invitación al portapapeles. Devuelve true si lo logró. */
export async function copiarInvitacion(codigo: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(mensajeInvitacion(codigo));
    return true;
  } catch {
    return false;
  }
}

/** Lee la contraseña de sala desde la URL (?sala=CODIGO), si viene. */
export function salaDesdeURL(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("sala");
  } catch {
    return null;
  }
}

/** Quita el ?sala= de la URL sin recargar (tras usarlo). */
export function limpiarURLSala(): void {
  try {
    const u = new URL(window.location.href);
    if (u.searchParams.has("sala")) {
      u.searchParams.delete("sala");
      window.history.replaceState(null, "", u.toString());
    }
  } catch {
    /* ignore */
  }
}
