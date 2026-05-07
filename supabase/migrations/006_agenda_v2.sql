-- =============================================================
-- D'look y Estilos — CRM
-- Migration 006: Agenda v2 — asignación por esteticista + Google Calendar por perfil
-- =============================================================

-- Cita ahora sabe a quién está asignada
alter table public.citas_agendadas
  add column if not exists asignada_a uuid references public.profiles(id) on delete set null;

-- Guardar el event_id en el calendario personal del asignado (además del master)
alter table public.citas_agendadas
  add column if not exists google_event_id_personal text;

-- Cada perfil puede tener su propio Google Calendar ID
alter table public.profiles
  add column if not exists google_calendar_id text;

-- =============================================================
-- Tabla para webhooks de Google Calendar (push notifications)
-- =============================================================
create table if not exists public.gcal_channels (
  channel_id  text primary key,
  profile_id  uuid references public.profiles(id) on delete cascade,
  calendar_id text not null,
  resource_id text,
  expires_at  timestamptz not null,
  sync_token  text,
  created_at  timestamptz not null default now()
);

alter table public.gcal_channels enable row level security;

create policy "gcal_channels: solo admin"
  on public.gcal_channels for all
  using (public.is_admin())
  with check (public.is_admin());
