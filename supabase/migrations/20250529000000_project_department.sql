-- Project department (replaces status in the app UI; status column kept for compatibility).

alter table public.projects
  add column if not exists department text;

alter table public.projects
  alter column status drop not null;

alter table public.projects
  alter column status set default null;
