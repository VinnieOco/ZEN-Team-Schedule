-- Checkable follow-up history for CRM leads. The latest open follow-up date
-- is mirrored onto leads.next_follow_up_date so pipeline views stay in sync.

create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  due_date date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_follow_ups_lead_id_due_date_idx
  on public.lead_follow_ups (lead_id, due_date desc);

-- Preserve the follow-up date already saved on each lead as the first entry.
insert into public.lead_follow_ups (lead_id, due_date, created_at, updated_at)
select
  l.id,
  l.next_follow_up_date,
  coalesce(l.updated_at, now()),
  coalesce(l.updated_at, now())
from public.leads l
where l.next_follow_up_date is not null
  and not exists (
    select 1 from public.lead_follow_ups f where f.lead_id = l.id
  );

drop trigger if exists lead_follow_ups_updated_at on public.lead_follow_ups;
create trigger lead_follow_ups_updated_at
  before update on public.lead_follow_ups
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.lead_follow_ups to authenticated;

alter table public.lead_follow_ups enable row level security;

drop policy if exists "lead_follow_ups_select" on public.lead_follow_ups;
create policy "lead_follow_ups_select" on public.lead_follow_ups
  for select to authenticated using (true);

drop policy if exists "lead_follow_ups_insert" on public.lead_follow_ups;
create policy "lead_follow_ups_insert" on public.lead_follow_ups
  for insert to authenticated with check (true);

drop policy if exists "lead_follow_ups_update" on public.lead_follow_ups;
create policy "lead_follow_ups_update" on public.lead_follow_ups
  for update to authenticated using (true) with check (true);

drop policy if exists "lead_follow_ups_delete" on public.lead_follow_ups;
create policy "lead_follow_ups_delete" on public.lead_follow_ups
  for delete to authenticated using (true);
