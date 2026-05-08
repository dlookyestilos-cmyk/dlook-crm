-- Migration 007: Marcar clientas creadas automáticamente desde Google Calendar
alter table public.clientes
  add column if not exists pendiente_datos boolean not null default false;
