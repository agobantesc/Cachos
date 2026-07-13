// Actualizaciones de la app (service worker en modo "prompt"): cuando hay una
// versión nueva desplegada, avisamos con un cartel en vez de cambiar en
// silencio — así nadie juega una mesa con una versión vieja sin saberlo.
let aplicar: (() => void) | null = null;
const subs = new Set<() => void>();

/** Suscribe un aviso de "hay versión nueva". Si ya la hay, avisa al tiro. */
export function alHaberNuevaVersion(cb: () => void): () => void {
  subs.add(cb);
  if (aplicar) cb();
  return () => subs.delete(cb);
}

/** Aplica la actualización pendiente (recarga con la versión nueva). */
export function aplicarActualizacion(): void {
  aplicar?.();
}

/** Registra el service worker (una vez, desde el arranque de la app). */
export function iniciarSW(): void {
  if (typeof window === "undefined") return;
  // Import dinámico: el módulo virtual sólo existe dentro del build de Vite.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const actualizar = registerSW({
        immediate: true,
        onNeedRefresh() {
          aplicar = () => void actualizar(true);
          for (const f of subs) f();
        },
      });
    })
    .catch(() => {
      /* sin service worker (dev/tests): no pasa nada */
    });
}
