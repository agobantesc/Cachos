-- Esquema del Cacho remoto.
--
-- Idea central (información oculta): el estado COMPLETO (con todas las caras) vive
-- en `secretos`, una tabla que NINGÚN cliente puede leer (sólo la Edge Function con
-- el service role). A los clientes sólo les llega:
--   - `salas.estado_publico`  -> la mesa (vasos, turno, apuesta, revelaciones)
--   - su fila en `manos`        -> sus propias caras (o null si juega a ciegas)
-- Las políticas RLS de abajo hacen imposible leer la mano de otro.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.salas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  anfitrion_id uuid not null,                  -- auth.uid() del creador
  estado_publico jsonb,                        -- EstadoPublico (sin dados secretos)
  fase text not null default 'LOBBY',
  creada_en timestamptz not null default now()
);

create table public.jugadores_sala (
  sala_id uuid not null references public.salas(id) on delete cascade,
  jugador_id uuid not null,                    -- auth.uid()
  nombre text not null,
  asiento int not null,
  unida_en timestamptz not null default now(),
  primary key (sala_id, jugador_id)
);

create table public.manos (
  sala_id uuid not null references public.salas(id) on delete cascade,
  jugador_id uuid not null,                    -- auth.uid()
  mano jsonb,                                  -- Pinta[] o null (a ciegas)
  primary key (sala_id, jugador_id)
);

create table public.secretos (
  sala_id uuid primary key references public.salas(id) on delete cascade,
  estado_completo jsonb not null               -- EstadoJuego completo (todas las caras)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.salas enable row level security;
alter table public.jugadores_sala enable row level security;
alter table public.manos enable row level security;
alter table public.secretos enable row level security;

-- Membresía sin recursión de RLS: una política que consulta su propia tabla
-- provoca "infinite recursion detected in policy". Lo evitamos con una función
-- SECURITY DEFINER (corre como dueña de la tabla y salta RLS), el patrón que
-- recomienda Supabase para chequeos de pertenencia.
create or replace function public.es_miembro(_sala uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.jugadores_sala
    where sala_id = _sala and jugador_id = auth.uid()
  );
$$;

-- salas: sólo los miembros pueden leer su sala. (Unirse por código va por la
-- Edge Function, así no se filtran las salas ajenas.)
create policy "salas_select_miembros" on public.salas
  for select to authenticated using (public.es_miembro(salas.id));

-- jugadores_sala: leer la lista de jugadores de una sala donde soy miembro.
create policy "jugadores_select_miembros" on public.jugadores_sala
  for select to authenticated using (public.es_miembro(jugadores_sala.sala_id));

-- manos: cada quien lee SOLO la suya.
create policy "manos_select_propia" on public.manos
  for select to authenticated using (jugador_id = auth.uid());

-- secretos: sin políticas -> ningún cliente puede leer. El service role (Edge
-- Function) salta RLS y es el único que accede al estado completo.

-- Todas las ESCRITURAS las hace la Edge Function con el service role (que ignora
-- RLS). No definimos políticas de insert/update/delete para clientes.

-- ---------------------------------------------------------------------------
-- Realtime: qué tablas se transmiten a los clientes suscritos.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.salas;
alter publication supabase_realtime add table public.jugadores_sala;
alter publication supabase_realtime add table public.manos;
