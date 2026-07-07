-- @mention handles for team members and assignable todos.

alter table public.employees
  add column if not exists handle text;

create unique index if not exists employees_handle_lower_unique
  on public.employees (lower(handle))
  where handle is not null;

-- Backfill handles from email local-part, then first initial + last name.
update public.employees e
set handle = sub.candidate
from (
  select
    id,
    coalesce(
      nullif(lower(regexp_replace(split_part(email, '@', 1), '[^a-z0-9]', '', 'gi')), ''),
      nullif(lower(regexp_replace(left(first_name, 1) || last_name, '[^a-z0-9]', '', 'gi')), '')
    ) as candidate
  from public.employees
  where handle is null
) sub
where e.id = sub.id
  and sub.candidate is not null;

-- Resolve duplicate handles by suffixing with row number.
with ranked as (
  select
    id,
    handle,
    row_number() over (partition by lower(handle) order by created_at, id) as rn
  from public.employees
  where handle is not null
)
update public.employees e
set handle = ranked.handle || ranked.rn::text
from ranked
where e.id = ranked.id
  and ranked.rn > 1;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  body text not null,
  status text not null default 'open' check (status in ('open', 'completed')),
  completed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  source_type text not null default 'manual' check (source_type in ('manual', 'mention')),
  source_project_id uuid references public.projects (id) on delete cascade,
  source_client_key text,
  source_note_id uuid,
  source_note_type text check (source_note_type in ('project', 'client')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_body_not_empty check (char_length(trim(body)) > 0),
  constraint todos_mention_source_unique unique (employee_id, source_note_id, source_note_type)
);

create index if not exists todos_employee_status_created_idx
  on public.todos (employee_id, status, created_at desc);

create index if not exists todos_source_note_idx
  on public.todos (source_note_id, source_note_type)
  where source_note_id is not null;

drop trigger if exists todos_updated_at on public.todos;
create trigger todos_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;

drop policy if exists "todos_select" on public.todos;
create policy "todos_select" on public.todos
  for select to authenticated using (true);

drop policy if exists "todos_insert" on public.todos;
create policy "todos_insert" on public.todos
  for insert to authenticated with check (true);

drop policy if exists "todos_update" on public.todos;
create policy "todos_update" on public.todos
  for update to authenticated using (true) with check (true);

drop policy if exists "todos_delete" on public.todos;
create policy "todos_delete" on public.todos
  for delete to authenticated using (true);
