-- Office Team can create and update projects, schedules, and handoffs.
-- Deleting a project stays limited to managers and admins.

drop policy if exists "projects_write_elevated" on public.projects;
drop policy if exists "projects_insert_office" on public.projects;
drop policy if exists "projects_update_office" on public.projects;
drop policy if exists "projects_delete_elevated" on public.projects;

create policy "projects_insert_office" on public.projects
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "projects_update_office" on public.projects
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "projects_delete_elevated" on public.projects
  for delete to authenticated
  using ((select public.is_manager_or_admin()));

drop policy if exists "project_phases_write" on public.project_phases;
create policy "project_phases_write" on public.project_phases
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "project_milestones_write" on public.project_milestones;
create policy "project_milestones_write" on public.project_milestones
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "handoff_workflows_write" on public.handoff_workflows;
create policy "handoff_workflows_write" on public.handoff_workflows
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "handoff_stages_write" on public.handoff_stages;
create policy "handoff_stages_write" on public.handoff_stages
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "handoff_items_write" on public.handoff_checklist_items;
create policy "handoff_items_write" on public.handoff_checklist_items
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "handoff_activity_insert" on public.handoff_activity;
create policy "handoff_activity_insert" on public.handoff_activity
  for insert to authenticated
  with check (
    (select public.is_office_user())
    and actor_user_id = (select auth.uid())
  );
