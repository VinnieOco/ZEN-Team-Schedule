-- Project milestones for Gantt timelines (submittals, reviews, permits, etc.).

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  milestone_date date not null,
  kind text not null default 'other'
    check (kind in ('submittal', 'client_review', 'permit', 'delivery', 'other')),
  sort_order integer not null default 0 check (sort_order >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_milestones_project_date_idx
  on public.project_milestones (project_id, milestone_date);

drop trigger if exists project_milestones_updated_at on public.project_milestones;
create trigger project_milestones_updated_at before update on public.project_milestones
  for each row execute function public.set_updated_at();

alter table public.project_milestones enable row level security;

create policy "project_milestones_select" on public.project_milestones
  for select to authenticated using (true);

create policy "project_milestones_write" on public.project_milestones
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

grant select on public.project_milestones to authenticated;
grant insert, update, delete on public.project_milestones to authenticated;
