-- Optional time-of-day for lead follow-ups (date remains the pipeline sync key).

alter table public.lead_follow_ups
  add column if not exists due_time time;
