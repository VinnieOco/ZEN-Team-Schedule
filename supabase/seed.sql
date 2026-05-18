-- ZEN Team Scheduling — seed data (re-runnable)
-- Allocations target the current ISO week (Monday–Friday)

insert into public.company_settings (
  id,
  default_daily_capacity,
  default_weekly_capacity,
  workweek_start_day,
  include_weekends,
  job_roles,
  departments
)
values (
  '00000000-0000-0000-0000-000000000001',
  8,
  40,
  'Monday',
  false,
  '[
    "Design Department Manager",
    "Senior Landscape Designer",
    "Landscape Architect",
    "Junior Landscape Designer",
    "Design Technician",
    "Intern",
    "Estimator",
    "Construction PM"
  ]'::jsonb,
  '["Design", "Estimating"]'::jsonb
)
on conflict (id) do update set
  default_daily_capacity = excluded.default_daily_capacity,
  default_weekly_capacity = excluded.default_weekly_capacity,
  workweek_start_day = excluded.workweek_start_day,
  include_weekends = excluded.include_weekends,
  job_roles = excluded.job_roles,
  departments = excluded.departments;

insert into public.employees (id, first_name, last_name, role, email, weekly_capacity_hours, daily_capacity_hours, department, active) values
  ('11111111-1111-1111-1111-111111111101', 'Haipeng', 'Zhu', 'Senior Landscape Designer', 'haipeng@zenlandscape.com', 40, 8, 'Design', true),
  ('11111111-1111-1111-1111-111111111102', 'Rose', 'Nguyen', 'Design Department Manager', 'rose@zenlandscape.com', 40, 8, 'Design', true),
  ('11111111-1111-1111-1111-111111111103', 'Mike', 'Johnson', 'Landscape Architect', 'mike@zenlandscape.com', 40, 8, 'Design', true),
  ('11111111-1111-1111-1111-111111111104', 'Emily', 'Larson', 'Junior Landscape Designer', 'emily@zenlandscape.com', 40, 8, 'Design', true),
  ('11111111-1111-1111-1111-111111111105', 'Carlos', 'Rivera', 'Estimator', 'carlos@zenlandscape.com', 40, 8, 'Estimating', true),
  ('11111111-1111-1111-1111-111111111106', 'Lily', 'Chen', 'Intern', 'lily@zenlandscape.com', 40, 8, 'Design', true)
on conflict (id) do nothing;

insert into public.projects (id, project_name, client_name, department, phase, lead_employee_id, budgeted_design_hours, target_completion_date, active) values
  ('22222222-2222-2222-2222-222222222201', 'Smith Residence', 'Smith Family', 'Design', 'Design Development', '11111111-1111-1111-1111-111111111101', 120, '2026-08-15', true),
  ('22222222-2222-2222-2222-222222222202', 'Beacon Hill Park', 'City Parks Dept', 'Design', 'Construction Documents', '11111111-1111-1111-1111-111111111103', 200, '2026-10-01', true),
  ('22222222-2222-2222-2222-222222222203', 'Oak Tree Place', 'Oak Tree LLC', 'Design', 'Revisions', '11111111-1111-1111-1111-111111111104', 80, '2026-07-20', true),
  ('22222222-2222-2222-2222-222222222204', 'ZEN Corporate HQ', 'ZEN Landscape', 'Design', 'Schematic Design', '11111111-1111-1111-1111-111111111102', 160, '2026-09-30', true),
  ('22222222-2222-2222-2222-222222222205', 'Riverfront Development', 'Riverfront Partners', 'Design', 'Concept', '11111111-1111-1111-1111-111111111103', 240, '2027-01-15', true),
  ('22222222-2222-2222-2222-222222222206', 'Maple Grove Residence', 'Grove Family', 'Estimating', 'Estimating', '11111111-1111-1111-1111-111111111101', 60, '2026-06-30', true)
on conflict (id) do nothing;

insert into public.allocation_categories (id, name, color, is_billable_default, sort_order) values
  ('33333333-3333-3333-3333-333333333301', 'Design / Production', '#dbeafe', true, 1),
  ('33333333-3333-3333-3333-333333333302', 'Project Management', '#dcfce7', true, 2),
  ('33333333-3333-3333-3333-333333333303', 'Construction Support', '#fef3c7', true, 3),
  ('33333333-3333-3333-3333-333333333304', 'Meetings / Client', '#e0e7ff', true, 4),
  ('33333333-3333-3333-3333-333333333305', 'Revisions', '#fce7f3', true, 5),
  ('33333333-3333-3333-3333-333333333306', 'Estimating Support', '#f3e8ff', false, 6),
  ('33333333-3333-3333-3333-333333333307', 'Admin / Non-Billable', '#f1f5f9', false, 7),
  ('33333333-3333-3333-3333-333333333308', 'Training / Development', '#ecfdf5', false, 8),
  ('33333333-3333-3333-3333-333333333309', 'PTO / Unavailable', '#fee2e2', false, 9)
on conflict (id) do nothing;

