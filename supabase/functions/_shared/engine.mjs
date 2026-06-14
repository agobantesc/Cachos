// GENERADO por scripts/bundle-engine.mjs — no editar a mano.

// src/engine/types.ts
var NOMBRE_PINTA = {
  1: "As",
  2: "Tonto",
  3: "Tren",
  4: "Cuadra",
  5: "Quina",
  6: "Sexta"
};

// src/engine/config.ts
var REGLAS_POR_DEFECTO = {
  dadosIniciales: 5,
  asComodin: true,
  obligadoActivo: true,
  obligadoCerradoParaOtros: true,
  obligadoAsesNoComodin: true,
  sicilianaActiva: true,
  sicilianaDadosPerdidos: 2,
  calzarPermitido: true,
  calzarRecuperaDado: true,
  calzarSoloConMitadDeDados: true
};
function crearReglas(overrides = {}) {
  return { ...REGLAS_POR_DEFECTO, ...overrides };
}

// src/engine/dice.ts
function lanzarDado(rng = Math.random) {
  return Math.floor(rng() * 6) % 6 + 1;
}
function agitarCacho(cantidad, rng = Math.random) {
  const dados = [];
  for (let i = 0; i < cantidad; i++) dados.push(lanzarDado(rng));
  return dados;
}
function contarPinta(dados, pinta, asComodin) {
  let total = 0;
  for (const d of dados) {
    if (d === pinta) total++;
    else if (pinta !== 1 && d === 1 && asComodin) total++;
  }
  return total;
}
function juntarDados(manos) {
  return manos.flat();
}
function pasoValido(dados) {
  if (dados.length !== 5) return false;
  const conteo = /* @__PURE__ */ new Map();
  for (const d of dados) conteo.set(d, (conteo.get(d) ?? 0) + 1);
  const grupos = [...conteo.values()].sort((a, b) => a - b);
  if (grupos.length === 1 && grupos[0] === 5) return true;
  if (grupos.length === 5) return true;
  if (grupos.length === 2 && grupos[0] === 2 && grupos[1] === 3) return true;
  return false;
}

// src/engine/bids.ts
var ES_AS = (p) => p === 1;
function asesMinimosDesdeNormal(cantidadNormal) {
  return Math.ceil(cantidadNormal / 2);
}
function normalMinimoDesdeAses(cantidadAses) {
  return cantidadAses * 2 + 1;
}
function apuestaBienFormada(a) {
  return Number.isInteger(a.cantidad) && a.cantidad >= 1 && Number.isInteger(a.pinta) && a.pinta >= 1 && a.pinta <= 6;
}
function validarApuesta(actual, nueva, asesComodin = true) {
  if (!apuestaBienFormada(nueva)) {
    return { valida: false, motivo: "Apuesta mal formada (cantidad >= 1, pinta 1..6)." };
  }
  if (actual === null) {
    return { valida: true };
  }
  if (!asesComodin) {
    if (nueva.cantidad > actual.cantidad) return { valida: true };
    if (nueva.cantidad === actual.cantidad && nueva.pinta > actual.pinta) return { valida: true };
    return { valida: false, motivo: "Debes subir la cantidad, o mantenerla subiendo la pinta." };
  }
  const actualEsAs = ES_AS(actual.pinta);
  const nuevaEsAs = ES_AS(nueva.pinta);
  if (actualEsAs && nuevaEsAs) {
    return nueva.cantidad > actual.cantidad ? { valida: true } : { valida: false, motivo: "Debes subir la cantidad de ases." };
  }
  if (actualEsAs && !nuevaEsAs) {
    const min = normalMinimoDesdeAses(actual.cantidad);
    return nueva.cantidad >= min ? { valida: true } : { valida: false, motivo: `Para salir de ${actual.cantidad} ases necesitas al menos ${min}.` };
  }
  if (!actualEsAs && nuevaEsAs) {
    const min = asesMinimosDesdeNormal(actual.cantidad);
    return nueva.cantidad >= min ? { valida: true } : { valida: false, motivo: `Para entrar a ases necesitas al menos ${min}.` };
  }
  if (nueva.cantidad > actual.cantidad) return { valida: true };
  if (nueva.cantidad === actual.cantidad && nueva.pinta > actual.pinta) return { valida: true };
  return {
    valida: false,
    motivo: "Debes subir la cantidad, o mantenerla subiendo la pinta."
  };
}

