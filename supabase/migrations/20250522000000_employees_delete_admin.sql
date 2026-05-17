-- Only admins may delete schedule team members; managers can still insert/update.

drop policy if exists "employees_write_elevated" on public.employees;
drop policy if exists "employees_insert_elevated" on public.employees;
drop policy if exists "employees_update_elevated" on public.employees;
drop policy if exists "employees_delete_admin" on public.employees;

create policy "employees_insert_elevated" on public.employees
  for insert to authenticated
  with check (public.is_manager_or_admin());

create policy "employees_update_elevated" on public.employees
  for update to authenticated
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

create policy "employees_delete_admin" on public.employees
  for delete to authenticated
  using (public.is_admin());
