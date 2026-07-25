export type UtilizationStatus = "under" | "healthy" | "near" | "over";

export type ProjectPhase =
  | "Concept"
  | "Schematic Design"
  | "Budgeting"
  | "Design Development"
  | "Construction Drawings"
  | "Construction Documents"
  | "Estimating"
  | "Revisions"
  | "Construction"
  | "Construction Support"
  | "Closeout";

export type EmployeeRole =
  | "Design Department Manager"
  | "Senior Landscape Designer"
  | "Landscape Architect"
  | "Junior Landscape Designer"
  | "Design Technician"
  | "Intern"
  | "Estimator"
  | "Construction PM";

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole | string;
  email?: string;
  /** Set when email matches an app login (profiles). */
  profile_id?: string;
  avatar_url?: string;
  weekly_capacity_hours: number;
  daily_capacity_hours: number;
  department?: string;
  active: boolean;
  default_billable_target?: number;
  start_date?: string;
  notes?: string;
  /** @mention handle, e.g. voliveira for @voliveira */
  handle?: string;
}

export interface Project {
  id: string;
  project_name: string;
  client_name: string;
  project_number?: string;
  department?: string;
  phase: ProjectPhase | string;
  lead_employee_id?: string;
  lead_estimator_id?: string;
  budgeted_design_hours: number;
  /** Design contract / fee amount (DB: estimated_construction_value). */
  design_amount?: number;
  /** Construction estimate amount (DB: estimate_value). */
  estimate_value?: number;
  start_date?: string;
  contract_date?: string;
  /** Design completion target (DB: target_completion_date). */
  target_completion_date?: string;
  estimating_completion_date?: string;
  scope_of_work?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  /** Parent project when this row is a change order. */
  parent_project_id?: string;
  is_change_order?: boolean;
}

/** Scheduled phase row for Gantt planning (one project has many). */
export interface ScheduledProjectPhase {
  id: string;
  project_id: string;
  phase_key: string;
  sort_order: number;
  start_date?: string;
  end_date?: string;
  budget_hours: number;
  budget_amount?: number;
  linked_to_previous: boolean;
  notes?: string;
}

export type ProjectMilestoneKind =
  | "submittal"
  | "meeting"
  | "presentation"
  | "budget"
  | "cost_proposal"
  | "contract"
  | "review"
  | "permit"
  | "delivery"
  | "other";

/** Single-date marker on a project Gantt (submittal, review, permit, etc.). */
export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  milestone_date: string;
  kind: ProjectMilestoneKind;
  sort_order: number;
  notes?: string;
  /** Set when marked complete on the firm milestones list. */
  completed_at?: string;
  /** Milestone-only assignee; does not change project lead. */
  assigned_employee_id?: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  body: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

