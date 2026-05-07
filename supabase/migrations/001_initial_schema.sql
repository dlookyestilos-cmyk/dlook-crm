-- =============================================================
-- D'look y Estilos — CRM
-- Migration 001: Schema inicial (Fase 1)
-- =============================================================
-- Tablas: profiles, servicios, clientes, cliente_servicio,
--          consentimientos, fotos_proceso, sesiones
-- =============================================================

-- ----------------------------------------------------------
-- 1. profiles (whitelist de personal autorizado)
-- ----------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre text not null,
  rol text not null default 'esteticista' check (rol in ('admin', 'esteticista')),
  activo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------
-- 2. servicios (catálogo)
-- ----------------------------------------------------------
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null check (categoria in ('corporal', 'facial', 'masajes')),
  descripcion text,
  icono text not null default 'sparkles',
  color_acento text not null default 'turquesa' check (color_acento in ('turquesa', 'gold', 'rosa', 'deep')),
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------
-- 3. clientes
-- ----------------------------------------------------------
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  documento text,
  telefono text,
  email text,
  direccion text,
  fecha_nacimiento date,
  gustos_preferencias text,
  notas_generales text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clientes_nombre_idx on public.clientes using gin (to_tsvector('spanish', nombre_completo));
create index clientes_documento_idx on public.clientes (documento);

-- ----------------------------------------------------------
-- 4. cliente_servicio (relación n:n, plan de tratamiento)
-- ----------------------------------------------------------
create table public.cliente_servicio (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  areas_tratadas text[] not null default '{}',
  sesiones_totales int not null default 1 check (sesiones_totales > 0),
  sesiones_completadas int not null default 0 check (sesiones_completadas >= 0),
  estado text not null default 'activo' check (estado in ('activo', 'pausado', 'completado')),
  notas_tratamiento text,
  fecha_inicio date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cliente_servicio_cliente_idx on public.cliente_servicio (cliente_id);
create index cliente_servicio_servicio_idx on public.cliente_servicio (servicio_id);

-- ----------------------------------------------------------
-- 5. consentimientos (PDFs firmados, en Storage)
-- ----------------------------------------------------------
create table public.consentimientos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  storage_path text not null,
  nombre_archivo text not null,
  fecha_firma date not null default current_date,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index consentimientos_cliente_idx on public.consentimientos (cliente_id);

-- ----------------------------------------------------------
-- 6. fotos_proceso (galería del avance del cliente)
-- ----------------------------------------------------------
create table public.fotos_proceso (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  cliente_servicio_id uuid references public.cliente_servicio(id) on delete set null,
  storage_path text not null,
  fecha date not null default current_date,
  numero_sesion int,
  notas text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index fotos_proceso_cliente_idx on public.fotos_proceso (cliente_id);

-- ----------------------------------------------------------
-- 7. sesiones (cada visita real del cliente)
-- ----------------------------------------------------------
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  cliente_servicio_id uuid not null references public.cliente_servicio(id) on delete cascade,
  fecha date not null default current_date,
  realizada_por uuid references public.profiles(id) on delete set null,
  notas text,
  -- Campos de facturación (Fase 2). Esteticistas no los verán.
  estado_pago text not null default 'pendiente' check (estado_pago in ('pagado', 'pendiente')),
  monto numeric(10, 2),
  created_at timestamptz not null default now()
);

create index sesiones_cs_idx on public.sesiones (cliente_servicio_id);
create index sesiones_fecha_idx on public.sesiones (fecha);

-- =============================================================
-- TRIGGER: updated_at automático
-- =============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_clientes
  before update on public.clientes
  for each row execute function public.set_updated_at();

create trigger set_updated_at_cliente_servicio
  before update on public.cliente_servicio
  for each row execute function public.set_updated_at();

-- =============================================================
-- HELPERS de autorización
-- =============================================================
create or replace function public.is_authorized()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and activo = true
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and activo = true and rol = 'admin'
  );
