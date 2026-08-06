-- Align RLS with app permissions (src/lib/auth/permissions.ts):
-- - Crew: schedule/time (own entries) + own todos; no CRM/pipeline/queue/project-detail APIs
-- - Projects SELECT stays open so crew can resolve schedule/timesheet project names
-- - Office (member): CRM/pipeline read+write; project notes; no project/settings schema writes
-- - Manager/admin: elevated writes already covered by is_manager_or_admin / is_admin

-- ---------------------------------------------------------------------------
-- Helpers (security definer to read profiles without RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_office_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('admin', 'manager', 'member')
  );
$$;

create or replace function public.can_view_all_todos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and app_role in ('admin', 'manager')
  );
$$;

revoke all on function public.is_office_user() from public;
revoke all on function public.can_view_all_todos() from public;
grant execute on function public.is_office_user() to authenticated;
grant execute on function public.can_view_all_todos() to authenticated;

-- ---------------------------------------------------------------------------
-- Pipeline / CRM (hidden from crew)
-- ---------------------------------------------------------------------------

drop policy if exists "leads_select" on public.leads;
drop policy if exists "leads_insert" on public.leads;
drop policy if exists "leads_update" on public.leads;
drop policy if exists "leads_delete" on public.leads;

create policy "leads_select" on public.leads
  for select to authenticated
  using ((select public.is_office_user()));

create policy "leads_insert" on public.leads
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "leads_update" on public.leads
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "leads_delete" on public.leads
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "lead_notes_select" on public.lead_notes;
drop policy if exists "lead_notes_insert" on public.lead_notes;
drop policy if exists "lead_notes_update" on public.lead_notes;
drop policy if exists "lead_notes_delete" on public.lead_notes;

create policy "lead_notes_select" on public.lead_notes
  for select to authenticated
  using ((select public.is_office_user()));

create policy "lead_notes_insert" on public.lead_notes
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "lead_notes_update" on public.lead_notes
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "lead_notes_delete" on public.lead_notes
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "lead_follow_ups_select" on public.lead_follow_ups;
drop policy if exists "lead_follow_ups_insert" on public.lead_follow_ups;
drop policy if exists "lead_follow_ups_update" on public.lead_follow_ups;
drop policy if exists "lead_follow_ups_delete" on public.lead_follow_ups;

create policy "lead_follow_ups_select" on public.lead_follow_ups
  for select to authenticated
  using ((select public.is_office_user()));

create policy "lead_follow_ups_insert" on public.lead_follow_ups
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "lead_follow_ups_update" on public.lead_follow_ups
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "lead_follow_ups_delete" on public.lead_follow_ups
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "estimates_select" on public.estimates;
drop policy if exists "estimates_insert" on public.estimates;
drop policy if exists "estimates_update" on public.estimates;
drop policy if exists "estimates_delete" on public.estimates;

create policy "estimates_select" on public.estimates
  for select to authenticated
  using ((select public.is_office_user()));

create policy "estimates_insert" on public.estimates
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "estimates_update" on public.estimates
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "estimates_delete" on public.estimates
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;

create policy "clients_select" on public.clients
  for select to authenticated
  using ((select public.is_office_user()));

create policy "clients_insert" on public.clients
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "clients_update" on public.clients
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "clients_delete" on public.clients
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "client_notes_select" on public.client_notes;
drop policy if exists "client_notes_insert" on public.client_notes;
drop policy if exists "client_notes_update" on public.client_notes;
drop policy if exists "client_notes_delete" on public.client_notes;

create policy "client_notes_select" on public.client_notes
  for select to authenticated
  using ((select public.is_office_user()));

create policy "client_notes_insert" on public.client_notes
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "client_notes_update" on public.client_notes
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "client_notes_delete" on public.client_notes
  for delete to authenticated
  using ((select public.is_office_user()));

-- ---------------------------------------------------------------------------
-- Queue / pipeline board state (viewQueue: office; editQueue: manager/admin)
-- ---------------------------------------------------------------------------

drop policy if exists "queue_project_stages_select" on public.queue_project_stages;
drop policy if exists "queue_memberships_select" on public.queue_memberships;
drop policy if exists "queue_column_positions_select" on public.queue_column_positions;

create policy "queue_project_stages_select" on public.queue_project_stages
  for select to authenticated
  using ((select public.is_office_user()));

create policy "queue_memberships_select" on public.queue_memberships
  for select to authenticated
  using ((select public.is_office_user()));

create policy "queue_column_positions_select" on public.queue_column_positions
  for select to authenticated
  using ((select public.is_office_user()));

-- ---------------------------------------------------------------------------
-- Projects: SELECT stays open (crew needs names on schedule/timesheets).
-- Project detail tables stay office-only. Writes remain manager/admin.
-- ---------------------------------------------------------------------------

drop policy if exists "project_notes_select" on public.project_notes;
drop policy if exists "project_notes_insert" on public.project_notes;
drop policy if exists "project_notes_update" on public.project_notes;
drop policy if exists "project_notes_delete" on public.project_notes;

create policy "project_notes_select" on public.project_notes
  for select to authenticated
  using ((select public.is_office_user()));

create policy "project_notes_insert" on public.project_notes
  for insert to authenticated
  with check ((select public.is_office_user()));

create policy "project_notes_update" on public.project_notes
  for update to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create policy "project_notes_delete" on public.project_notes
  for delete to authenticated
  using ((select public.is_office_user()));

drop policy if exists "project_phases_select" on public.project_phases;
create policy "project_phases_select" on public.project_phases
  for select to authenticated
  using ((select public.is_office_user()));

drop policy if exists "project_milestones_select" on public.project_milestones;
create policy "project_milestones_select" on public.project_milestones
  for select to authenticated
  using ((select public.is_office_user()));

-- ---------------------------------------------------------------------------
-- Time entries: office (incl. reports) see all; crew/member write already scoped;
-- crew select limited to linked employee (viewReports hidden)
-- ---------------------------------------------------------------------------

drop policy if exists "time_entries_select" on public.time_entries;
create policy "time_entries_select" on public.time_entries
  for select to authenticated
  using (
    (select public.is_office_user())
    or employee_id = (select public.current_employee_id())
  );

-- ---------------------------------------------------------------------------
-- Todos: admin/manager see all; member/crew see own assignee row only
-- ---------------------------------------------------------------------------

drop policy if exists "todos_select" on public.todos;
drop policy if exists "todos_insert" on public.todos;
drop policy if exists "todos_update" on public.todos;
drop policy if exists "todos_delete" on public.todos;

create policy "todos_select" on public.todos
  for select to authenticated
  using (
    (select public.can_view_all_todos())
    or employee_id = (select public.current_employee_id())
  );

create policy "todos_insert" on public.todos
  for insert to authenticated
  with check (
    (select public.can_view_all_todos())
    or employee_id = (select public.current_employee_id())
    or (
      (select public.is_office_user())
      and source_type = 'mention'
    )
  );

create policy "todos_update" on public.todos
  for update to authenticated
  using (
    (select public.can_view_all_todos())
    or employee_id = (select public.current_employee_id())
  )
  with check (
    (select public.can_view_all_todos())
    or employee_id = (select public.current_employee_id())
  );

create policy "todos_delete" on public.todos
  for delete to authenticated
  using (
    (select public.can_view_all_todos())
    or employee_id = (select public.current_employee_id())
    or (
      (select public.is_office_user())
      and source_type = 'mention'
    )
  );
