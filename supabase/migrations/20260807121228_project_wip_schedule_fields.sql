-- WIP schedule entry fields for construction accounting (entered; formulas compute the rest).
alter table public.projects
  add column if not exists wip_cost_to_date numeric,
  add column if not exists wip_estimated_cost_to_complete numeric,
  add column if not exists wip_billings_to_date numeric,
  add column if not exists wip_provision_for_loss numeric,
  add column if not exists wip_prior_fy_revenue numeric,
  add column if not exists wip_prior_fy_cost numeric;

comment on column public.projects.wip_cost_to_date is 'WIP Schedule: actual cost incurred to date';
comment on column public.projects.wip_estimated_cost_to_complete is 'WIP Schedule: remaining estimated cost to finish';
comment on column public.projects.wip_billings_to_date is 'WIP Schedule: amount billed to client to date';
comment on column public.projects.wip_provision_for_loss is 'WIP Schedule: optional provision for loss';
comment on column public.projects.wip_prior_fy_revenue is 'WIP Schedule: revenue recognized in prior fiscal years';
comment on column public.projects.wip_prior_fy_cost is 'WIP Schedule: cost recognized in prior fiscal years';
