-- Estimate packages and revisions (separate entity from projects and leads).

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  project_id uuid references public.projects (id) on delete set null,
  title text,
  estimate_type text not null default 'budget'
    check (estimate_type in ('budget', 'cost_proposal', 'contract')),
  revision_number integer not null default 0 check (revision_number >= 0),
  revises_estimate_id uuid references public.estimates (id) on delete set null,
  estimator_id uuid references public.employees (id) on delete set null,
  received_date date,
  due_date date,
  submitted_date date,
  amount numeric,
  stage text not null default 'backlog'
    check (stage in ('backlog', 'waiting_docs', 'pricing', 'submitted', 'follow_up', 'won', 'lost')),
  result text not null default 'pending' check (result in ('pending', 'won', 'lost')),
  checklist jsonb not null default '[]'::jsonb,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint estimates_client_name_not_empty check (char_length(trim(client_name)) > 0)
);

create index if not exists estimates_stage_sort_idx
  on public.estimates (stage, sort_order, created_at desc);

create index if not exists estimates_estimator_id_idx
  on public.estimates (estimator_id)
  where estimator_id is not null;

create index if not exists estimates_project_id_idx
  on public.estimates (project_id)
  where project_id is not null;

create index if not exists estimates_due_date_idx
  on public.estimates (due_date)
  where due_date is not null;

-- Weekly submitted $ reporting reads this range often.
create index if not exists estimates_submitted_date_idx
  on public.estimates (submitted_date desc)
  where submitted_date is not null;

create index if not exists estimates_revises_estimate_id_idx
  on public.estimates (revises_estimate_id)
  where revises_estimate_id is not null;

drop trigger if exists estimates_updated_at on public.estimates;
create trigger estimates_updated_at
  before update on public.estimates
  for each row execute function public.set_updated_at();

alter table public.estimates enable row level security;

drop policy if exists "estimates_select" on public.estimates;
create policy "estimates_select" on public.estimates
  for select to authenticated using (true);

drop policy if exists "estimates_insert" on public.estimates;
create policy "estimates_insert" on public.estimates
  for insert to authenticated with check (true);

drop policy if exists "estimates_update" on public.estimates;
create policy "estimates_update" on public.estimates
  for update to authenticated using (true) with check (true);

drop policy if exists "estimates_delete" on public.estimates;
create policy "estimates_delete" on public.estimates
  for delete to authenticated using (true);
