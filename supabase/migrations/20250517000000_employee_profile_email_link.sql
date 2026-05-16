-- Link schedule team members (employees) to app users (profiles) by email

alter table public.employees
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create unique index if not exists employees_profile_id_unique
  on public.employees (profile_id)
  where profile_id is not null;

create or replace function public.normalize_email(email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(coalesce(email, ''))), '');
$$;

-- When a profile email is set/changed, link the matching employee row
create or replace function public.link_employees_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  target_employee_id uuid;
begin
  normalized := public.normalize_email(NEW.email);

  update public.employees
  set profile_id = null
  where profile_id = NEW.id;

  if normalized is null then
    return NEW;
  end if;

  select e.id into target_employee_id
  from public.employees e
  where public.normalize_email(e.email) = normalized
  order by e.active desc, e.created_at asc
  limit 1;

  if target_employee_id is not null then
    update public.employees
    set profile_id = null
    where profile_id = NEW.id and id <> target_employee_id;

    update public.employees
    set profile_id = NEW.id
    where id = target_employee_id;
  end if;

  return NEW;
end;
$$;

-- When an employee email is set/changed, link to matching profile
create or replace function public.link_employee_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  matched_profile_id uuid;
begin
  normalized := public.normalize_email(NEW.email);

  if normalized is null then
    NEW.profile_id := null;
    return NEW;
  end if;

  select p.id into matched_profile_id
  from public.profiles p
  where public.normalize_email(p.email) = normalized
  limit 1;

  if matched_profile_id is not null then
    update public.employees
    set profile_id = null
    where profile_id = matched_profile_id and id is distinct from NEW.id;

    NEW.profile_id := matched_profile_id;
  else
    NEW.profile_id := null;
  end if;

  return NEW;
end;
$$;

drop trigger if exists profiles_link_employees on public.profiles;
create trigger profiles_link_employees
  after insert or update of email on public.profiles
  for each row execute function public.link_employees_to_profile();

drop trigger if exists employees_link_profile on public.employees;
create trigger employees_link_profile
  before insert or update of email on public.employees
  for each row execute function public.link_employee_to_profile();

-- Backfill existing rows
update public.employees e
set profile_id = p.id
from public.profiles p
where public.normalize_email(e.email) = public.normalize_email(p.email)
  and public.normalize_email(e.email) is not null
  and e.id = (
    select e2.id
    from public.employees e2
    where public.normalize_email(e2.email) = public.normalize_email(p.email)
    order by e2.active desc, e2.created_at asc
    limit 1
  );
