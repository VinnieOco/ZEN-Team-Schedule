-- ZEN Team Scheduling — initial schema

create extension if not exists "pgcrypto";

-- Employees
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  role text not null,
  email text,
  avatar_url text,
  weekly_capacity_hours numeric not null default 40,
  daily_capacity_hours numeric not null default 8,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  client_name text not null,
  project_number text,
  status text not null,
  phase text not null,
  lead_employee_id uuid references public.employees (id) on delete set null,
  budgeted_design_hours numeric not null default 0,
  estimated_construction_value numeric,
  start_date date,
  target_completion_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allocation categories
create table if not exists public.allocation_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  is_billable_default boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Allocations
create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  allocation_category_id uuid not null references public.allocation_categories (id) on delete restrict,
  allocation_date date not null,
  hours numeric not null check (hours > 0 and hours <= 24),
  is_billable boolean not null default true,
  phase text,
  task_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists allocations_employee_date_idx on public.allocations (employee_id, allocation_date);
create index if not exists allocations_project_idx on public.allocations (project_id);
create index if not exists allocations_date_idx on public.allocations (allocation_date);

-- Company settings (singleton row)
create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  default_daily_capacity numeric not null default 8,
  default_weekly_capacity numeric not null default 40,
  workweek_start_day text not null default 'Monday',
  include_weekends boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists allocations_updated_at on public.allocations;
create trigger allocations_updated_at before update on public.allocations
  for each row execute function public.set_updated_at();

drop trigger if exists company_settings_updated_at on public.company_settings;
create trigger company_settings_updated_at before update on public.company_settings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.allocation_categories enable row level security;
alter table public.allocations enable row level security;
alter table public.company_settings enable row level security;

-- Authenticated users (design team) can read/write all rows
drop policy if exists "authenticated_all_employees" on public.employees;
create policy "authenticated_all_employees" on public.employees
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_projects" on public.projects;
create policy "authenticated_all_projects" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_categories" on public.allocation_categories;
create policy "authenticated_all_categories" on public.allocation_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_allocations" on public.allocations;
create policy "authenticated_all_allocations" on public.allocations
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_settings" on public.company_settings;
create policy "authenticated_all_settings" on public.company_settings
  for all to authenticated using (true) with check (true);
