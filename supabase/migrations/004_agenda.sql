-- =============================================================
-- D'look y Estilos — CRM
-- Migration 004: Agenda (Fase 3)
-- =============================================================

create table public.citas_agendadas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  fecha_hora timestamptz not null,
  duracion_minutos int not null default 60 check (duracion_minutos > 0),
  estado text not null default 'agendada' check (estado in ('agendada', 'realizada', 'cancelada')),
  notas text,
  creado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index citas_fecha_idx    on public.citas_agendadas (fecha_hora);
create index citas_cliente_idx  on public.citas_agendadas (cliente_id);
create index citas_servicio_idx on public.citas_agendadas (servicio_id);

alter table public.citas_agendadas enable row level security;

create policy "citas: autorizado lee"       on public.citas_agendadas for select using (public.is_authorized());
create policy "citas: autorizado inserta"   on public.citas_agendadas for insert with check (public.is_authorized());
create policy "citas: autorizado actualiza" on public.citas_agendadas for update using (public.is_authorized());
create policy "citas: autorizado borra"     on public.citas_agendadas for delete using (public.is_authorized());
