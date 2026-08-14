-- WIP Schedule: enterable contract price incl. change orders (not derived from estimates).
alter table public.projects
  add column if not exists wip_contract_price numeric;

comment on column public.projects.wip_contract_price is
  'WIP Schedule: entered contract price including change orders';
