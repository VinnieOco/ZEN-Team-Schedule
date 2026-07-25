-- Site / project address captured on a lead before a project exists.

alter table public.leads
  add column if not exists address text;
