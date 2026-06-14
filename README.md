# Cachos 🎲

Cacho / Dudo chileno para jugar **remoto entre amigos desde el iPhone**, con las
variantes de la casa (obligado cerrado, ases no comodín en obligado, "la siciliana").

## Estado: Fase 1 — Motor de reglas ✅

El plan es por fases. Esta primera entrega es el **motor del juego** en TypeScript
puro: toda la lógica del Cacho, sin red ni interfaz todavía, con tests.

```
src/engine/
  types.ts    Tipos del dominio (Pinta, Apuesta, Jugador, EstadoJuego, ReglasCasa…)
  config.ts   Reglas de la casa por defecto (editables)
  dice.ts     Agitar el cacho y contar pintas (con/sin comodín)
  bids.ts     Validación de apuestas y conversión de ases (el corazón)
  game.ts     Máquina de estados: crear juego, iniciar ronda, aplicar acciones, resolver
  __tests__/  29 tests que cubren conteo, apuestas, sentido, calzo y las 3 variantes
docs/
  RULES.md    Las reglas exactas que implementa el motor (fuente de verdad)
```

### Probar

```bash
npm install
npm test        # corre los 29 tests
npm run typecheck
```

### Ejemplo de uso del motor

```ts
import { crearJuego, iniciarRonda, aplicarAccion, jugadorDeTurnoId } from "./src/engine/index.js";

let estado = crearJuego([
  { id: "ana", nombre: "Ana" },
  { id: "beto", nombre: "Beto" },
]);
estado = iniciarRonda(estado);

estado = aplicarAccion(estado, {
  tipo: "APOSTAR", jugadorId: jugadorDeTurnoId(estado)!, apuesta: { cantidad: 2, pinta: 5 },
});
estado = aplicarAccion(estado, { tipo: "DUDAR", jugadorId: jugadorDeTurnoId(estado)! });

console.log(estado.ultimaResolucion); // quién perdió, cuánto, dados revelados…
```

## Arquitectura objetivo

Juego de **información oculta** → necesita un **servidor autoritativo** que guarde
todos los dados y a cada iPhone le muestre sólo lo que puede ver:

- `proyeccionPublica(estado)` → la mesa (vasos, turno, apuesta, revelaciones).
- `vistaJugador(estado, id)` → la mesa pública + la mano propia (o null si juega a ciegas).

```
iPhone (Safari/PWA)  ──►  Edge Function (este motor)  ──►  Postgres + Realtime (Supabase)
```

Se reparte por **link** (PWA), sin App Store: cada amigo abre la URL y "Agrega a
pantalla de inicio".

## Roadmap

- [x] **Fase 1 — Motor de reglas** (`src/engine`, 33 tests)
- [~] **Fase 2 — Salas + tiempo real** (Supabase): esquema + RLS + Edge Function
  autoritativa listos para desplegar → ver [`supabase/README.md`](supabase/README.md)
- [ ] **Fase 3 — UI iPhone** (PWA React: dados, agitar el cacho, táctil)
- [ ] **Fase 4 — Pulido** (reconexión, sonidos, chat)

Reglas completas implementadas: ver [`docs/RULES.md`](docs/RULES.md).
