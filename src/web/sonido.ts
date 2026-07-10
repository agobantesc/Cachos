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
  else Ambiente.detener(); // silenciar apaga también el paisaje continuo
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

// Vibración háptica (Android; en iOS es un no-op silencioso). Ligada al mismo
// interruptor del sonido para que "silenciar" calle también al motor.
export function vibrar(patron: number | number[]): void {
  if (!activado) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(patron);
  } catch {
    /* sin háptica */
  }
}

// Golpe seco de tambor + cuerpo grave: el redoble de la revelación.
function golpeReveal(c: AudioContext, t0: number): void {
  const dur = 0.09;
  const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400;
  bp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
  tono(c, t0 + 0.01, 96, 0.22, "sine", 0.22);
}

export const Sonidos = {
  dados: () => reproducir(rattle),
  // Redoble de la revelación (se destapan los vasos).
  revelar: () => reproducir((c, t) => golpeReveal(c, t)),
  // Carta que se da vuelta (lectura de suerte): un soplido corto.
  carta: () =>
    reproducir((c, t) => {
      tono(c, t, 1150, 0.05, "triangle", 0.08);
      tono(c, t + 0.045, 760, 0.09, "triangle", 0.1);
    }),
  // Sting de EVENTO de calle: dos notas bajas, misteriosas.
  evento: () =>
    reproducir((c, t) => {
      tono(c, t, 196, 0.32, "sine", 0.14);
      tono(c, t + 0.16, 233, 0.4, "sine", 0.12);
    }),
  // Sting de JEFE: tritono grave, amenaza pura.
  boss: () =>
    reproducir((c, t) => {
      tono(c, t, 110, 0.5, "sawtooth", 0.12);
      tono(c, t + 0.02, 156, 0.5, "sine", 0.14);
      tono(c, t + 0.3, 104, 0.6, "sine", 0.16);
    }),
  apostar: () => reproducir((c, t) => tono(c, t, 660, 0.09, "triangle", 0.15)),
  // Te toca a TI: campanilla ascendente, clara y distinta, para que no te pierdas
  // tu turno aunque estés mirando para otro lado (sobre todo jugando en línea).
  tuTurno: () =>
    reproducir((c, t) => {
      tono(c, t, 660, 0.12, "triangle", 0.17);
      tono(c, t + 0.1, 988, 0.18, "triangle", 0.16);
    }),
  // Jugó un rival: golpecito breve y suave, para oír que la mesa avanza mientras
  // esperas tu turno (sin molestar: volumen bajo).
  tic: () => reproducir((c, t) => tono(c, t, 300, 0.05, "sine", 0.07)),
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
  // ¡La siciliana! Caída dramática: dos golpes que se desploman.
  siciliana: () =>
    reproducir((c, t) => {
      tono(c, t, 220, 0.16, "sawtooth", 0.16);
      tono(c, t + 0.12, 156, 0.2, "sawtooth", 0.16);
      tono(c, t + 0.26, 78, 0.5, "sine", 0.2);
    }),
};

// ============================================================
// AMBIENTE: paisaje sonoro continuo por capítulo, tensión adaptativa
// (latido cuando quedas al filo) y drone de jefe. Todo sintetizado:
// ruido filtrado + osciladores con LFOs, a volúmenes muy bajos.
// ============================================================

interface CapaViva {
  parar: (t: number) => void;
}

/** Fuente de ruido blanco en loop (base de olas, viento, murmullos). */
function fuenteRuido(c: AudioContext): AudioBufferSourceNode {
  const dur = 2;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let s = 0; s < data.length; s++) data[s] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

/** Capa de ruido filtrado con vaivén lento (LFO sobre el volumen). */
function capaRuido(
  c: AudioContext,
  destino: AudioNode,
  opts: { tipo: BiquadFilterType; freq: number; q?: number; vol: number; lfoHz?: number; lfoProf?: number },
): CapaViva {
  const src = fuenteRuido(c);
  const filtro = c.createBiquadFilter();
  filtro.type = opts.tipo;
  filtro.frequency.value = opts.freq;
  filtro.Q.value = opts.q ?? 0.7;
  const g = c.createGain();
  g.gain.value = opts.vol;
  let lfo: OscillatorNode | null = null;
  let lfoGain: GainNode | null = null;
  if (opts.lfoHz) {
    lfo = c.createOscillator();
    lfo.frequency.value = opts.lfoHz;
    lfoGain = c.createGain();
    lfoGain.gain.value = opts.lfoProf ?? opts.vol * 0.6;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();
  }
  src.connect(filtro).connect(g).connect(destino);
  src.start();
  return {
    parar: (t) => {
      try {
        src.stop(t);
        lfo?.stop(t);
      } catch {
        /* ya parado */
      }
    },
  };
}

