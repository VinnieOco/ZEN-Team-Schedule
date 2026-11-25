-- Which areas each app role can see. An empty object means the built-in defaults.

alter table public.company_settings
  add column if not exists role_visibility jsonb not null default '{}'::jsonb;
