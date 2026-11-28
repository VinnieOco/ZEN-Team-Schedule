-- Client meeting notes uploaded on a project (PDF / Word). Passages are embedded so chat can answer from them.

create table if not exists public.project_meeting_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  file_name text not null,
  storage_path text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists project_meeting_documents_project_idx
  on public.project_meeting_documents (project_id, created_at desc);

create table if not exists public.project_meeting_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.project_meeting_documents (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  content text not null,
  ordinal integer not null,
  embedding extensions.vector(1536)
);

create index if not exists project_meeting_chunks_document_idx
  on public.project_meeting_chunks (document_id, ordinal);

alter table public.project_meeting_documents enable row level security;
alter table public.project_meeting_chunks enable row level security;

grant select, insert, update, delete on public.project_meeting_documents to authenticated;
grant select, insert, update, delete on public.project_meeting_chunks to authenticated;

drop policy if exists "project_meeting_documents_office" on public.project_meeting_documents;
create policy "project_meeting_documents_office" on public.project_meeting_documents
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

drop policy if exists "project_meeting_chunks_office" on public.project_meeting_chunks;
create policy "project_meeting_chunks_office" on public.project_meeting_chunks
  for all to authenticated
  using ((select public.is_office_user()))
  with check ((select public.is_office_user()));

create or replace function public.match_project_meeting_chunks(
  query_embedding extensions.vector(1536),
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  project_id uuid,
  project_name text,
  title text,
  content text,
  similarity float
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    c.project_id,
    p.project_name,
    d.title,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.project_meeting_chunks c
  join public.project_meeting_documents d on d.id = c.document_id
  join public.projects p on p.id = c.project_id
  where d.status = 'ready'
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_project_meeting_chunks(extensions.vector(1536), int) to authenticated;

insert into storage.buckets (id, name, public)
values ('meeting-notes', 'meeting-notes', false)
on conflict (id) do nothing;

drop policy if exists "meeting_notes_files_office_read" on storage.objects;
create policy "meeting_notes_files_office_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'meeting-notes'
    and (select public.is_office_user())
  );

drop policy if exists "meeting_notes_files_office_insert" on storage.objects;
create policy "meeting_notes_files_office_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meeting-notes'
    and (select public.is_office_user())
  );

drop policy if exists "meeting_notes_files_office_delete" on storage.objects;
create policy "meeting_notes_files_office_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meeting-notes'
    and (select public.is_office_user())
  );
