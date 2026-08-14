-- Monthly WIP schedule snapshots so As-of months keep independent entered values.

create table if not exists public.project_wip_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  as_of_month text not null
    check (as_of_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  wip_contract_price numeric,
  wip_cost_to_date numeric,
  wip_estimated_cost_to_complete numeric,
  wip_billings_to_date numeric,
  wip_provision_for_loss numeric,
  wip_prior_fy_revenue numeric,
  wip_prior_fy_cost numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_wip_snapshots_project_month_unique unique (project_id, as_of_month)
);

create index if not exists project_wip_snapshots_project_id_idx
  on public.project_wip_snapshots (project_id);

create index if not exists project_wip_snapshots_as_of_month_idx
  on public.project_wip_snapshots (as_of_month);

comment on table public.project_wip_snapshots is
  'Entered WIP schedule fields scoped to an As-of month (YYYY-MM).';

drop trigger if exists project_wip_snapshots_updated_at on public.project_wip_snapshots;
create trigger project_wip_snapshots_updated_at
  before update on public.project_wip_snapshots
  for each row execute function public.set_updated_at();

-- Seed the current month from legacy project-level WIP columns (if any).
insert into public.project_wip_snapshots (
  project_id,
  as_of_month,
  wip_contract_price,
  wip_cost_to_date,
  wip_estimated_cost_to_complete,
  wip_billings_to_date,
  wip_provision_for_loss,
  wip_prior_fy_revenue,
  wip_prior_fy_cost
)
select
  p.id,
  to_char((current_timestamp at time zone 'America/New_York')::date, 'YYYY-MM'),
  p.wip_contract_price,
  p.wip_cost_to_date,
  p.wip_estimated_cost_to_complete,
  p.wip_billings_to_date,
  p.wip_provision_for_loss,
  p.wip_prior_fy_revenue,
  p.wip_prior_fy_cost
from public.projects p
where
  p.wip_contract_price is not null
  or p.wip_cost_to_date is not null
  or p.wip_estimated_cost_to_complete is not null
  or p.wip_billings_to_date is not null
  or p.wip_provision_for_loss is not null
  or p.wip_prior_fy_revenue is not null
  or p.wip_prior_fy_cost is not null
on conflict (project_id, as_of_month) do nothing;

alter table public.project_wip_snapshots enable row level security;

-- Matches app permission viewWipSchedule (admin only).
drop policy if exists "project_wip_snapshots_select" on public.project_wip_snapshots;
create policy "project_wip_snapshots_select" on public.project_wip_snapshots
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "project_wip_snapshots_insert" on public.project_wip_snapshots;
create policy "project_wip_snapshots_insert" on public.project_wip_snapshots
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "project_wip_snapshots_update" on public.project_wip_snapshots;
create policy "project_wip_snapshots_update" on public.project_wip_snapshots
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "project_wip_snapshots_delete" on public.project_wip_snapshots;
create policy "project_wip_snapshots_delete" on public.project_wip_snapshots
  for delete to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.project_wip_snapshots to authenticated;
