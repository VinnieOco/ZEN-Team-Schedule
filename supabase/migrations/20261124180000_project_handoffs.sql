-- Handoff workflows live on the parent project: the main scope, plus one
-- workflow per change order. Checklist edits stay on that project only.

create table if not exists public.handoff_workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  subject_kind text not null check (subject_kind in ('project', 'change_order')),
  subject_id uuid not null,
  created_at timestamptz not null default now(),
  unique (project_id, subject_kind, subject_id)
);

create table if not exists public.handoff_stages (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.handoff_workflows (id) on delete cascade,
  stage_key text not null,
  status text not null check (
    status in (
      'not_started',
      'open',
      'in_review',
      'accepted',
      'returned',
      'closed',
      'approved',
      'released'
    )
  ),
  sort_order integer not null,
  notes text not null default '',
  budget_amount numeric,
  schedule_text text not null default '',
  approval_url text not null default '',
  return_reason text not null default '',
  updated_at timestamptz not null default now(),
  unique (workflow_id, stage_key)
);

create table if not exists public.handoff_checklist_items (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.handoff_stages (id) on delete cascade,
  template_key text,
  label text not null,
  required boolean not null default false,
  state text not null default 'open' check (state in ('open', 'done', 'na')),
  na_reason text not null default '',
  hidden boolean not null default false,
  sort_order integer not null,
  updated_at timestamptz not null default now(),
  constraint handoff_items_label_not_empty check (char_length(trim(label)) > 0)
);

create table if not exists public.handoff_activity (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.handoff_stages (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_initials text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists handoff_stages_workflow_idx
  on public.handoff_stages (workflow_id, sort_order);

create index if not exists handoff_items_stage_idx
  on public.handoff_checklist_items (stage_id, sort_order);

create index if not exists handoff_activity_stage_idx
  on public.handoff_activity (stage_id, created_at desc);

drop trigger if exists handoff_stages_updated_at on public.handoff_stages;
create trigger handoff_stages_updated_at
  before update on public.handoff_stages
  for each row execute function public.set_updated_at();

alter table public.handoff_workflows enable row level security;
alter table public.handoff_stages enable row level security;
alter table public.handoff_checklist_items enable row level security;
alter table public.handoff_activity enable row level security;

drop policy if exists "handoff_workflows_select" on public.handoff_workflows;
drop policy if exists "handoff_workflows_write" on public.handoff_workflows;
create policy "handoff_workflows_select" on public.handoff_workflows
  for select to authenticated
  using ((select public.is_office_user()));
create policy "handoff_workflows_write" on public.handoff_workflows
  for all to authenticated
  using ((select public.is_manager_or_admin()))
  with check ((select public.is_manager_or_admin()));

drop policy if exists "handoff_stages_select" on public.handoff_stages;
drop policy if exists "handoff_stages_write" on public.handoff_stages;
create policy "handoff_stages_select" on public.handoff_stages
  for select to authenticated
  using ((select public.is_office_user()));
create policy "handoff_stages_write" on public.handoff_stages
  for all to authenticated
  using ((select public.is_manager_or_admin()))
  with check ((select public.is_manager_or_admin()));

drop policy if exists "handoff_items_select" on public.handoff_checklist_items;
drop policy if exists "handoff_items_write" on public.handoff_checklist_items;
create policy "handoff_items_select" on public.handoff_checklist_items
  for select to authenticated
  using ((select public.is_office_user()));
create policy "handoff_items_write" on public.handoff_checklist_items
  for all to authenticated
  using ((select public.is_manager_or_admin()))
  with check ((select public.is_manager_or_admin()));

drop policy if exists "handoff_activity_select" on public.handoff_activity;
drop policy if exists "handoff_activity_insert" on public.handoff_activity;
create policy "handoff_activity_select" on public.handoff_activity
  for select to authenticated
  using ((select public.is_office_user()));
create policy "handoff_activity_insert" on public.handoff_activity
  for insert to authenticated
  with check (
    (select public.is_manager_or_admin())
    and actor_user_id = auth.uid()
  );
