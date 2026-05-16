-- Manager role: operational access like admin; app access / profile admin stays admin-only

alter table public.profiles drop constraint if exists profiles_app_role_check;
alter table public.profiles
  add constraint profiles_app_role_check
  check (app_role in ('admin', 'manager', 'member'));

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

  if assigned_role not in ('admin', 'manager', 'member') then
    assigned_role := 'member';
  end if;

  insert into public.profiles (id, email, app_role)
  values (new.id, new.email, assigned_role)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_manager_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and app_role in ('admin', 'manager')
  );
$$;

-- Employees & company settings: managers can write
drop policy if exists "employees_write_admin" on public.employees;
drop policy if exists "employees_write_elevated" on public.employees;
create policy "employees_write_elevated" on public.employees
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

drop policy if exists "settings_write_admin" on public.company_settings;
drop policy if exists "settings_write_elevated" on public.company_settings;
create policy "settings_write_elevated" on public.company_settings
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- Projects: managers can write
drop policy if exists "projects_write_admin" on public.projects;
drop policy if exists "projects_write_elevated" on public.projects;
create policy "projects_write_elevated" on public.projects
  for all to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- Time entries: managers log for anyone (like admin)
drop policy if exists "time_entries_insert" on public.time_entries;
drop policy if exists "time_entries_update" on public.time_entries;
drop policy if exists "time_entries_delete" on public.time_entries;

create policy "time_entries_insert" on public.time_entries
  for insert to authenticated
  with check (
    public.is_manager_or_admin()
    or employee_id = public.current_employee_id()
  );

create policy "time_entries_update" on public.time_entries
  for update to authenticated
  using (
    public.is_manager_or_admin()
    or employee_id = public.current_employee_id()
  )
  with check (
    public.is_manager_or_admin()
    or employee_id = public.current_employee_id()
  );

create policy "time_entries_delete" on public.time_entries
  for delete to authenticated
  using (
    public.is_manager_or_admin()
    or employee_id = public.current_employee_id()
  );
