// CONSEJOS DEL TAHÚR: el tutorial contextual. En vez de un manual de golpe,
// cada concepto se explica UNA sola vez, justo cuando aparece en la mesa
// (tu primera apuesta, tu primer dudo, el primer obligado…). Lo visto queda
// guardado: a los veteranos no se les molesta nunca más.
const CLAVE = "cachos.consejos";

export type ConsejoId = "apostar" | "dudar" | "calzar" | "ases" | "paso" | "obligado" | "siciliana";

export const CONSEJOS: Record<ConsejoId, { titulo: string; texto: string }> = {
  apostar: {
    titulo: "Tu primera apuesta",
    texto:
      "Apostar es declarar cuántos dados de una pinta hay en TODA la mesa: los tuyos más los que no ves. Si tienes dos quinas y hay 20 dados en juego, decir '4 quinas' es bastante razonable… decir '9' es un farol.",
  },
  dudar: {
    titulo: "Dudar",
    texto:
      "¿Crees que exageró? DUDA: se destapan todos los vasos y se cuenta. Si no había tantos como dijo, el mentiroso pierde un dado; si sí había… lo pierdes tú. Ojo: dudar de inmediato al que abre castiga doble (la siciliana).",
  },
  calzar: {
    titulo: "Calzar",
    texto:
      "Calzar es la jugada fina: declarar que la cantidad es EXACTA. Si aciertas, recuperas un dado perdido. Si fallas, pierdes uno. Sólo se puede mientras quede la mitad de los dados en mesa.",
  },
  ases: {
    titulo: "Los ases son comodín",
    texto:
      "El AS (la cara 1) cuenta como cualquier pinta al momento de contar. Por eso '4 trenes' puede cumplirse con dos trenes y dos ases. Se anula en el obligado y en la siciliana.",
  },
  paso: {
    titulo: "El paso",
    texto:
      "Con tus 5 dados puedes PASAR en vez de apostar: es un órdago. Si nadie te duda el paso, la ronda sigue; si te lo dudan y tu mano no formaba juego (5 iguales, escalera o full), pierdes un dado. Y si sí formaba… pierde el que dudó.",
  },
  obligado: {
    titulo: "Ronda de OBLIGADO",
    texto:
      "Alguien quedó con su último dado: ronda especial. Se juega a ciegas (no ves ni tu propia mano, salvo que también estés con 1 dado), los ases NO son comodín, y con 2+ dados sólo puedes subir la cantidad.",
  },
  siciliana: {
    titulo: "¡La siciliana!",
    texto:
      "Dudaste (o te dudaron) la PRIMERA apuesta de la ronda: en ese conteo los ases no valen como comodín y el perdedor paga dados extra. Por eso abrir con un farol grande es jugar con fuego.",
  },
};

function vistos(): Set<string> {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : [];
    return new Set(Array.isArray(lista) ? (lista as string[]) : []);
  } catch {
    return new Set();
  }
}

/** ¿Este consejo aún no se ha mostrado? */
export function consejoPendiente(id: ConsejoId): boolean {
  return !vistos().has(id);
}

/** Marca un consejo como visto (no se vuelve a mostrar nunca). */
export function marcarConsejo(id: ConsejoId): void {
  try {
    const v = vistos();
    v.add(id);
    localStorage.setItem(CLAVE, JSON.stringify([...v]));
  } catch {
    /* sin persistencia: se mostrará de nuevo, no es grave */
  }
}
