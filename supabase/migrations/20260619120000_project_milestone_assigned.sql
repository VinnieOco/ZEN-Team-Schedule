-- Per-milestone assignee (independent of project lead).

alter table public.project_milestones
  add column if not exists assigned_employee_id uuid references public.employees (id) on delete set null;

create index if not exists project_milestones_assigned_employee_id_idx
  on public.project_milestones (assigned_employee_id);
