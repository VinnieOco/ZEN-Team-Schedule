-- Link to external client meeting notes document (shared drive / DMS).

alter table public.projects
  add column if not exists client_meeting_notes_url text;