/** Capa de tono sostenido (zumbidos, pads y subgraves). */
function capaTono(
  c: AudioContext,
  destino: AudioNode,
  opts: { freq: number; tipo?: OscillatorType; vol: number; detune?: number },
): CapaViva {
  const o = c.createOscillator();
  o.type = opts.tipo ?? "sine";
  o.frequency.value = opts.freq;
  if (opts.detune) o.detune.value = opts.detune;
  const g = c.createGain();
  g.gain.value = opts.vol;
  o.connect(g).connect(destino);
  o.start();
  return {
    parar: (t) => {
      try {
        o.stop(t);
      } catch {
        /* ya parado */
      }
    },
  };
}

/** Recetas por capítulo (la clave es la estampa: cap-muelle, cap-vega, …). */
function armarPaisaje(c: AudioContext, master: GainNode, clave: string): { capas: CapaViva[]; timers: ReturnType<typeof setTimeout>[] } {
  const capas: CapaViva[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];
  switch (clave) {
    case "cap-muelle": // olas lentas y viento fino del puerto
      capas.push(capaRuido(c, master, { tipo: "lowpass", freq: 240, vol: 0.05, lfoHz: 0.09, lfoProf: 0.035 }));
      capas.push(capaRuido(c, master, { tipo: "highpass", freq: 2600, vol: 0.006, lfoHz: 0.05, lfoProf: 0.004 }));
      break;
    case "cap-vega": // murmullo de mercado nocturno
      capas.push(capaRuido(c, master, { tipo: "bandpass", freq: 420, q: 0.5, vol: 0.02, lfoHz: 0.22, lfoProf: 0.008 }));
      capas.push(capaRuido(c, master, { tipo: "lowpass", freq: 150, vol: 0.028 }));
      break;
    case "cap-maestranza": {
      // rumor grave de galpón + golpes de fierro cada tanto
      capas.push(capaRuido(c, master, { tipo: "lowpass", freq: 130, vol: 0.05, lfoHz: 0.06, lfoProf: 0.02 }));
      const clank = () => {
        try {
          const t = c.currentTime;
          const dur = 0.22;
          const src = fuenteRuido(c);
          const bp = c.createBiquadFilter();
          bp.type = "bandpass";
          bp.frequency.value = 700 + Math.random() * 900;
          bp.Q.value = 9;
          const g = c.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
          src.connect(bp).connect(g).connect(master);
          src.start(t);
          src.stop(t + dur);
        } catch {
          /* audio no disponible */
        }
        timers.push(setTimeout(clank, 4000 + Math.random() * 6000));
      };
      timers.push(setTimeout(clank, 2500));
      break;
    }
    case "cap-trastienda": // sótano quieto: murmullo bajo y zumbido de foco
      capas.push(capaRuido(c, master, { tipo: "lowpass", freq: 180, vol: 0.032, lfoHz: 0.12, lfoProf: 0.012 }));
      capas.push(capaTono(c, master, { freq: 100, tipo: "sine", vol: 0.012 }));
      break;
    case "cap-club": // terciopelo: pad cálido desafinado + murmullo lejano
      capas.push(capaTono(c, master, { freq: 82.4, tipo: "triangle", vol: 0.016 }));
      capas.push(capaTono(c, master, { freq: 82.4, tipo: "triangle", vol: 0.014, detune: 9 }));
      capas.push(capaRuido(c, master, { tipo: "bandpass", freq: 520, q: 0.6, vol: 0.01, lfoHz: 0.18, lfoProf: 0.005 }));
      break;
    case "cap-cumbre": // viento de altura y un subgrave incómodo
      capas.push(capaRuido(c, master, { tipo: "highpass", freq: 3200, vol: 0.009, lfoHz: 0.07, lfoProf: 0.006 }));
      capas.push(capaTono(c, master, { freq: 55, tipo: "sine", vol: 0.02 }));
      break;
    default:
      capas.push(capaRuido(c, master, { tipo: "lowpass", freq: 200, vol: 0.03, lfoHz: 0.1, lfoProf: 0.012 }));
  }
  return { capas, timers };
}

