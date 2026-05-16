-- Actual hours logged by the team (compare to schedule allocations)

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  allocation_category_id uuid not null references public.allocation_categories (id) on delete restrict,
  entry_date date not null,
  hours numeric not null check (hours > 0 and hours <= 24),
  is_billable boolean not null default true,
  phase text,
  task_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_entries_employee_date_idx on public.time_entries (employee_id, entry_date);
create index if not exists time_entries_project_idx on public.time_entries (project_id);
create index if not exists time_entries_date_idx on public.time_entries (entry_date);

drop trigger if exists time_entries_updated_at on public.time_entries;
create trigger time_entries_updated_at before update on public.time_entries
  for each row execute function public.set_updated_at();

alter table public.time_entries enable row level security;

drop policy if exists "time_entries_authenticated" on public.time_entries;
create policy "time_entries_authenticated" on public.time_entries
  for all to authenticated using (true) with check (true);
