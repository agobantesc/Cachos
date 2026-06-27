// Efectos de sonido sintetizados con la Web Audio API. Sin archivos (funciona
// offline y carga instantánea). Se puede silenciar; la preferencia se guarda.
const CLAVE = "cachos.sonido";

let ctx: AudioContext | null = null;
let activado = leerPreferencia();
let desbloqueado = false;

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== "off";
  } catch {
    return true;
  }
}

function crearCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AC ? new AC() : null;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = crearCtx();
  return ctx;
}

// Golpe de desbloqueo para iOS: reproducir un buffer mudo dentro del gesto del
// usuario. En la PWA instalada (acceso directo), `resume()` por sí solo NO
// habilita el audio; hace falta arrancar una fuente al menos una vez. Se repite
// en cada toque hasta confirmar que el contexto quedó "running".
function golpeSilencio(c: AudioContext): void {
  try {
    const buffer = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(c.destination);
    src.start(0);
    if (c.state === "running") desbloqueado = true;
  } catch {
    /* ignore */
  }
}

/**
 * Deja el audio listo para sonar. En móvil el AudioContext arranca "suspended"
 * (o, en Safari/PWA, queda "interrupted") y no revive solo: lo reanudamos, lo
 * recreamos si quedó inservible y le damos el golpe de desbloqueo de iOS.
 */
function asegurarAudio(): void {
  let c = ac();
  if (!c) return;
  const estado = c.state as string;
  if (estado === "suspended") {
    void c.resume();
  } else if (estado !== "running") {
    // "interrupted" / "closed" u otro: el contexto ya no sirve, se recrea.
    try {
      void c.close();
    } catch {
      /* ignore */
    }
    ctx = crearCtx();
    c = ctx;
    desbloqueado = false;
    if (c && c.state === "suspended") void c.resume();
  }
  if (c && !desbloqueado) golpeSilencio(c);
}

// Reactivar el audio al volver a primer plano y en cualquier toque del usuario.
// Esto recupera el sonido tras cerrar y reabrir la PWA (sin esto, en iOS el
// contexto queda suspendido y se "pierde" el sonido).
if (typeof window !== "undefined") {
  const reactivar = () => {
    if (activado) asegurarAudio();
  };
  // Sólo pointerdown (touchstart + pointerdown se disparan ambos en un mismo
  // toque y pueden recrear el contexto a medias en iOS).
  window.addEventListener("pointerdown", reactivar, { passive: true });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reactivar();
    });
  }
}

export function sonidoActivado(): boolean {
  return activado;
}

/** Debe llamarse dentro de un gesto del usuario (clic) para habilitar el audio. */
export function desbloquearAudio(): void {
  asegurarAudio();
}

export function alternarSonido(): boolean {
  activado = !activado;
  try {
    localStorage.setItem(CLAVE, activado ? "on" : "off");
  } catch {
    /* sin persistencia */
  }
  if (activado) asegurarAudio();
  return activado;
}

function reproducir(fn: (c: AudioContext, t0: number) => void): void {
  if (!activado) return;
  asegurarAudio();
  const c = ac();
  if (!c) return;
  try {
    fn(c, c.currentTime);
  } catch {
    /* audio no disponible */
  }
}

function tono(c: AudioContext, t: number, freq: number, dur: number, tipo: OscillatorType = "sine", vol = 0.18): void {
  const o = c.createOscillator();
  o.type = tipo;
  o.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

// Rattle de cachos: ráfagas cortas de ruido filtrado, como dados agitándose.
function rattle(c: AudioContext, t0: number): void {
  const golpes = 8;
  for (let i = 0; i < golpes; i++) {
    const t = t0 + i * 0.042 + Math.random() * 0.012;
    const dur = 0.03;
    const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200 + Math.random() * 1800;
    bp.Q.value = 1.1;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + dur);
  }
}

export const Sonidos = {
  dados: () => reproducir(rattle),
  apostar: () => reproducir((c, t) => tono(c, t, 660, 0.09, "triangle", 0.15)),
  dudar: () =>
    reproducir((c, t) => {
      tono(c, t, 320, 0.14, "sawtooth", 0.18);
      tono(c, t + 0.08, 220, 0.16, "sawtooth", 0.16);
    }),
  calzar: () =>
    reproducir((c, t) => {
      tono(c, t, 523, 0.1, "square", 0.12);
      tono(c, t + 0.09, 784, 0.12, "square", 0.12);
    }),
  pasar: () => reproducir((c, t) => tono(c, t, 480, 0.18, "sine", 0.1)),
  ganar: () =>
    reproducir((c, t) => {
      [523, 659, 784, 1047].forEach((f, i) => tono(c, t + i * 0.1, f, 0.18, "triangle", 0.16));
    }),
  perder: () =>
    reproducir((c, t) => {
      tono(c, t, 170, 0.28, "sawtooth", 0.2);
      tono(c, t + 0.06, 90, 0.32, "sine", 0.18);
    }),
};
