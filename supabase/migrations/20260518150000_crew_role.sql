-- Crew Team app role: time tracking focus; no CRM, projects, reports, settings, or schedule edits.

alter table public.profiles drop constraint if exists profiles_app_role_check;
alter table public.profiles
  add constraint profiles_app_role_check
  check (app_role in ('admin', 'manager', 'member', 'crew'));

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

  if assigned_role not in ('admin', 'manager', 'member', 'crew') then
    assigned_role := 'member';
  end if;

  insert into public.profiles (id, email, app_role)
  values (new.id, new.email, assigned_role)
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

-- Only Office Team (member) and managers/admins may write allocations on their scope; crew is read-only.
create or replace function public.can_write_allocation(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      target_employee_id = public.current_employee_id()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.app_role = 'member'
      )
    )
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
