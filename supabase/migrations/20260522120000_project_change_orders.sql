alter table public.projects
  add column if not exists parent_project_id uuid references public.projects (id) on delete set null,
  add column if not exists is_change_order boolean not null default false;

create index if not exists projects_parent_project_id_idx
  on public.projects (parent_project_id)
  where parent_project_id is not null;
