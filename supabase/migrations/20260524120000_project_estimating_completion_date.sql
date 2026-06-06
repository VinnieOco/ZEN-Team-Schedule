alter table public.projects
  add column if not exists estimating_completion_date date;
