-- CRM client notes: dated entries keyed by normalized client name.

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_key text not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_notes_body_not_empty check (char_length(trim(body)) > 0),
  constraint client_notes_client_key_not_empty check (char_length(trim(client_key)) > 0)
);

create index if not exists client_notes_client_key_created_at_idx
  on public.client_notes (client_key, created_at desc);

drop trigger if exists client_notes_updated_at on public.client_notes;
create trigger client_notes_updated_at
  before update on public.client_notes
  for each row execute function public.set_updated_at();

alter table public.client_notes enable row level security;

drop policy if exists "client_notes_select" on public.client_notes;
create policy "client_notes_select" on public.client_notes
  for select to authenticated using (true);

drop policy if exists "client_notes_insert" on public.client_notes;
create policy "client_notes_insert" on public.client_notes
  for insert to authenticated with check (true);

drop policy if exists "client_notes_update" on public.client_notes;
create policy "client_notes_update" on public.client_notes
  for update to authenticated using (true) with check (true);

drop policy if exists "client_notes_delete" on public.client_notes;
create policy "client_notes_delete" on public.client_notes
  for delete to authenticated using (true);