/** CRM client registry entry (synced with project client_name by normalized key). */
export interface Client {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface ClientFormValues {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface ClientNote {
  id: string;
  /** Normalized client name (see normalizeClientName). */
  client_key: string;
  body: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type TodoStatus = "open" | "completed";
export type TodoSourceType = "manual" | "mention";
export type TodoNoteSourceType = "project" | "client";

export interface Todo {
  id: string;
  employee_id: string;
  body: string;
  status: TodoStatus;
  completed_at?: string | null;
  created_by?: string | null;
  source_type: TodoSourceType;
  source_project_id?: string | null;
  source_client_key?: string | null;
  source_note_id?: string | null;
  source_note_type?: TodoNoteSourceType | null;
  created_at: string;
  updated_at: string;
}

export type LeadSource = "architect" | "past_client" | "referral" | "web" | "other";
export type LeadStatus = "new" | "qualifying" | "proposal_sent" | "won" | "lost";

export interface Lead {
  id: string;
  /** Opportunity / job name (optional; falls back to client_name in UI). */
  title?: string;
  client_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  source: LeadSource;
  status: LeadStatus;
  expected_value?: number;
  probability?: number;
  next_follow_up_date?: string;
  owner_employee_id?: string;
  notes?: string;
  converted_project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  body: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadFormValues {
  title?: string;
  client_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  source: LeadSource;
  status: LeadStatus;
  expected_value?: number;
  probability?: number;
  next_follow_up_date?: string;
  owner_employee_id?: string;
  notes?: string;
}

export type EstimateType = "budget" | "cost_proposal" | "contract";
export type EstimateStage =
  | "backlog"
  | "waiting_docs"
  | "pricing"
  | "submitted"
  | "follow_up"
  | "won"
  | "lost";
export type EstimateResult = "pending" | "won" | "lost";

export interface EstimateChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

/** Estimate package for a client; revisions form a chain via revises_estimate_id. */
export interface Estimate {
  id: string;
  client_name: string;
  /** Optional link to the design/construction job this prices. */
  project_id?: string;
  /** Display name (optional; falls back to client_name in UI). */
  title?: string;
  estimate_type: EstimateType;
  /** 0 for the original package, incremented on each Revise. */
  revision_number: number;
  revises_estimate_id?: string;
  estimator_id?: string;
  received_date?: string;
  due_date?: string;
  /** Drives submitted-this-week $ metrics. */
  submitted_date?: string;
  amount?: number;
  stage: EstimateStage;
  result: EstimateResult;
  checklist: EstimateChecklistItem[];
  notes?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EstimateFormValues {
  client_name: string;
  project_id?: string;
  title?: string;
  estimate_type: EstimateType;
  estimator_id?: string;
  received_date?: string;
  due_date?: string;
  submitted_date?: string;
  amount?: number;
  stage: EstimateStage;
  notes?: string;
}

export interface AllocationCategory {
  id: string;
  name: string;
  color: string;
  is_billable_default: boolean;
  sort_order: number;
}

export interface Allocation {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  allocation_date: string;
  hours: number;
  is_billable: boolean;
  phase?: string;
  task_name?: string;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  entry_date: string;
  hours: number;
  is_billable: boolean;
  phase?: string;
  task_name?: string;
  notes?: string;
  /** Time-tracking class code (configured in Settings). */
  class_code?: string;
  /**
   * Groups day cells that belong to one timesheet line.
   * Lets the same project appear on multiple lines in a week.
   */
  timesheet_line_id?: string;
}

export interface CompanySettings {
  id: string;
  default_daily_capacity: number;
  default_weekly_capacity: number;
  workweek_start_day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  include_weekends: boolean;
  /** Configurable job titles for schedule team members. */
  job_roles: string[];
  /** Configurable departments for schedule team members. */
  departments: string[];
  /** Class codes for log-time timesheets. */
  class_codes: string[];
}

export interface EmployeeWeekStats {
  employeeId: string;
  scheduledHours: number;
  weeklyCapacity: number;
  utilizationPercent: number;
  billableHours: number;
  nonBillableHours: number;
  billablePercent: number;
  nonBillablePercent: number;
  status: UtilizationStatus;
}

export interface TeamSummaryStats {
  totalUtilizationPercent: number;
  billablePercent: number;
  nonBillablePercent: number;
  availablePercent: number;
}

export interface SchedulingFilters {
  search: string;
  /** Department key from listDepartmentsFromEmployees, or null for all. */
  department: string | null;
  projectId: string | null;
  categoryId: string | null;
  showHours: boolean;
  /** Show Saturday and Sunday columns in week/month schedule grids. */
  showWeekend: boolean;
  /** Hide members/projects with no allocations in the visible period (Schedule / By Project). */
  onlyWithAllocations: boolean;
}

export interface CategoryFormValues {
  name: string;
  color: string;
  is_billable_default: boolean;
}

export interface AllocationFormValues {
  employee_id: string;
  project_id: string | null;
  task_name: string;
  allocation_date: string;
  hours: number;
  allocation_category_id: string;
  is_billable: boolean;
  phase?: string;
  notes?: string;
}

export interface TimeEntryFormValues {
  employee_id: string;
  project_id: string | null;
  task_name: string;
  entry_date: string;
  hours: number;
  allocation_category_id: string;
  is_billable: boolean;
  phase?: string;
  notes?: string;
  class_code?: string;
  timesheet_line_id?: string;
}

export interface EmployeeWeekTimeStats {
  employeeId: string;
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
}

export interface TeamTimeSummary {
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
  matchPercent: number;
}

export interface ProjectFormValues {
  project_name: string;
  client_name: string;
  department?: string;
  phase: string;
  lead_employee_id?: string;
  lead_estimator_id?: string;
  budgeted_design_hours: number;
  contract_date?: string;
  target_completion_date?: string;
  estimating_completion_date?: string;
  design_amount?: number;
  estimate_value?: number;
  scope_of_work?: string;
  address?: string;
  phone?: string;
  email?: string;
  active?: boolean;
  parent_project_id?: string;
  is_change_order?: boolean;
}

export interface EmployeeFormValues {
  first_name: string;
  last_name: string;
  role: string;
  email?: string;
  handle?: string;
  department?: string;
  daily_capacity_hours: number;
  weekly_capacity_hours: number;
  active: boolean;
}

export const DEFAULT_JOB_ROLES: string[] = [
  "Design Department Manager",
  "Senior Landscape Designer",
  "Landscape Architect",
  "Junior Landscape Designer",
  "Design Technician",
  "Intern",
  "Estimator",
  "Construction PM",
];

export const DEFAULT_DEPARTMENTS: string[] = ["Design", "Estimating"];

/** @deprecated Use settings.job_roles or DEFAULT_JOB_ROLES */
export const EMPLOYEE_ROLE_OPTIONS: EmployeeRole[] = DEFAULT_JOB_ROLES as EmployeeRole[];
