-- =============================================================
-- D'look y Estilos — CRM
-- Migration 002: Catálogo real desde brochure 2026
-- =============================================================
-- Cambios:
--   • Reorganiza líneas: corporal/facial/masajes → laser/rostro/corporal
--   • Agrega columnas: precio_sesion, sesiones_paquete, precio_paquete, nota_precio
--   • Reemplaza el seed inicial (inventado) con los 26 servicios reales
-- =============================================================

-- 1. Drop constraint viejo de categoría
alter table public.servicios drop constraint if exists servicios_categoria_check;

-- 2. Nuevas columnas de precio
alter table public.servicios add column if not exists precio_sesion     numeric(10, 2);
alter table public.servicios add column if not exists sesiones_paquete  int;
alter table public.servicios add column if not exists precio_paquete    numeric(10, 2);
alter table public.servicios add column if not exists nota_precio       text;
alter table public.servicios add column if not exists descripcion       text;

-- 3. Limpiar seed inicial (inventado) — seguro porque aún no hay clientes reales
delete from public.servicios;

-- 4. Constraint nuevo de categoría: las 3 líneas oficiales
alter table public.servicios add constraint servicios_categoria_check
  check (categoria in ('laser', 'rostro', 'corporal'));

-- 5. Seed real: 26 servicios del brochure 2026
insert into public.servicios
  (nombre, categoria, descripcion, icono, color_acento, precio_sesion, sesiones_paquete, precio_paquete, nota_precio, orden)
values
-- ───────── LÍNEA I — DEPILACIÓN LÁSER ─────────
('Full 7 Zonas — Mujer',           'laser',    'Tratamiento completo de las zonas más solicitadas en una sola sesión.',                'crown',         'gold',      90000, null, null, null, 1),
('Full 7 Zonas — Hombre',          'laser',    'Protocolo masculino adaptado a piel y tipo de vello.',                                 'crown',         'turquesa', 150000, null, null, null, 2),
('Bikini Completo (Perianal)',     'laser',    'Zona íntima completa, con técnica delicada y resultados duraderos.',                   'gem',           'rosa',      50000, null, null, null, 3),
('Bikini Completo + Axilas',       'laser',    'Combo ideal para quienes buscan eficiencia en una misma cita.',                        'package',       'gold',      65000, null, null, null, 4),
('Piernas Completas',              'laser',    'Desde el muslo hasta el tobillo. Piel suave, libre de vello.',                         'footprints',    'turquesa',  70000, null, null, null, 5),
('Axilas Completas',               'laser',    'Zona pequeña pero de alta demanda. Resultados visibles desde las primeras sesiones.',  'shield',        'deep',      40000, null, null, null, 6),
('Bozo + Mentón',                  'laser',    'Para una piel del rostro más limpia y uniforme.',                                      'smile',         'rosa',      40000, null, null, null, 7),
('Rostro Completo',                'laser',    'Depilación facial integral con tecnología láser segura.',                              'user-round',    'gold',      40000, null, null, null, 8),

-- ───────── LÍNEA II — ROSTRO ─────────
('Micropigmentación de Cejas',     'rostro',   'Cejas definidas, naturales y simétricas. Retoque incluido.',                           'eye',           'gold',     150000, null, null, 'Retoque incluido', 9),
('Limpieza Facial Profunda',       'rostro',   'Extracción, exfoliación e hidratación. La base de toda piel sana.',                    'droplet',       'turquesa', 120000, null, null, null, 10),
('Limpieza + Pinkglow',            'rostro',   'Aporta luminosidad y un acabado rosado natural a la piel.',                            'sun',           'rosa',     180000, null, null, null, 11),
('Limpieza + Skinbooster',         'rostro',   'Con ADN de salmón. Hidratación profunda y regeneración celular.',                      'sparkles',      'gold',     280000, null, null, null, 12),
('Limpieza + Nutrición Acné',      'rostro',   'Protocolo específico para pieles con tendencia acneica.',                              'shield-check',  'turquesa', 150000, null, null, null, 13),
('Limpieza + Dermapen',            'rostro',   'Microneedling para mejorar textura, cicatrices y firmeza.',                            'syringe',       'rosa',     150000, null, null, null, 14),
('Tratamiento de Ojeras',          'rostro',   'Plan completo para iluminar la mirada y reducir bolsas.',                              'moon',          'deep',       null,    4, 450000, '4 sesiones',       15),
('Limpieza + Peeling Facial',      'rostro',   'Renovación celular para una piel uniforme y radiante.',                                'leaf',          'gold',     150000, null, null, null, 16),

