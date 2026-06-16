-- Per-project phase schedules for Gantt planning.

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  phase_key text not null,
  sort_order integer not null check (sort_order >= 0),
  start_date date,
  end_date date,
  budget_hours numeric not null default 0,
  budget_amount numeric,
  linked_to_previous boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, phase_key)
);

create index if not exists project_phases_project_sort_idx
  on public.project_phases (project_id, sort_order);

drop trigger if exists project_phases_updated_at on public.project_phases;
create trigger project_phases_updated_at before update on public.project_phases
  for each row execute function public.set_updated_at();

alter table public.project_phases enable row level security;

create policy "project_phases_select" on public.project_phases
  for select to authenticated using (true);

create policy "project_phases_write" on public.project_phases
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

grant select on public.project_phases to authenticated;
grant insert, update, delete on public.project_phases to authenticated;
