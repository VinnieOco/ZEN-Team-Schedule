-- SOP library for the in-app chat. Passages are embedded so a question can find the right section.

create extension if not exists vector with schema extensions;

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  content text not null,
  ordinal integer not null,
  embedding extensions.vector(1536)
);

create index if not exists knowledge_chunks_document_idx
  on public.knowledge_chunks (document_id, ordinal);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

drop policy if exists "knowledge_documents_read" on public.knowledge_documents;
create policy "knowledge_documents_read" on public.knowledge_documents
  for select to authenticated using (true);

drop policy if exists "knowledge_documents_admin_write" on public.knowledge_documents;
create policy "knowledge_documents_admin_write" on public.knowledge_documents
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  );

drop policy if exists "knowledge_chunks_read" on public.knowledge_chunks;
create policy "knowledge_chunks_read" on public.knowledge_chunks
  for select to authenticated using (true);

drop policy if exists "knowledge_chunks_admin_write" on public.knowledge_chunks;
create policy "knowledge_chunks_admin_write" on public.knowledge_chunks
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  );

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
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
    d.title,
    c.content,
    (1 - (c.embedding <=> query_embedding))::float as similarity
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where d.status = 'ready'
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_chunks(extensions.vector(1536), int) to authenticated;

insert into storage.buckets (id, name, public)
values ('knowledge', 'knowledge', false)
on conflict (id) do nothing;

drop policy if exists "knowledge_files_read" on storage.objects;
create policy "knowledge_files_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'knowledge');

drop policy if exists "knowledge_files_admin_insert" on storage.objects;
create policy "knowledge_files_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'knowledge'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  );

drop policy if exists "knowledge_files_admin_delete" on storage.objects;
create policy "knowledge_files_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'knowledge'
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and app_role = 'admin'
    )
  );
