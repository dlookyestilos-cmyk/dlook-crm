-- Agrega columna para trackear el ID del evento en Google Calendar
alter table public.citas_agendadas
  add column if not exists google_event_id text;