$$;

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================
alter table public.profiles          enable row level security;
alter table public.servicios         enable row level security;
alter table public.clientes          enable row level security;
alter table public.cliente_servicio  enable row level security;
alter table public.consentimientos   enable row level security;
alter table public.fotos_proceso     enable row level security;
alter table public.sesiones          enable row level security;

-- profiles: cualquiera autenticado puede leer su propio row (para verificar autorización).
-- Solo admin puede ver/modificar a otros.
create policy "profiles: leer propio row"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: admin lee todos"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: admin inserta"
  on public.profiles for insert
  with check (public.is_admin());

create policy "profiles: admin actualiza"
  on public.profiles for update
  using (public.is_admin());

create policy "profiles: admin borra"
  on public.profiles for delete
  using (public.is_admin());

-- servicios, clientes, cliente_servicio, consentimientos, fotos, sesiones:
-- cualquier usuario autorizado (admin o esteticista) puede leer/escribir.
-- En Fase 2 restringimos `monto` a admin con vista o columna-level RLS.
create policy "servicios: autorizado lee"        on public.servicios        for select using (public.is_authorized());
create policy "servicios: admin escribe"         on public.servicios        for all    using (public.is_admin())     with check (public.is_admin());

create policy "clientes: autorizado lee"         on public.clientes         for select using (public.is_authorized());
create policy "clientes: autorizado inserta"     on public.clientes         for insert with check (public.is_authorized());
create policy "clientes: autorizado actualiza"   on public.clientes         for update using (public.is_authorized());
create policy "clientes: admin borra"            on public.clientes         for delete using (public.is_admin());

create policy "cs: autorizado lee"               on public.cliente_servicio for select using (public.is_authorized());
create policy "cs: autorizado inserta"           on public.cliente_servicio for insert with check (public.is_authorized());
create policy "cs: autorizado actualiza"         on public.cliente_servicio for update using (public.is_authorized());
create policy "cs: admin borra"                  on public.cliente_servicio for delete using (public.is_admin());

create policy "consent: autorizado lee"          on public.consentimientos  for select using (public.is_authorized());
create policy "consent: autorizado inserta"      on public.consentimientos  for insert with check (public.is_authorized());
create policy "consent: admin borra"             on public.consentimientos  for delete using (public.is_admin());

create policy "fotos: autorizado lee"            on public.fotos_proceso    for select using (public.is_authorized());
create policy "fotos: autorizado inserta"        on public.fotos_proceso    for insert with check (public.is_authorized());
create policy "fotos: autorizado actualiza"      on public.fotos_proceso    for update using (public.is_authorized());
create policy "fotos: admin borra"               on public.fotos_proceso    for delete using (public.is_admin());

create policy "sesiones: autorizado lee"         on public.sesiones         for select using (public.is_authorized());
create policy "sesiones: autorizado inserta"     on public.sesiones         for insert with check (public.is_authorized());
create policy "sesiones: autorizado actualiza"   on public.sesiones         for update using (public.is_authorized());
create policy "sesiones: admin borra"            on public.sesiones         for delete using (public.is_admin());

-- =============================================================
-- SEED: Catálogo de servicios reales D'look
-- =============================================================
insert into public.servicios (nombre, categoria, icono, color_acento, orden) values
  ('Depilación láser',           'corporal', 'target',    'turquesa', 1),
  ('Lipo láser',                 'corporal', 'layers',    'gold',     2),
  ('Cavitación + RF + Placas',   'corporal', 'sparkles',  'rosa',     3),
  ('Chocolaterapia',             'corporal', 'cookie',    'deep',     4),
  ('Lodoterapia',                'corporal', 'droplets',  'gold',     5),
  ('Limpieza + Porcelanización', 'facial',   'smile',     'rosa',     6),
  ('Dermapen',                   'facial',   'syringe',   'turquesa', 7),
  ('Masaje relajante',           'masajes',  'heart',     'turquesa', 8),
  ('Piedras volcánicas',         'masajes',  'mountain',  'deep',     9),
  ('Bambuterapia',               'masajes',  'sprout',    'gold',    10),
  ('Aromaterapia',               'masajes',  'flower-2',  'rosa',    11);
