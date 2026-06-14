# Backend del Cacho (Supabase) — Fase 2

Servidor autoritativo serverless: una Edge Function corre el motor y guarda el
estado; Postgres + Realtime + RLS reparten a cada iPhone sólo lo que puede ver.

```
iPhone ──POST /functions/v1/jugar──►  Edge Function (motor autoritativo)
   ▲                                        │ escribe
   │ Realtime (RLS)                         ▼
   └────────  salas.estado_publico  +  manos.<yo>  ◄──  secretos (privado)
```

## Qué ve cada quién

- **`secretos.estado_completo`** — el `EstadoJuego` completo con TODAS las caras.
  Ningún cliente puede leerlo (sin políticas RLS); sólo la Edge Function (service role).
- **`salas.estado_publico`** — la mesa: jugadores, vasos (cantidad de dados), turno,
  apuesta vigente y, en un dudo/calzo, la **revelación de todos los dados**
  (`ultimaResolucion.dadosRevelados`). Lo leen todos los miembros vía Realtime.
- **`manos.<jugador>`** — las caras propias (o `null` si juega a ciegas en ronda
  cerrada). RLS: cada quien lee sólo la suya.

## Desplegar

Requisitos: [Supabase CLI](https://supabase.com/docs/guides/cli) y un proyecto creado.

```bash
# 1. Enlazar el proyecto
supabase link --project-ref <TU_PROJECT_REF>

# 2. Aplicar el esquema (tablas + RLS + realtime)
supabase db push        # aplica supabase/migrations/0001_init.sql

# 3. Empaquetar el motor para la función (genera _shared/engine.mjs)
npm run build:engine

# 4. Desplegar la Edge Function
supabase functions deploy jugar
```

Luego, en el **Dashboard → Authentication → Providers**, habilita **Anonymous
sign-ins** (cada dispositivo entra sin registrarse; su `auth.uid()` es su jugadorId).

Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya
las inyecta Supabase en las Edge Functions; no hay que configurarlas a mano.

## Contrato para el cliente (lo usará la PWA en la Fase 3)

Autenticación anónima una vez:
```ts
await supabase.auth.signInAnonymously();
```

Llamadas a la función (POST a `functions/v1/jugar`, vía `supabase.functions.invoke("jugar", { body })`):
```ts
{ tipo: "crearSala", nombre }                    -> { salaId, codigo }
{ tipo: "unirse", codigo, nombre }               -> { salaId }
{ tipo: "iniciar", salaId, sentido? }            -> { ok }   // sólo anfitrión
{ tipo: "accion", salaId, jugada }               -> { ok }
{ tipo: "siguienteRonda", salaId, sentido? }     -> { ok }
```
`jugada` es la acción del motor SIN el id (el servidor lo toma de la sesión):
```ts
{ tipo: "APOSTAR", apuesta: { cantidad, pinta } }
{ tipo: "DUDAR" }
{ tipo: "CALZAR" }
```

Suscripciones Realtime:
```ts
// La mesa (turno, vasos, apuesta, revelaciones)
supabase.channel("sala").on("postgres_changes",
  { event: "*", schema: "public", table: "salas", filter: `id=eq.${salaId}` }, onMesa);
// La lista de jugadores (lobby)
supabase.channel("jugadores").on("postgres_changes",
  { event: "*", schema: "public", table: "jugadores_sala", filter: `sala_id=eq.${salaId}` }, onLobby);
// Mi mano (RLS sólo entrega la fila propia)
supabase.channel("mano").on("postgres_changes",
  { event: "*", schema: "public", table: "manos", filter: `sala_id=eq.${salaId}` }, onMano);
```

> Nota: el esquema y la función son código listo para desplegar, pero no se pueden
> ejecutar en este entorno (requieren un proyecto Supabase). El motor que importan
> sí está probado (33 tests).
