-- Team notes history: dated entries per project (editable by any authenticated user).

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_notes_body_not_empty check (char_length(trim(body)) > 0)
);

create index if not exists project_notes_project_id_created_at_idx
  on public.project_notes (project_id, created_at desc);

-- Backfill legacy single-field notes
insert into public.project_notes (project_id, body, created_at, updated_at)
select
  p.id,
  trim(p.notes),
  coalesce(p.updated_at, now()),
  coalesce(p.updated_at, now())
from public.projects p
where p.notes is not null
  and trim(p.notes) <> ''
  and not exists (
    select 1 from public.project_notes pn where pn.project_id = p.id
  );

drop trigger if exists project_notes_updated_at on public.project_notes;
create trigger project_notes_updated_at
  before update on public.project_notes
  for each row execute function public.set_updated_at();

alter table public.project_notes enable row level security;

drop policy if exists "project_notes_select" on public.project_notes;
create policy "project_notes_select" on public.project_notes
  for select to authenticated using (true);

drop policy if exists "project_notes_insert" on public.project_notes;
create policy "project_notes_insert" on public.project_notes
  for insert to authenticated with check (true);

drop policy if exists "project_notes_update" on public.project_notes;
create policy "project_notes_update" on public.project_notes
  for update to authenticated using (true) with check (true);
