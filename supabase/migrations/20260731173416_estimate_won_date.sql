-- Date the estimate package was won (set from the won dialog).
alter table public.estimates
  add column if not exists won_date date;

create index if not exists estimates_won_date_idx
  on public.estimates (won_date desc)
  where won_date is not null;
