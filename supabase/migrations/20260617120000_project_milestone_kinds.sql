-- Expand milestone kinds: replace client_review with review and add business types.

update public.project_milestones
set kind = 'review'
where kind = 'client_review';

alter table public.project_milestones
  drop constraint if exists project_milestones_kind_check;

alter table public.project_milestones
  add constraint project_milestones_kind_check
  check (kind in (
    'submittal',
    'meeting',
    'presentation',
    'budget',
    'cost_proposal',
    'contract',
    'review',
    'permit',
    'delivery',
    'other'
  ));
