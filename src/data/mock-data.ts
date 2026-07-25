import { addDays, format } from "date-fns";

import { getWeekStart } from "@/lib/week";
import type {
  Allocation,
  AllocationCategory,
  CompanySettings,
  Employee,
  Project,
  TimeEntry,
} from "@/types";
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_JOB_ROLES,
  DEFAULT_LEAD_FOLLOW_UP_TYPES,
  DEFAULT_LEAD_STAGES,
} from "@/types";

export const companySettings: CompanySettings = {
  id: "settings-1",
  default_daily_capacity: 8,
  default_weekly_capacity: 40,
  workweek_start_day: "Monday",
  include_weekends: false,
  job_roles: [...DEFAULT_JOB_ROLES],
  departments: [...DEFAULT_DEPARTMENTS],
  class_codes: [],
  lead_stages: [...DEFAULT_LEAD_STAGES],
  lead_follow_up_types: [...DEFAULT_LEAD_FOLLOW_UP_TYPES],
};

export const employees: Employee[] = [
  {
    id: "emp-1",
    first_name: "Haipeng",
    last_name: "Zhu",
    role: "Senior Landscape Designer",
    email: "haipeng@zenlandscape.com",
    handle: "haipeng",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Design",
    active: true,
  },
  {
    id: "emp-2",
    first_name: "Rose",
    last_name: "Nguyen",
    role: "Design Department Manager",
    email: "rose@zenlandscape.com",
    handle: "rose",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Design",
    active: true,
  },
  {
    id: "emp-3",
    first_name: "Mike",
    last_name: "Johnson",
    role: "Landscape Architect",
    email: "mike@zenlandscape.com",
    handle: "mike",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Design",
    active: true,
  },
  {
    id: "emp-4",
    first_name: "Emily",
    last_name: "Larson",
    role: "Junior Landscape Designer",
    email: "emily@zenlandscape.com",
    handle: "emily",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Design",
    active: true,
  },
  {
    id: "emp-5",
    first_name: "Carlos",
    last_name: "Rivera",
    role: "Estimator",
    email: "carlos@zenlandscape.com",
    handle: "carlos",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Estimating",
    active: true,
  },
  {
    id: "emp-6",
    first_name: "Lily",
    last_name: "Chen",
    role: "Intern",
    email: "lily@zenlandscape.com",
    handle: "lily",
    weekly_capacity_hours: 40,
    daily_capacity_hours: 8,
    department: "Design",
    active: true,
  },
];

export const projects: Project[] = [
  {
    id: "proj-1",
    project_name: "Smith Residence",
    client_name: "Smith Family",
    department: "Design",
    phase: "Design Development",
    lead_employee_id: "emp-1",
    budgeted_design_hours: 120,
    target_completion_date: "2026-08-15",
    active: true,
  },
  {
    id: "proj-2",
    project_name: "Beacon Hill Park",
    client_name: "City Parks Dept",
    department: "Design",
    phase: "Construction Drawings",
    lead_employee_id: "emp-3",
    budgeted_design_hours: 200,
    target_completion_date: "2026-10-01",
    active: true,
  },
  {
    id: "proj-3",
    project_name: "Oak Tree Place",
    client_name: "Oak Tree LLC",
    department: "Design",
    phase: "Revisions",
    lead_employee_id: "emp-4",
    budgeted_design_hours: 80,
    target_completion_date: "2026-07-20",
    active: true,
  },
  {
    id: "proj-4",
    project_name: "ZEN Corporate HQ",
    client_name: "ZEN Landscape",
    department: "Design",
    phase: "Schematic Design",
    lead_employee_id: "emp-2",
    budgeted_design_hours: 160,
    target_completion_date: "2026-09-30",
    active: true,
  },
  {
    id: "proj-5",
    project_name: "Riverfront Development",
    client_name: "Riverfront Partners",
    department: "Design",
    phase: "Concept",
    lead_employee_id: "emp-3",
    budgeted_design_hours: 240,
    target_completion_date: "2027-01-15",
    active: true,
  },
  {
    id: "proj-6",
    project_name: "Maple Grove Residence",
    client_name: "Grove Family",
    department: "Estimating",
    phase: "Estimating",
    lead_employee_id: "emp-1",
    budgeted_design_hours: 60,
    target_completion_date: "2026-06-30",
    active: true,
  },
];

export const categories: AllocationCategory[] = [
  { id: "cat-1", name: "Design / Production", color: "#dbeafe", is_billable_default: true, sort_order: 1 },
  { id: "cat-2", name: "Project Management", color: "#dcfce7", is_billable_default: true, sort_order: 2 },
  { id: "cat-3", name: "Construction Support", color: "#fef3c7", is_billable_default: true, sort_order: 3 },
  { id: "cat-4", name: "Meetings / Client", color: "#e0e7ff", is_billable_default: true, sort_order: 4 },
  { id: "cat-5", name: "Revisions", color: "#fce7f3", is_billable_default: true, sort_order: 5 },
  { id: "cat-6", name: "Estimating Support", color: "#f3e8ff", is_billable_default: false, sort_order: 6 },
  { id: "cat-7", name: "Admin / Non-Billable", color: "#f1f5f9", is_billable_default: false, sort_order: 7 },
  { id: "cat-8", name: "Training / Development", color: "#ecfdf5", is_billable_default: false, sort_order: 8 },
  { id: "cat-9", name: "PTO / Unavailable", color: "#fee2e2", is_billable_default: false, sort_order: 9 },
];

