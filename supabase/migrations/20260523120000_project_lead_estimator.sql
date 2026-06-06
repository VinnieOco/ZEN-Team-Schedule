alter table public.projects
  add column if not exists lead_estimator_id uuid references public.employees (id) on delete set null;

create index if not exists projects_lead_estimator_id_idx
  on public.projects (lead_estimator_id)
  where lead_estimator_id is not null;
