import { normalizeCompanySettings } from "@/lib/team-options";
import type {
  Allocation,
  AllocationCategory,
  CompanySettings,
  Employee,
  Project,
  ProjectNote,
  TimeEntry,
} from "@/types";

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  email: string | null;
  profile_id: string | null;
  avatar_url: string | null;
  weekly_capacity_hours: number;
  daily_capacity_hours: number;
  department: string | null;
  active: boolean;
};

type ProjectRow = {
  id: string;
  project_name: string;
  client_name: string;
  project_number: string | null;
  status: string | null;
  department: string | null;
  phase: string;
  lead_employee_id: string | null;
  budgeted_design_hours: number;
  estimated_construction_value: number | null;
  start_date: string | null;
  contract_date: string | null;
  target_completion_date: string | null;
  scope_of_work: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
};

type ProjectNoteRow = {
  id: string;
  project_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  is_billable_default: boolean;
  sort_order: number;
};

type AllocationRow = {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  allocation_date: string;
  hours: number;
  is_billable: boolean;
  phase: string | null;
  task_name: string | null;
  notes: string | null;
};

type TimeEntryRow = {
  id: string;
  employee_id: string;
  project_id: string | null;
  allocation_category_id: string;
  entry_date: string;
  hours: number;
  is_billable: boolean;
  phase: string | null;
  task_name: string | null;
  notes: string | null;
};

type SettingsRow = {
  id: string;
  default_daily_capacity: number;
  default_weekly_capacity: number;
  workweek_start_day: string;
  include_weekends: boolean;
  job_roles?: string[] | null;
  departments?: string[] | null;
};

export function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    email: row.email ?? undefined,
    profile_id: row.profile_id ?? undefined,
    avatar_url: row.avatar_url ?? undefined,
    weekly_capacity_hours: Number(row.weekly_capacity_hours),
    daily_capacity_hours: Number(row.daily_capacity_hours),
    department: row.department ?? undefined,
    active: row.active,
  };
}

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    project_name: row.project_name,
    client_name: row.client_name,
    project_number: row.project_number ?? undefined,
    department: row.department?.trim() || undefined,
    phase: row.phase,
    lead_employee_id: row.lead_employee_id ?? undefined,
    budgeted_design_hours: Number(row.budgeted_design_hours),
    project_amount:
      row.estimated_construction_value != null
        ? Number(row.estimated_construction_value)
        : undefined,
    estimated_construction_value: row.estimated_construction_value ?? undefined,
    start_date: row.start_date ?? undefined,
    contract_date: row.contract_date ?? undefined,
    target_completion_date: row.target_completion_date ?? undefined,
    scope_of_work: row.scope_of_work ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
  };
}

export function mapProjectNote(row: ProjectNoteRow): ProjectNote {
  return {
    id: row.id,
    project_id: row.project_id,
    body: row.body,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function projectNoteToRow(note: ProjectNote) {
  return {
    id: note.id,
    project_id: note.project_id,
    body: note.body.trim(),
    created_by: note.created_by ?? null,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

export function mapCategory(row: CategoryRow): AllocationCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    is_billable_default: row.is_billable_default,
    sort_order: row.sort_order,
  };
}

export function mapAllocation(row: AllocationRow): Allocation {
  return {
    id: row.id,
    employee_id: row.employee_id,
    project_id: row.project_id,
    allocation_category_id: row.allocation_category_id,
    allocation_date: row.allocation_date,
    hours: Number(row.hours),
    is_billable: row.is_billable,
    phase: row.phase ?? undefined,
    task_name: row.task_name ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapTimeEntry(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    employee_id: row.employee_id,
    project_id: row.project_id,
    allocation_category_id: row.allocation_category_id,
    entry_date: row.entry_date,
    hours: Number(row.hours),
    is_billable: row.is_billable,
    phase: row.phase ?? undefined,
    task_name: row.task_name ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapSettings(row: SettingsRow): CompanySettings {
  return normalizeCompanySettings({
    id: row.id,
    default_daily_capacity: Number(row.default_daily_capacity),
    default_weekly_capacity: Number(row.default_weekly_capacity),
    workweek_start_day: row.workweek_start_day as CompanySettings["workweek_start_day"],
    include_weekends: row.include_weekends,
    job_roles: Array.isArray(row.job_roles) ? row.job_roles.map(String) : [],
    departments: Array.isArray(row.departments) ? row.departments.map(String) : [],
  });
}

export function employeeToRow(employee: Employee) {
  return {
    id: employee.id,
    first_name: employee.first_name,
    last_name: employee.last_name,
    role: employee.role,
    email: employee.email ?? null,
    profile_id: employee.profile_id ?? null,
    avatar_url: employee.avatar_url ?? null,
    weekly_capacity_hours: employee.weekly_capacity_hours,
    daily_capacity_hours: employee.daily_capacity_hours,
    department: employee.department ?? null,
    active: employee.active,
  };
}

export function projectToRow(project: Project) {
  return {
    id: project.id,
    project_name: project.project_name,
    client_name: project.client_name,
    project_number: project.project_number ?? null,
    status: null,
    department: project.department?.trim() || null,
    phase: project.phase,
    lead_employee_id: project.lead_employee_id ?? null,
    budgeted_design_hours: project.budgeted_design_hours,
    estimated_construction_value: project.project_amount ?? project.estimated_construction_value ?? null,
    start_date: project.start_date ?? null,
    contract_date: project.contract_date ?? null,
    target_completion_date: project.target_completion_date ?? null,
    scope_of_work: project.scope_of_work ?? null,
    address: project.address ?? null,
    phone: project.phone ?? null,
    email: project.email ?? null,
    notes: project.notes ?? null,
    active: project.active,
  };
}

export function categoryToRow(category: AllocationCategory) {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    is_billable_default: category.is_billable_default,
    sort_order: category.sort_order,
  };
}

export function allocationToRow(allocation: Allocation) {
  return {
    id: allocation.id,
    employee_id: allocation.employee_id,
    project_id: allocation.project_id,
    allocation_category_id: allocation.allocation_category_id,
    allocation_date: allocation.allocation_date,
    hours: allocation.hours,
    is_billable: allocation.is_billable,
    phase: allocation.phase ?? null,
    task_name: allocation.task_name ?? null,
    notes: allocation.notes ?? null,
  };
}

export function timeEntryToRow(entry: TimeEntry) {
  return {
    id: entry.id,
    employee_id: entry.employee_id,
    project_id: entry.project_id,
    allocation_category_id: entry.allocation_category_id,
    entry_date: entry.entry_date,
    hours: entry.hours,
    is_billable: entry.is_billable,
    phase: entry.phase ?? null,
    task_name: entry.task_name ?? null,
    notes: entry.notes ?? null,
  };
}

export function settingsToRow(settings: CompanySettings) {
  const normalized = normalizeCompanySettings(settings);
  return {
    id: normalized.id,
    default_daily_capacity: normalized.default_daily_capacity,
    default_weekly_capacity: normalized.default_weekly_capacity,
    workweek_start_day: normalized.workweek_start_day,
    include_weekends: normalized.include_weekends,
    job_roles: normalized.job_roles,
    departments: normalized.departments,
  };
}
