-- Track when firm/project milestones are marked complete.

alter table public.project_milestones
  add column if not exists completed_at timestamptz;

create index if not exists project_milestones_completed_at_idx
  on public.project_milestones (completed_at desc nulls last);