with week as (
  select date_trunc('week', current_date::timestamp)::date as mon
)
insert into public.allocations (
  id, employee_id, project_id, allocation_category_id, allocation_date, hours, is_billable, phase, task_name
)
select
  v.id::uuid,
  v.employee_id::uuid,
  v.project_id::uuid,
  v.category_id::uuid,
  w.mon + v.day_offset,
  v.hours,
  v.is_billable,
  v.phase,
  v.task_name
from week w
cross join (
  values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01'::text, '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 0, 6::numeric, true, 'Design Development', null::text),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333301', 1, 4, true, 'Estimating', null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333304', 2, 2, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa04', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 3, 8, true, 'Construction Documents', null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa05', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 4, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa06', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333302', 0, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', 1, 3, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa08', '11111111-1111-1111-1111-111111111102', null, '33333333-3333-3333-3333-333333333307', 2, 2, false, null, 'Team Standup / Admin'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa09', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333302', 3, 5, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa10', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 4, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa11', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 0, 8, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa12', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 1, 8, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa13', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333301', 2, 4, true, 'Concept', null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa14', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 3, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa15', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333304', 4, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa16', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333305', 0, 6, true, 'Revisions', null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa17', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333305', 1, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa18', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 2, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa19', '11111111-1111-1111-1111-111111111104', null, '33333333-3333-3333-3333-333333333308', 3, 4, false, null, 'Software Training'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa20', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333301', 4, 5, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa21', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333303', 0, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa22', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333303', 1, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa23', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 2, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa24', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333306', 3, 4, false, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa25', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 4, 6, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa26', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 0, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa27', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 1, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa28', '11111111-1111-1111-1111-111111111106', null, '33333333-3333-3333-3333-333333333308', 2, 4, false, null, 'Lunch & Learn'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa29', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333301', 3, 4, true, null, null),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa30', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 4, 4, true, null, null)
) as v(id, employee_id, project_id, category_id, day_offset, hours, is_billable, phase, task_name)
on conflict (id) do update set
  employee_id = excluded.employee_id,
  project_id = excluded.project_id,
  allocation_category_id = excluded.allocation_category_id,
  allocation_date = excluded.allocation_date,
  hours = excluded.hours,
  is_billable = excluded.is_billable,
  phase = excluded.phase,
  task_name = excluded.task_name;

-- Time entries (actual hours) — mirror current-week allocations with slight variance
with week as (
  select date_trunc('week', current_date::timestamp)::date as mon
)
insert into public.time_entries (
  id, employee_id, project_id, allocation_category_id, entry_date, hours, is_billable, phase, task_name
)
select
  v.id::uuid,
  v.employee_id::uuid,
  v.project_id::uuid,
  v.category_id::uuid,
  w.mon + v.day_offset,
  greatest(0.25::numeric, v.hours - v.variance),
  v.is_billable,
  v.phase,
  v.task_name
from week w
cross join (
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01'::text, '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 0, 6::numeric, 0.5::numeric, true, 'Design Development', null::text),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333301', 1, 4, 0, true, 'Estimating', null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333304', 2, 2, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 3, 8, 1, true, 'Construction Documents', null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 4, 6, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333302', 0, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb07', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333304', 1, 3, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb08', '11111111-1111-1111-1111-111111111102', null, '33333333-3333-3333-3333-333333333307', 2, 2, 0, false, null, 'Team Standup / Admin'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb09', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333302', 3, 5, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb10', '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 4, 6, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb11', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 0, 8, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb12', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333301', 1, 8, 1, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb13', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333301', 2, 4, 0, true, 'Concept', null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb14', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333305', 3, 6, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb15', '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222205', '33333333-3333-3333-3333-333333333304', 4, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb16', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333305', 0, 6, 0.5, true, 'Revisions', null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb17', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333305', 1, 6, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb18', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 2, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb19', '11111111-1111-1111-1111-111111111104', null, '33333333-3333-3333-3333-333333333308', 3, 4, 0, false, null, 'Software Training'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb20', '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333301', 4, 5, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb21', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333303', 0, 6, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb22', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222202', '33333333-3333-3333-3333-333333333303', 1, 6, 1, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb23', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 2, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb24', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222206', '33333333-3333-3333-3333-333333333306', 3, 4, 0, false, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb25', '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 4, 6, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb26', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222201', '33333333-3333-3333-3333-333333333301', 0, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb27', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 1, 4, 0.5, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb28', '11111111-1111-1111-1111-111111111106', null, '33333333-3333-3333-3333-333333333308', 2, 4, 0, false, null, 'Lunch & Learn'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb29', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222203', '33333333-3333-3333-3333-333333333301', 3, 4, 0, true, null, null),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb30', '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222204', '33333333-3333-3333-3333-333333333301', 4, 4, 0, true, null, null)
) as v(id, employee_id, project_id, category_id, day_offset, hours, variance, is_billable, phase, task_name)
on conflict (id) do update set
  employee_id = excluded.employee_id,
  project_id = excluded.project_id,
  allocation_category_id = excluded.allocation_category_id,
  entry_date = excluded.entry_date,
  hours = excluded.hours,
  is_billable = excluded.is_billable,
  phase = excluded.phase,
  task_name = excluded.task_name;
