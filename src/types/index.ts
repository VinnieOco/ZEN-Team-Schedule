export type UtilizationStatus = "under" | "healthy" | "near" | "over";

export type ProjectStatus =
  | "Lead"
  | "Proposal"
  | "Active Design"
  | "Estimating"
  | "Client Review"
  | "Construction Documents"
  | "Permit / Approvals"
  | "Construction Support"
  | "On Hold"
  | "Completed"
  | "Lost / Cancelled";

export type ProjectPhase =
  | "Concept"
  | "Schematic Design"
  | "Design Development"
  | "Construction Documents"
  | "Estimating"
  | "Revisions"
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
}

export interface Project {
  id: string;
  project_name: string;
  client_name: string;
  project_number?: string;
  status: ProjectStatus | string;
  phase: ProjectPhase | string;
  lead_employee_id?: string;
  budgeted_design_hours: number;
  estimated_construction_value?: number;
  start_date?: string;
  target_completion_date?: string;
  notes?: string;
  active: boolean;
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
}

export interface CompanySettings {
  id: string;
  default_daily_capacity: number;
  default_weekly_capacity: number;
  workweek_start_day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  include_weekends: boolean;
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
  status: string;
  phase: string;
  lead_employee_id?: string;
  budgeted_design_hours: number;
  target_completion_date?: string;
  project_number?: string;
  notes?: string;
}

export interface EmployeeFormValues {
  first_name: string;
  last_name: string;
  role: string;
  email?: string;
  department?: string;
  daily_capacity_hours: number;
  weekly_capacity_hours: number;
  active: boolean;
}

export const EMPLOYEE_ROLE_OPTIONS: EmployeeRole[] = [
  "Design Department Manager",
  "Senior Landscape Designer",
  "Landscape Architect",
  "Junior Landscape Designer",
  "Design Technician",
  "Intern",
  "Estimator",
  "Construction PM",
];
