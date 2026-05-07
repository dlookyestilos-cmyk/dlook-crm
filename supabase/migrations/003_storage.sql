-- =============================================================
-- D'look y Estilos — CRM
-- Migration 003: Supabase Storage (consentimientos + fotos)
-- =============================================================
-- Crea 2 buckets privados y sus RLS:
--   • consentimientos    → PDFs firmados de consentimiento informado
--   • fotos-proceso      → Fotos antes/después de cada sesión
-- =============================================================

-- Buckets privados (sólo se acceden vía signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('consentimientos', 'consentimientos', false, 10485760,  array['application/pdf']),                                            -- 10 MB
  ('fotos-proceso',   'fotos-proceso',   false,  5242880,  array['image/jpeg','image/png','image/webp','image/heic','image/heif']) -- 5 MB
on conflict (id) do update set
  public               = excluded.public,
  file_size_limit      = excluded.file_size_limit,
  allowed_mime_types   = excluded.allowed_mime_types;

-- =============================================================
-- RLS sobre storage.objects
-- =============================================================
-- Solo personal autorizado (profile activo) puede leer / subir / borrar.

-- CONSENTIMIENTOS
drop policy if exists "consent_storage_select" on storage.objects;
drop policy if exists "consent_storage_insert" on storage.objects;
drop policy if exists "consent_storage_delete" on storage.objects;
drop policy if exists "consent_storage_update" on storage.objects;

create policy "consent_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'consentimientos' and public.is_authorized());

create policy "consent_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'consentimientos' and public.is_authorized());

create policy "consent_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'consentimientos' and public.is_authorized());

create policy "consent_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'consentimientos' and public.is_authorized());

-- FOTOS DEL PROCESO
drop policy if exists "fotos_storage_select" on storage.objects;
drop policy if exists "fotos_storage_insert" on storage.objects;
drop policy if exists "fotos_storage_delete" on storage.objects;
drop policy if exists "fotos_storage_update" on storage.objects;

create policy "fotos_storage_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-proceso' and public.is_authorized());

create policy "fotos_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-proceso' and public.is_authorized());

create policy "fotos_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos-proceso' and public.is_authorized());

create policy "fotos_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-proceso' and public.is_authorized());
