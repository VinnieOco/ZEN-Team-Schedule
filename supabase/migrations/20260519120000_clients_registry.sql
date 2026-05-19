-- CRM client registry (linked to projects via normalized client name).

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_key text not null,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_not_empty check (char_length(trim(name)) > 0),
  constraint clients_normalized_key_not_empty check (char_length(trim(normalized_key)) > 0),
  constraint clients_normalized_key_unique unique (normalized_key)
);

create index if not exists clients_normalized_key_idx on public.clients (normalized_key);

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select to authenticated using (true);

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert to authenticated with check (true);

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update to authenticated using (true) with check (true);

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete to authenticated using (true);

-- Backfill from existing project client names (one row per normalized name).
insert into public.clients (name, normalized_key, address, phone, email)
select distinct on (lower(trim(p.client_name)))
  trim(p.client_name),
  lower(trim(p.client_name)),
  nullif(trim(p.address), ''),
  nullif(trim(p.phone), ''),
  nullif(trim(p.email), '')
from public.projects p
where char_length(trim(p.client_name)) > 0
order by lower(trim(p.client_name)), p.created_at
on conflict (normalized_key) do nothing;
