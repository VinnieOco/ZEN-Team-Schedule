-- Member vs admin: projects read-only for members; time entries scoped to linked employee

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.profile_id = auth.uid()
  limit 1;
$$;

-- Projects: all can read; only admins write
drop policy if exists "projects_authenticated" on public.projects;
drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_write_admin" on public.projects;

create policy "projects_select" on public.projects
  for select to authenticated using (true);

create policy "projects_write_admin" on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Time entries: all can read; members write only their linked employee row
drop policy if exists "time_entries_authenticated" on public.time_entries;
drop policy if exists "time_entries_select" on public.time_entries;
drop policy if exists "time_entries_insert" on public.time_entries;
drop policy if exists "time_entries_update" on public.time_entries;
drop policy if exists "time_entries_delete" on public.time_entries;

create policy "time_entries_select" on public.time_entries
  for select to authenticated using (true);

create policy "time_entries_insert" on public.time_entries
  for insert to authenticated
  with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
  );

create policy "time_entries_update" on public.time_entries
  for update to authenticated
  using (
    public.is_admin()
    or employee_id = public.current_employee_id()
  )
  with check (
    public.is_admin()
    or employee_id = public.current_employee_id()
  );

create policy "time_entries_delete" on public.time_entries
  for delete to authenticated
  using (
    public.is_admin()
    or employee_id = public.current_employee_id()
  );
