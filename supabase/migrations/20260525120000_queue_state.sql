-- Shared team queue state (stages, membership overrides, column order).

create table if not exists public.queue_project_stages (
  project_id uuid not null references public.projects (id) on delete cascade,
  queue_kind text not null check (queue_kind in ('design', 'estimating')),
  stage text not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, queue_kind)
);

create table if not exists public.queue_memberships (
  project_id uuid not null references public.projects (id) on delete cascade,
  queue_kind text not null check (queue_kind in ('design', 'estimating')),
  membership text not null check (membership in ('member', 'excluded')),
  updated_at timestamptz not null default now(),
  primary key (project_id, queue_kind)
);

create table if not exists public.queue_column_positions (
  queue_kind text not null check (queue_kind in ('design', 'estimating')),
  stage text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  position integer not null check (position >= 0),
  updated_at timestamptz not null default now(),
  primary key (queue_kind, stage, project_id)
);

create index if not exists queue_column_positions_lookup_idx
  on public.queue_column_positions (queue_kind, stage, position);

drop trigger if exists queue_project_stages_updated_at on public.queue_project_stages;
create trigger queue_project_stages_updated_at before update on public.queue_project_stages
  for each row execute function public.set_updated_at();

drop trigger if exists queue_memberships_updated_at on public.queue_memberships;
create trigger queue_memberships_updated_at before update on public.queue_memberships
  for each row execute function public.set_updated_at();

drop trigger if exists queue_column_positions_updated_at on public.queue_column_positions;
create trigger queue_column_positions_updated_at before update on public.queue_column_positions
  for each row execute function public.set_updated_at();

alter table public.queue_project_stages enable row level security;
alter table public.queue_memberships enable row level security;
alter table public.queue_column_positions enable row level security;

create policy "queue_project_stages_select" on public.queue_project_stages
  for select to authenticated using (true);

create policy "queue_project_stages_write" on public.queue_project_stages
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "queue_memberships_select" on public.queue_memberships
  for select to authenticated using (true);

create policy "queue_memberships_write" on public.queue_memberships
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "queue_column_positions_select" on public.queue_column_positions
  for select to authenticated using (true);

create policy "queue_column_positions_write" on public.queue_column_positions
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

grant select on public.queue_project_stages to authenticated;
grant select on public.queue_memberships to authenticated;
grant select on public.queue_column_positions to authenticated;

grant insert, update, delete on public.queue_project_stages to authenticated;
grant insert, update, delete on public.queue_memberships to authenticated;
grant insert, update, delete on public.queue_column_positions to authenticated;
