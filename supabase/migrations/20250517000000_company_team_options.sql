-- Configurable job roles and departments on company settings

alter table public.company_settings
  add column if not exists job_roles jsonb not null default '[]'::jsonb,
  add column if not exists departments jsonb not null default '[]'::jsonb;

update public.company_settings
set
  job_roles = '[
    "Design Department Manager",
    "Senior Landscape Designer",
    "Landscape Architect",
    "Junior Landscape Designer",
    "Design Technician",
    "Intern",
    "Estimator",
    "Construction PM"
  ]'::jsonb,
  departments = '["Design", "Estimating"]'::jsonb
where id = '00000000-0000-0000-0000-000000000001'
  and (job_roles = '[]'::jsonb or departments = '[]'::jsonb);