let paisaje: { clave: string; master: GainNode; capas: CapaViva[]; timers: ReturnType<typeof setTimeout>[] } | null = null;
let drone: { master: GainNode; capas: CapaViva[] } | null = null;
let latidoTimer: ReturnType<typeof setInterval> | null = null;
let latidoNivel = 0;

function apagarPaisaje(): void {
  if (!paisaje) return;
  const p = paisaje;
  paisaje = null;
  try {
    const c = ac();
    const t = c ? c.currentTime : 0;
    p.master.gain.setTargetAtTime(0.0001, t, 0.25);
    for (const capa of p.capas) capa.parar(t + 1);
    for (const timer of p.timers) clearTimeout(timer);
    setTimeout(() => {
      try {
        p.master.disconnect();
      } catch {
        /* ya desconectado */
      }
    }, 1200);
  } catch {
    /* audio no disponible */
  }
}

function apagarDrone(): void {
  if (!drone) return;
  const d = drone;
  drone = null;
  try {
    const c = ac();
    const t = c ? c.currentTime : 0;
    d.master.gain.setTargetAtTime(0.0001, t, 0.3);
    for (const capa of d.capas) capa.parar(t + 1.2);
  } catch {
    /* audio no disponible */
  }
}

function apagarLatido(): void {
  latidoNivel = 0;
  if (latidoTimer) {
    clearInterval(latidoTimer);
    latidoTimer = null;
  }
}

export const Ambiente = {
  /** Enciende (o cambia) el paisaje del capítulo. Idempotente por clave. */
  iniciar(clave: string): void {
    if (!activado) return;
    if (paisaje?.clave === clave) return;
    apagarPaisaje();
    const c = ac();
    if (!c) return;
    try {
      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, c.currentTime);
      master.gain.setTargetAtTime(1, c.currentTime, 0.8); // fundido de entrada
      master.connect(c.destination);
      const { capas, timers } = armarPaisaje(c, master, clave);
      paisaje = { clave, master, capas, timers };
    } catch {
      /* audio no disponible */
    }
  },

  /** Apaga todo el ambiente (al salir de la historia). */
  detener(): void {
    apagarPaisaje();
    apagarDrone();
    apagarLatido();
  },

  /** Calla SÓLO el paisaje del barrio (p. ej. mientras se juega la mesa),
   *  dejando vivos el drone del jefe y el latido de tensión. */
  detenerPaisaje(): void {
    apagarPaisaje();
  },

  /** Drone de amenaza mientras juegas contra un JEFE. */
  jefe(activo: boolean): void {
    if (!activo || !activado) {
      apagarDrone();
      return;
    }
    if (drone) return;
    const c = ac();
    if (!c) return;
    try {
      const master = c.createGain();
      master.gain.setValueAtTime(0.0001, c.currentTime);
      master.gain.setTargetAtTime(1, c.currentTime, 1.2);
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 260;
      lp.connect(master);
      master.connect(c.destination);
      const capas = [
        capaTono(c, lp, { freq: 55, tipo: "sawtooth", vol: 0.014 }),
        capaTono(c, lp, { freq: 55, tipo: "sawtooth", vol: 0.012, detune: 12 }),
      ];
      drone = { master, capas };
    } catch {
      /* audio no disponible */
    }
  },

  /** Latido de tensión: 0 = nada, 1 = al borde (obligado / 2 dados), 2 = último dado. */
  tension(nivel: 0 | 1 | 2): void {
    if (nivel === latidoNivel) return;
    apagarLatido();
    latidoNivel = nivel;
    if (nivel === 0 || !activado) return;
    const periodo = nivel === 2 ? 850 : 1400;
    const vol = nivel === 2 ? 0.16 : 0.1;
    const latir = () => {
      if (!activado) return;
      const c = ac();
      if (!c) return;
      try {
        const t = c.currentTime;
        tono(c, t, 58, 0.12, "sine", vol);
        tono(c, t + 0.18, 52, 0.16, "sine", vol * 0.7);
      } catch {
        /* audio no disponible */
      }
    };
    latir();
    latidoTimer = setInterval(latir, periodo);
  },
};
