-- Project site contact info and align legacy notes with scope of work.

alter table public.projects
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text;

update public.projects
set scope_of_work = trim(notes)
where (scope_of_work is null or trim(scope_of_work) = '')
  and notes is not null
  and trim(notes) <> '';
