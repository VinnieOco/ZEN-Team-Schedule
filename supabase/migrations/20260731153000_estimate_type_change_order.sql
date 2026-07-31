-- Allow Change order as an estimate package type.

alter table public.estimates drop constraint if exists estimates_estimate_type_check;

alter table public.estimates
  add constraint estimates_estimate_type_check
  check (estimate_type in ('budget', 'cost_proposal', 'contract', 'change_order'));
