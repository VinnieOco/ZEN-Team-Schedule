-- Any authenticated team member can update project notes (shared team field).

create or replace function public.update_project_notes(p_project_id uuid, p_notes text)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.projects;
begin
  update public.projects
  set
    notes = nullif(trim(p_notes), ''),
    updated_at = now()
  where id = p_project_id
  returning * into result;

  if not found then
    raise exception 'Project not found';
  end if;

  return result;
end;
$$;

revoke all on function public.update_project_notes(uuid, text) from public;
grant execute on function public.update_project_notes(uuid, text) to authenticated;
