-- Dated notes history for CRM leads.

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_notes_body_not_empty check (char_length(trim(body)) > 0)
);

create index if not exists lead_notes_lead_id_created_at_idx
  on public.lead_notes (lead_id, created_at desc);

-- Preserve notes entered in the original lead form as the first history entry.
insert into public.lead_notes (lead_id, body, created_at, updated_at)
select
  l.id,
  trim(l.notes),
  coalesce(l.updated_at, now()),
  coalesce(l.updated_at, now())
from public.leads l
where l.notes is not null
  and trim(l.notes) <> ''
  and not exists (
    select 1 from public.lead_notes ln where ln.lead_id = l.id
  );

drop trigger if exists lead_notes_updated_at on public.lead_notes;
create trigger lead_notes_updated_at
  before update on public.lead_notes
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on table public.lead_notes to authenticated;

alter table public.lead_notes enable row level security;

drop policy if exists "lead_notes_select" on public.lead_notes;
create policy "lead_notes_select" on public.lead_notes
  for select to authenticated using (true);

drop policy if exists "lead_notes_insert" on public.lead_notes;
create policy "lead_notes_insert" on public.lead_notes
  for insert to authenticated with check (true);

drop policy if exists "lead_notes_update" on public.lead_notes;
create policy "lead_notes_update" on public.lead_notes
  for update to authenticated using (true) with check (true);

drop policy if exists "lead_notes_delete" on public.lead_notes;
create policy "lead_notes_delete" on public.lead_notes
  for delete to authenticated using (true);
