-- Pipeline stage tags on project milestones (Design / Estimating / Construction).
-- Used to surface the latest tagged date on Pipeline Design and Estimating tables.

alter table public.project_milestones
  add column if not exists pipeline_tag text;

alter table public.project_milestones
  drop constraint if exists project_milestones_pipeline_tag_check;

alter table public.project_milestones
  add constraint project_milestones_pipeline_tag_check
  check (
    pipeline_tag is null
    or pipeline_tag in ('design', 'estimating', 'construction')
  );

create index if not exists project_milestones_project_pipeline_tag_date_idx
  on public.project_milestones (project_id, pipeline_tag, milestone_date desc);