function buildSeedAllocations(): Allocation[] {
  const weekStart = getWeekStart(new Date(), companySettings);
  const d = (offset: number) => format(addDays(weekStart, offset), "yyyy-MM-dd");

  return [
    { id: "alloc-1", employee_id: "emp-1", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(0), hours: 6, is_billable: true, phase: "Design Development" },
    { id: "alloc-2", employee_id: "emp-1", project_id: "proj-6", allocation_category_id: "cat-1", allocation_date: d(1), hours: 4, is_billable: true, phase: "Estimating" },
    { id: "alloc-3", employee_id: "emp-1", project_id: "proj-1", allocation_category_id: "cat-4", allocation_date: d(2), hours: 2, is_billable: true },
    { id: "alloc-4", employee_id: "emp-1", project_id: "proj-2", allocation_category_id: "cat-1", allocation_date: d(3), hours: 8, is_billable: true, phase: "Construction Drawings" },
    { id: "alloc-5", employee_id: "emp-1", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(4), hours: 6, is_billable: true },
    { id: "alloc-6", employee_id: "emp-2", project_id: "proj-4", allocation_category_id: "cat-2", allocation_date: d(0), hours: 4, is_billable: true },
    { id: "alloc-7", employee_id: "emp-2", project_id: "proj-4", allocation_category_id: "cat-4", allocation_date: d(1), hours: 3, is_billable: true },
    { id: "alloc-8", employee_id: "emp-2", project_id: null, allocation_category_id: "cat-7", allocation_date: d(2), hours: 2, is_billable: false, task_name: "Team Standup / Admin" },
    { id: "alloc-9", employee_id: "emp-2", project_id: "proj-5", allocation_category_id: "cat-2", allocation_date: d(3), hours: 5, is_billable: true },
    { id: "alloc-10", employee_id: "emp-2", project_id: "proj-4", allocation_category_id: "cat-1", allocation_date: d(4), hours: 6, is_billable: true },
    { id: "alloc-11", employee_id: "emp-3", project_id: "proj-2", allocation_category_id: "cat-1", allocation_date: d(0), hours: 8, is_billable: true },
    { id: "alloc-12", employee_id: "emp-3", project_id: "proj-2", allocation_category_id: "cat-1", allocation_date: d(1), hours: 8, is_billable: true },
    { id: "alloc-13", employee_id: "emp-3", project_id: "proj-5", allocation_category_id: "cat-1", allocation_date: d(2), hours: 4, is_billable: true, phase: "Concept" },
    { id: "alloc-14", employee_id: "emp-3", project_id: "proj-2", allocation_category_id: "cat-5", allocation_date: d(3), hours: 6, is_billable: true },
    { id: "alloc-15", employee_id: "emp-3", project_id: "proj-5", allocation_category_id: "cat-4", allocation_date: d(4), hours: 4, is_billable: true },
    { id: "alloc-16", employee_id: "emp-4", project_id: "proj-3", allocation_category_id: "cat-5", allocation_date: d(0), hours: 6, is_billable: true, phase: "Revisions" },
    { id: "alloc-17", employee_id: "emp-4", project_id: "proj-3", allocation_category_id: "cat-5", allocation_date: d(1), hours: 6, is_billable: true },
    { id: "alloc-18", employee_id: "emp-4", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(2), hours: 4, is_billable: true },
    { id: "alloc-19", employee_id: "emp-4", project_id: null, allocation_category_id: "cat-8", allocation_date: d(3), hours: 4, is_billable: false, task_name: "Software Training" },
    { id: "alloc-20", employee_id: "emp-4", project_id: "proj-3", allocation_category_id: "cat-1", allocation_date: d(4), hours: 5, is_billable: true },
    { id: "alloc-21", employee_id: "emp-5", project_id: "proj-2", allocation_category_id: "cat-3", allocation_date: d(0), hours: 6, is_billable: true },
    { id: "alloc-22", employee_id: "emp-5", project_id: "proj-2", allocation_category_id: "cat-3", allocation_date: d(1), hours: 6, is_billable: true },
    { id: "alloc-23", employee_id: "emp-5", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(2), hours: 4, is_billable: true },
    { id: "alloc-24", employee_id: "emp-5", project_id: "proj-6", allocation_category_id: "cat-6", allocation_date: d(3), hours: 4, is_billable: false },
    { id: "alloc-25", employee_id: "emp-5", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(4), hours: 6, is_billable: true },
    { id: "alloc-26", employee_id: "emp-6", project_id: "proj-1", allocation_category_id: "cat-1", allocation_date: d(0), hours: 4, is_billable: true },
    { id: "alloc-27", employee_id: "emp-6", project_id: "proj-4", allocation_category_id: "cat-1", allocation_date: d(1), hours: 4, is_billable: true },
    { id: "alloc-28", employee_id: "emp-6", project_id: null, allocation_category_id: "cat-8", allocation_date: d(2), hours: 4, is_billable: false, task_name: "Lunch & Learn" },
    { id: "alloc-29", employee_id: "emp-6", project_id: "proj-3", allocation_category_id: "cat-1", allocation_date: d(3), hours: 4, is_billable: true },
    { id: "alloc-30", employee_id: "emp-6", project_id: "proj-4", allocation_category_id: "cat-1", allocation_date: d(4), hours: 4, is_billable: true },
  ];
}

export const initialAllocations = buildSeedAllocations();

function buildSeedTimeEntries(): TimeEntry[] {
  return initialAllocations.map((a, index) => {
    const variance = index % 3 === 0 ? 0.5 : index % 3 === 1 ? 0 : 1;
    return {
      id: `time-${a.id}`,
      employee_id: a.employee_id,
      project_id: a.project_id,
      allocation_category_id: a.allocation_category_id,
      entry_date: a.allocation_date,
      hours: Math.max(0.25, Math.round((a.hours - variance) * 10) / 10),
      is_billable: a.is_billable,
      phase: a.phase,
      task_name: a.task_name,
    };
  });
}

export const initialTimeEntries = buildSeedTimeEntries();
