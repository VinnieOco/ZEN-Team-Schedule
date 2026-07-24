-- Sales / inquiry leads (before a design project exists).

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  title text,
  client_name text not null,
  contact_name text,
  contact_phone text,
  contact_email text,
  source text not null default 'other'
    check (source in ('architect', 'past_client', 'referral', 'web', 'other')),
  status text not null default 'new'
    check (status in ('new', 'qualifying', 'proposal_sent', 'won', 'lost')),
  expected_value numeric,
  probability integer check (probability is null or (probability >= 0 and probability <= 100)),
  next_follow_up_date date,
  owner_employee_id uuid references public.employees (id) on delete set null,
  notes text,
  converted_project_id uuid references public.projects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_client_name_not_empty check (char_length(trim(client_name)) > 0)
);

create index if not exists leads_status_created_idx
  on public.leads (status, created_at desc);

create index if not exists leads_owner_employee_id_idx
  on public.leads (owner_employee_id)
  where owner_employee_id is not null;

create index if not exists leads_next_follow_up_date_idx
  on public.leads (next_follow_up_date)
  where next_follow_up_date is not null;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

alter table public.leads enable row level security;

drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads
  for select to authenticated using (true);

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads
  for insert to authenticated with check (true);

drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads
  for update to authenticated using (true) with check (true);

drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads
  for delete to authenticated using (true);
