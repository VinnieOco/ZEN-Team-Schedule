-- Keep multiple timesheet lines for the same project as separate rows.

alter table public.time_entries
  add column if not exists timesheet_line_id uuid;

create index if not exists time_entries_timesheet_line_id_idx
  on public.time_entries (timesheet_line_id)
  where timesheet_line_id is not null;
