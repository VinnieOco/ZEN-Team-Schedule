-- Shared per-estimator priority order for the Pipeline Estimating main table.
-- Estimate IDs are not project FKs, so this lives outside queue_column_positions.

create table if not exists public.estimate_priority_positions (
  estimator_id uuid not null references public.employees (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  position integer not null check (position >= 0),
  updated_at timestamptz not null default now(),
  primary key (estimator_id, estimate_id)
);

create index if not exists estimate_priority_positions_lookup_idx
  on public.estimate_priority_positions (estimator_id, position);

drop trigger if exists estimate_priority_positions_updated_at on public.estimate_priority_positions;
create trigger estimate_priority_positions_updated_at
  before update on public.estimate_priority_positions
  for each row execute function public.set_updated_at();

alter table public.estimate_priority_positions enable row level security;

drop policy if exists "estimate_priority_positions_select" on public.estimate_priority_positions;
drop policy if exists "estimate_priority_positions_write" on public.estimate_priority_positions;

create policy "estimate_priority_positions_select" on public.estimate_priority_positions
  for select to authenticated
  using ((select public.is_office_user()));

create policy "estimate_priority_positions_write" on public.estimate_priority_positions
  for all to authenticated
  using ((select public.is_manager_or_admin()))
  with check ((select public.is_manager_or_admin()));

grant select on public.estimate_priority_positions to authenticated;
grant insert, update, delete on public.estimate_priority_positions to authenticated;
