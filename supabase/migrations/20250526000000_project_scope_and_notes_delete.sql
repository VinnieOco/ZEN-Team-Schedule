-- Project scope of work (editable by any authenticated user on detail page).

alter table public.projects
  add column if not exists scope_of_work text;

create or replace function public.update_project_scope_of_work(
  p_project_id uuid,
  p_scope_of_work text
)
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
    scope_of_work = nullif(trim(p_scope_of_work), ''),
    updated_at = now()
  where id = p_project_id
  returning * into result;

  if not found then
    raise exception 'Project not found';
  end if;

  return result;
end;
$$;

revoke all on function public.update_project_scope_of_work(uuid, text) from public;
grant execute on function public.update_project_scope_of_work(uuid, text) to authenticated;

-- Allow team members to delete project notes when editing.

drop policy if exists "project_notes_delete" on public.project_notes;
create policy "project_notes_delete" on public.project_notes
  for delete to authenticated using (true);