// src/engine/game.ts
var IZQUIERDA = 1;
var DERECHA = -1;
var ErrorDeJuego = class extends Error {
};
function jugadorPorId(estado, id) {
  return estado.jugadores.find((j) => j.id === id);
}
function jugadoresActivos(estado) {
  return estado.jugadores.filter((j) => !j.eliminado);
}
function jugadorDeTurnoId(estado) {
  return estado.ordenAsientos[estado.indiceTurno] ?? null;
}
function totalDadosEnMesa(estado) {
  return jugadoresActivos(estado).reduce((acc, j) => acc + j.dados.length, 0);
}
function asesComodinEnRonda(estado) {
  if (!estado.reglas.asComodin) return false;
  if (estado.esRondaObligado && estado.reglas.obligadoAsesNoComodin) return false;
  return true;
}
function asesComodinParaApuesta(estado) {
  if (!asesComodinEnRonda(estado)) return false;
  const a = estado.apuestaActual;
  const aperturaConAses = a !== null && a.pinta === 1 && estado.apuestasEnRonda === 1 && estado.apuestaActualJugadorId === estado.abridorRondaId;
  return !aperturaConAses;
}
function puedeCalzarse(estado) {
  if (!estado.reglas.calzarPermitido) return false;
  if (estado.reglas.calzarSoloConMitadDeDados && totalDadosEnMesa(estado) < estado.dadosInicialesTotales / 2) {
    return false;
  }
  return true;
}
function vistaDeJugador(estado, observadorId) {
  const vista = {};
  for (const j of estado.jugadores) {
    if (j.id !== observadorId) {
      vista[j.id] = null;
      continue;
    }
    const puedeVerLosSuyos = !estado.esRondaCerrada || j.dados.length === 1;
    vista[j.id] = puedeVerLosSuyos ? [...j.dados] : null;
  }
  return vista;
}
function mod(a, n) {
  return (a % n + n) % n;
}
function indiceDeId(estado, id) {
  return estado.ordenAsientos.indexOf(id);
}
function buscarActivo(estado, desde, sentido, incluirDesde) {
  const n = estado.ordenAsientos.length;
  const inicio = incluirDesde ? 0 : 1;
  for (let p = inicio; p <= inicio + n; p++) {
    const idx = mod(desde + p * sentido, n);
    const j = jugadorPorId(estado, estado.ordenAsientos[idx]);
    if (j && !j.eliminado) return idx;
  }
  return desde;
}
function siguienteActivo(estado, desde) {
  return buscarActivo(estado, desde, estado.sentido, false);
}
function crearJuego(jugadores, reglas = REGLAS_POR_DEFECTO) {
  if (jugadores.length < 2) {
    throw new ErrorDeJuego("Se necesitan al menos 2 jugadores.");
  }
  const ids = new Set(jugadores.map((j) => j.id));
  if (ids.size !== jugadores.length) {
    throw new ErrorDeJuego("Hay ids de jugador repetidos.");
  }
  const jugadoresEstado = jugadores.map((j) => ({
    id: j.id,
    nombre: j.nombre,
    // Se rellenan en iniciarRonda; acá sólo fijamos la cantidad de dados.
    dados: new Array(reglas.dadosIniciales).fill(1),
    eliminado: false,
    eliminadoEnRonda: null,
    yaJugoObligado: false,
    stats: { dadosPerdidos: 0, calzosAcertados: 0 }
  }));
  return {
    reglas,
    jugadores: jugadoresEstado,
    ordenAsientos: jugadores.map((j) => j.id),
    sentido: IZQUIERDA,
    dadosInicialesTotales: jugadores.length * reglas.dadosIniciales,
    indiceTurno: 0,
    abridorRondaId: null,
    apuestaActual: null,
    apuestaActualJugadorId: null,
    apuestasEnRonda: 0,
    pasoPendienteJugadorId: null,
    historialRonda: [],
    esRondaObligado: false,
    esRondaCerrada: false,
    fase: "LOBBY",
    numeroRonda: 0,
    ganadorId: null,
    ordenEliminacion: [],
    ultimaResolucion: null
  };
}
function iniciarRonda(estado, opciones = {}) {
  if (estado.fase === "FIN_JUEGO") {
    throw new ErrorDeJuego("El juego ya termin\xF3.");
  }
  const rng = opciones.rng ?? Math.random;
  const e = structuredClone(estado);
  if (opciones.sentido !== void 0) e.sentido = opciones.sentido;
  let idxAbridor;
  if (e.abridorRondaId === null) {
    const activos = jugadoresActivos(e);
    const elegido = activos[Math.floor(rng() * activos.length)] ?? activos[0];
    idxAbridor = indiceDeId(e, elegido.id);
  } else if (!jugadorPorId(e, e.abridorRondaId)?.eliminado) {
    idxAbridor = indiceDeId(e, e.abridorRondaId);
  } else {
    idxAbridor = buscarActivo(e, indiceDeId(e, e.abridorRondaId), DERECHA, false);
  }
  e.indiceTurno = idxAbridor;
  const abridor = jugadorPorId(e, e.ordenAsientos[idxAbridor]);
  e.abridorRondaId = abridor.id;
  for (const j of e.jugadores) {
    if (!j.eliminado) j.dados = agitarCacho(j.dados.length, rng);
  }
  const gatillaObligado = e.reglas.obligadoActivo && jugadoresActivos(e).length > 2 && abridor.dados.length === 1 && !abridor.yaJugoObligado;
  e.esRondaObligado = gatillaObligado;
  e.esRondaCerrada = gatillaObligado && e.reglas.obligadoCerradoParaOtros;
  if (gatillaObligado) abridor.yaJugoObligado = true;
  e.apuestaActual = null;
  e.apuestaActualJugadorId = null;
  e.apuestasEnRonda = 0;
  e.pasoPendienteJugadorId = null;
  e.historialRonda = [];
  e.ultimaResolucion = null;
  e.fase = "EN_RONDA";
  e.numeroRonda += 1;
  return e;
}
function aplicarAccion(estado, accion) {
  if (estado.fase !== "EN_RONDA") {
    throw new ErrorDeJuego(`No se pueden aplicar acciones en la fase ${estado.fase}.`);
  }
  if (accion.jugadorId !== jugadorDeTurnoId(estado)) {
    throw new ErrorDeJuego("No es el turno de ese jugador.");
  }
  if (estado.pasoPendienteJugadorId !== null && accion.tipo !== "APOSTAR" && accion.tipo !== "DUDAR_PASO") {
    throw new ErrorDeJuego("Hay un paso pendiente: solo puedes dudar el paso o subir la apuesta.");
  }
  switch (accion.tipo) {
    case "APOSTAR":
      return aplicarApostar(estado, accion.jugadorId, accion.apuesta);
    case "DUDAR":
      return aplicarDesafio(estado, accion.jugadorId, "DUDO");
    case "CALZAR":
      return aplicarDesafio(estado, accion.jugadorId, "CALZO");
    case "PASAR":
      return aplicarPasar(estado, accion.jugadorId);
    case "DUDAR_PASO":
      return aplicarDudarPaso(estado, accion.jugadorId);
  }
}
function aplicarApostar(estado, jugadorId, apuesta) {
  const val = validarApuesta(estado.apuestaActual, apuesta, asesComodinParaApuesta(estado));
  if (!val.valida) {
    throw new ErrorDeJuego(val.motivo ?? "Apuesta inv\xE1lida.");
  }
  if (estado.esRondaObligado && estado.apuestaActual !== null) {
    const jugador = jugadorPorId(estado, jugadorId);
    if (jugador.dados.length > 1 && apuesta.pinta !== estado.apuestaActual.pinta) {
      throw new ErrorDeJuego(
        "Obligado: con m\xE1s de 1 dado no puedes cambiar la pinta, s\xF3lo subir la cantidad."
      );
    }
  }
  const e = structuredClone(estado);
  e.pasoPendienteJugadorId = null;
  e.apuestaActual = { ...apuesta };
  e.apuestaActualJugadorId = jugadorId;
  e.apuestasEnRonda += 1;
  e.historialRonda.push({ tipo: "APUESTA", jugadorId, apuesta: { ...apuesta } });
  e.indiceTurno = siguienteActivo(e, e.indiceTurno);
  return e;
}
function aplicarPasar(estado, jugadorId) {
  if (estado.esRondaObligado) {
    throw new ErrorDeJuego("No se puede pasar en una ronda de obligado.");
  }
  const jugador = jugadorPorId(estado, jugadorId);
  if (jugador.dados.length !== estado.reglas.dadosIniciales) {
    throw new ErrorDeJuego("Solo se puede pasar con los 5 dados.");
  }
  if (estado.historialRonda.some((ev) => ev.tipo === "PASO" && ev.jugadorId === jugadorId)) {
    throw new ErrorDeJuego("Ya pasaste en esta ronda; solo se puede pasar una vez.");
  }
  const e = structuredClone(estado);
  e.pasoPendienteJugadorId = jugadorId;
  e.historialRonda.push({ tipo: "PASO", jugadorId });
  e.indiceTurno = siguienteActivo(e, e.indiceTurno);
  return e;
}
function aplicarDudarPaso(estado, dudadorId) {
  const pasadorIdPendiente = estado.pasoPendienteJugadorId;
  if (pasadorIdPendiente === null) {
    throw new ErrorDeJuego("No hay ning\xFAn paso que dudar.");
  }
  const e = structuredClone(estado);
  const pasador = jugadorPorId(e, pasadorIdPendiente);
  const valido = pasoValido(pasador.dados);
  const perdedorId = valido ? dudadorId : pasador.id;
  const resolucion = {
    tipo: "PASO",
    pinta: 1,
    cantidadDeclarada: 0,
    cantidadReal: 0,
    asesComoComodin: false,
    perdedorId,
    dadosPerdidos: 1,
    ganadorDadoId: null,
    siciliana: false,
    dadosRevelados: { [pasador.id]: [...pasador.dados] },
    pasadorId: pasador.id,
    pasoEraValido: valido
  };
  e.pasoPendienteJugadorId = null;
  aplicarConsecuencias(e, resolucion);
  e.ultimaResolucion = resolucion;
  const activos = jugadoresActivos(e);
  if (activos.length <= 1) {
    e.fase = "FIN_JUEGO";
    e.ganadorId = activos[0]?.id ?? null;
    return e;
  }
  e.fase = "FIN_RONDA";
  return e;
}
function aplicarDesafio(estado, jugadorId, tipo) {
  if (estado.apuestaActual === null || estado.apuestaActualJugadorId === null) {
    throw new ErrorDeJuego("No hay apuesta que desafiar; el abridor debe apostar primero.");
  }
  const jugador = jugadorPorId(estado, jugadorId);
  if (tipo === "CALZO") {
    if (!puedeCalzarse(estado)) {
      throw new ErrorDeJuego("El calzo no est\xE1 disponible (regla de la mitad de los dados).");
    }
    if (estado.esRondaObligado && jugador.dados.length > 1) {
      throw new ErrorDeJuego("Obligado: con m\xE1s de 1 dado no puedes calzar.");
    }
  }
  const e = structuredClone(estado);
  const apuesta = e.apuestaActual;
  const siciliana = tipo === "DUDO" && e.reglas.sicilianaActiva && !e.esRondaObligado && jugadoresActivos(e).length > 2 && e.apuestasEnRonda === 1 && e.apuestaActualJugadorId === e.abridorRondaId;
  const asesComodin = asesComodinEnRonda(e) && !siciliana;
  const todos = juntarDados(jugadoresActivos(e).map((j) => j.dados));
  const real = contarPinta(todos, apuesta.pinta, asesComodin);
  const dadosRevelados = {};
  for (const j of jugadoresActivos(e)) dadosRevelados[j.id] = [...j.dados];
  const resolucion = tipo === "DUDO" ? resolverDudo(e, jugadorId, apuesta, real, asesComodin, siciliana, dadosRevelados) : resolverCalzo(e, jugadorId, apuesta, real, asesComodin, dadosRevelados);
  aplicarConsecuencias(e, resolucion);
  if (tipo === "CALZO" && resolucion.perdedorId === null) {
    jugadorPorId(e, jugadorId).stats.calzosAcertados += 1;
  }
  e.ultimaResolucion = resolucion;
  const activos = jugadoresActivos(e);
  if (activos.length <= 1) {
    e.fase = "FIN_JUEGO";
    e.ganadorId = activos[0]?.id ?? null;
    return e;
  }
  e.fase = "FIN_RONDA";
  return e;
}
function resolverDudo(estado, dudadorId, apuesta, real, asesComodin, siciliana, dadosRevelados) {
  const apuestaSeCumple = real >= apuesta.cantidad;
  const perdedorId = apuestaSeCumple ? dudadorId : estado.apuestaActualJugadorId;
  const dadosPerdidos = siciliana ? estado.reglas.sicilianaDadosPerdidos : 1;
  return {
    tipo: "DUDO",
    pinta: apuesta.pinta,
    cantidadDeclarada: apuesta.cantidad,
    cantidadReal: real,
    asesComoComodin: asesComodin,
    perdedorId,
    dadosPerdidos,
    ganadorDadoId: null,
    siciliana,
    dadosRevelados
  };
}
function resolverCalzo(estado, calzadorId, apuesta, real, asesComodin, dadosRevelados) {
  const exacto = real === apuesta.cantidad;
  const calzador = jugadorPorId(estado, calzadorId);
  const puedeRecuperar = estado.reglas.calzarRecuperaDado && calzador.dados.length < estado.reglas.dadosIniciales;
  const base = {
    tipo: "CALZO",
    pinta: apuesta.pinta,
    cantidadDeclarada: apuesta.cantidad,
    cantidadReal: real,
    asesComoComodin: asesComodin,
    siciliana: false,
    dadosRevelados
  };
  if (exacto) {
    return {
      ...base,
      perdedorId: null,
      dadosPerdidos: 0,
      ganadorDadoId: puedeRecuperar ? calzadorId : null
    };
  }
  return { ...base, perdedorId: calzadorId, dadosPerdidos: 1, ganadorDadoId: null };
}
function aplicarConsecuencias(estado, r) {
  let proximoAbridor = null;
  if (r.ganadorDadoId) {
    const ganador = jugadorPorId(estado, r.ganadorDadoId);
    if (ganador.dados.length < estado.reglas.dadosIniciales) ganador.dados.push(1);
    proximoAbridor = r.ganadorDadoId;
  }
  if (r.perdedorId) {
    const perdedor = jugadorPorId(estado, r.perdedorId);
    let perdidos = 0;
    for (let i = 0; i < r.dadosPerdidos && perdedor.dados.length > 0; i++) {
      perdedor.dados.pop();
      perdidos++;
    }
    perdedor.stats.dadosPerdidos += perdidos;
    if (perdedor.dados.length === 0 && !perdedor.eliminado) {
      perdedor.eliminado = true;
      perdedor.eliminadoEnRonda = estado.numeroRonda;
      estado.ordenEliminacion.push(perdedor.id);
    }
    proximoAbridor = r.perdedorId;
  }
  estado.abridorRondaId = proximoAbridor;
}

