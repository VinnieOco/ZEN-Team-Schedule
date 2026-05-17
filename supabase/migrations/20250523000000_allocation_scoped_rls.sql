-- Allocations: all can read; write scoped by role (admin all, manager same department, member own row).

create or replace function public.current_employee_department_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(trim(e.department), ''), '')
  from public.employees e
  where e.profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_write_allocation(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or target_employee_id = public.current_employee_id()
    or (
      exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.app_role = 'manager'
      )
      and exists (
        select 1
        from public.employees target
        where target.id = target_employee_id
          and coalesce(nullif(trim(target.department), ''), '')
            is not distinct from public.current_employee_department_key()
      )
    );
$$;

drop policy if exists "authenticated_all_allocations" on public.allocations;
drop policy if exists "allocations_authenticated" on public.allocations;
drop policy if exists "allocations_select" on public.allocations;
drop policy if exists "allocations_insert" on public.allocations;
drop policy if exists "allocations_update" on public.allocations;
drop policy if exists "allocations_delete" on public.allocations;

create policy "allocations_select" on public.allocations
  for select to authenticated using (true);

create policy "allocations_insert" on public.allocations
  for insert to authenticated
  with check (public.can_write_allocation(employee_id));

create policy "allocations_update" on public.allocations
  for update to authenticated
  using (public.can_write_allocation(employee_id))
  with check (public.can_write_allocation(employee_id));

create policy "allocations_delete" on public.allocations
  for delete to authenticated
  using (public.can_write_allocation(employee_id));
