# Cachos 🎲

Cacho / Dudo chileno para jugar **remoto entre amigos desde el iPhone**, con las
variantes de la casa (obligado cerrado, ases no comodín en obligado, "la siciliana").

## Estructura

```
src/engine/   Motor del juego (TypeScript puro): reglas, máquina de estados, vistas
src/web/      PWA en React: la interfaz para jugar
supabase/     Backend serverless: esquema + RLS + Edge Function autoritativa
docs/RULES.md Las reglas exactas que implementa el motor (fuente de verdad)
```

### Correr

```bash
npm install
npm run dev          # levanta la PWA en local (modo "pasar el teléfono" sin backend)
npm test             # 36 tests (motor + render del UI)
npm run typecheck
npm run preview:html # genera preview/index.html (preview estática del look)
```

Para jugar en línea de verdad hay que desplegar Supabase y definir
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (ver [`supabase/README.md`](supabase/README.md)).

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

- [x] **Fase 1 — Motor de reglas** (`src/engine`, con tests)
- [~] **Fase 2 — Salas + tiempo real** (Supabase): esquema + RLS + Edge Function
  autoritativa listos para desplegar → ver [`supabase/README.md`](supabase/README.md)
- [x] **Fase 3 — UI iPhone** (`src/web`): PWA React con mesa, vasos, dados,
  apuestas, revelación y modo local "pasar el teléfono"
- [ ] **Fase 4 — Pulido** (animación de agitar el cacho, sonidos, reconexión, chat)

Reglas completas implementadas: ver [`docs/RULES.md`](docs/RULES.md).
