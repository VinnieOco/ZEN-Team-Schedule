-- Profiles, app roles (admin | member), and tighter RLS

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  app_role text not null default 'member' check (app_role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Backfill profiles for users created before this migration
insert into public.profiles (id, email, app_role)
select
  u.id,
  u.email,
  case when row_number() over (order by u.created_at) = 1 then 'admin' else 'member' end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text;
begin
  assigned_role := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'app_role'), ''),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'member' end
  );

  if assigned_role not in ('admin', 'member') then
    assigned_role := 'member';
  end if;

  insert into public.profiles (id, email, app_role)
  values (new.id, new.email, assigned_role)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role = 'admin'
  );
$$;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select to authenticated using (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Replace blanket policies with role-aware rules
drop policy if exists "authenticated_all_employees" on public.employees;
drop policy if exists "employees_select" on public.employees;
drop policy if exists "employees_write_admin" on public.employees;

create policy "employees_select" on public.employees
  for select to authenticated using (true);

create policy "employees_write_admin" on public.employees
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "authenticated_all_settings" on public.company_settings;
drop policy if exists "settings_select" on public.company_settings;
drop policy if exists "settings_write_admin" on public.company_settings;

create policy "settings_select" on public.company_settings
  for select to authenticated using (true);

create policy "settings_write_admin" on public.company_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Projects, categories, allocations: all authenticated team members
drop policy if exists "authenticated_all_projects" on public.projects;
drop policy if exists "projects_authenticated" on public.projects;
create policy "projects_authenticated" on public.projects
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_categories" on public.allocation_categories;
drop policy if exists "categories_authenticated" on public.allocation_categories;
create policy "categories_authenticated" on public.allocation_categories
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_all_allocations" on public.allocations;
drop policy if exists "allocations_authenticated" on public.allocations;
create policy "allocations_authenticated" on public.allocations
  for all to authenticated using (true) with check (true);
