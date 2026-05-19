-- Configurable class codes for time tracking timesheets.

alter table public.company_settings
  add column if not exists class_codes jsonb not null default '[]'::jsonb;