-- ───────── LÍNEA III — CORPORAL ─────────
('Masaje Relajante',                       'corporal', 'Una hora dedicada a soltar tensiones y respirar.',                'heart',      'turquesa', 110000, null, null, null,                          17),
('Chocolaterapia',                         'corporal', 'Ritual con cacao puro. Antioxidante, nutritivo y delicioso.',     'cookie',     'gold',     250000, null, null, null,                          18),
('Lodoterapia',                            'corporal', 'Detox profundo con minerales y arcillas naturales.',              'mountain',   'deep',     250000, null, null, null,                          19),
('Moldeo Corporal + Drenaje Linfático',    'corporal', 'Reduce retención, modela y mejora circulación.',                  'wind',       'turquesa', 100000,   10, 900000, '10 sesiones · $900.000',    20),
('Abdomen — Reductor + Reafirmante',       'corporal', 'Trabajo focalizado en zona abdominal con resultados visibles.',   'circle-dot', 'rosa',      80000,    6, 420000, '6 sesiones · $420.000',     21),
('Levantamiento de Glúteos',               'corporal', 'Tonificación, firmeza y forma. Sin invasivos.',                   'arrow-up',   'gold',      75000,    6, 400000, '6 sesiones · $400.000',     22),
('Piernas — Celulitis + Moldeo',           'corporal', 'Reducción de celulitis y modelado de muslos y piernas.',          'activity',   'rosa',      90000,    6, 480000, '6 sesiones · $480.000',     23),
('Moldeo Corporal Completo',               'corporal', 'Cavitación + radiofrecuencia + placas en una sesión.',            'aperture',   'turquesa',  70000, null, null, null,                          24),
('Cavitación',                             'corporal', 'Reduce medidas de zonas localizadas con ultrasonido.',            'waves',      'deep',      60000, null, null, null,                          25),
('Radiofrecuencia',                        'corporal', 'Reafirma, tonifica y combate la flacidez.',                       'zap',        'gold',      60000, null, null, null,                          26);

-- =============================================================
-- LÍNEAS (catálogo de líneas/categorías con texto del brochure)
-- =============================================================
create table if not exists public.lineas (
  slug          text primary key,
  nombre        text not null,
  descripcion   text not null,
  frase_cierre  text,
  orden         int not null default 0
);

alter table public.lineas enable row level security;

create policy "lineas: autorizado lee" on public.lineas
  for select using (public.is_authorized());

create policy "lineas: admin escribe" on public.lineas
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.lineas (slug, nombre, descripcion, frase_cierre, orden) values
  ('laser',    'Depilación Láser', 'Depilación con láser profesional. Sesiones precisas, seguras y pensadas para cada zona del cuerpo.', 'Agenda una consulta personalizada y te armamos el plan perfecto para tu piel y tu rutina.', 1),
  ('rostro',   'Rostro',           'Tratamientos faciales que combinan técnica, productos profesionales y diagnóstico personalizado para tu piel.', 'Agenda una valoración y diseñamos juntas el protocolo ideal para lo que tu rostro necesita hoy.', 2),
  ('corporal', 'Corporal',         'Rituales y tratamientos para moldear, relajar y reconectar con tu cuerpo.', null, 3)
on conflict (slug) do update set
  nombre       = excluded.nombre,
  descripcion  = excluded.descripcion,
  frase_cierre = excluded.frase_cierre,
  orden        = excluded.orden;
