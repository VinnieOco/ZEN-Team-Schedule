alter table public.projects
  add column if not exists estimate_value numeric;

comment on column public.projects.estimated_construction_value is 'Design amount (design contract / fee value)';
comment on column public.projects.estimate_value is 'Construction estimate amount';
