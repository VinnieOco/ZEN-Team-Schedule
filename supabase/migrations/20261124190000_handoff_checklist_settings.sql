-- Company-wide handoff checklists. An empty object means “use the built-in list”.

alter table public.company_settings
  add column if not exists handoff_checklists jsonb not null default '{}'::jsonb;
