-- Class code on logged time (for time tracking).

alter table public.time_entries
  add column if not exists class_code text;