// src/engine/views.ts
function proyeccionPublica(estado) {
  return {
    jugadores: estado.jugadores.map((j) => ({
      id: j.id,
      nombre: j.nombre,
      cantidadDados: j.dados.length,
      eliminado: j.eliminado,
      eliminadoEnRonda: j.eliminadoEnRonda,
      yaJugoObligado: j.yaJugoObligado,
      stats: { ...j.stats }
    })),
    ordenAsientos: [...estado.ordenAsientos],
    sentido: estado.sentido,
    dadosInicialesTotales: estado.dadosInicialesTotales,
    indiceTurno: estado.indiceTurno,
    turnoJugadorId: jugadorDeTurnoId(estado),
    abridorRondaId: estado.abridorRondaId,
    apuestaActual: estado.apuestaActual ? { ...estado.apuestaActual } : null,
    apuestaActualJugadorId: estado.apuestaActualJugadorId,
    apuestasEnRonda: estado.apuestasEnRonda,
    esRondaObligado: estado.esRondaObligado,
    esRondaCerrada: estado.esRondaCerrada,
    asesComodin: asesComodinEnRonda(estado),
    asesComodinApuesta: asesComodinParaApuesta(estado),
    fase: estado.fase,
    numeroRonda: estado.numeroRonda,
    ganadorId: estado.ganadorId,
    ordenEliminacion: [...estado.ordenEliminacion],
    totalDadosEnMesa: totalDadosEnMesa(estado),
    dadosIniciales: estado.reglas.dadosIniciales,
    pasoPendienteJugadorId: estado.pasoPendienteJugadorId,
    historialRonda: structuredClone(estado.historialRonda),
    calzoDisponible: estado.fase === "EN_RONDA" && estado.apuestaActual !== null && puedeCalzarse(estado),
    // El reveal es público por naturaleza: en un dudo/calzo todos ven todo.
    ultimaResolucion: estado.ultimaResolucion ? structuredClone(estado.ultimaResolucion) : null
  };
}
function vistaJugador(estado, jugadorId) {
  return {
    publico: proyeccionPublica(estado),
    miMano: vistaDeJugador(estado, jugadorId)[jugadorId] ?? null,
    miId: jugadorId
  };
}
export {
  DERECHA,
  ErrorDeJuego,
  IZQUIERDA,
  NOMBRE_PINTA,
  REGLAS_POR_DEFECTO,
  agitarCacho,
  aplicarAccion,
  apuestaBienFormada,
  asesComodinEnRonda,
  asesComodinParaApuesta,
  asesMinimosDesdeNormal,
  contarPinta,
  crearJuego,
  crearReglas,
  iniciarRonda,
  jugadorDeTurnoId,
  jugadorPorId,
  jugadoresActivos,
  juntarDados,
  lanzarDado,
  normalMinimoDesdeAses,
  pasoValido,
  proyeccionPublica,
  puedeCalzarse,
  totalDadosEnMesa,
  validarApuesta,
  vistaDeJugador,
  vistaJugador
};
