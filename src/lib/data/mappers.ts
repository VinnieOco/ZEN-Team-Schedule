import { normalizeCompanySettings } from "@/lib/team-options";
import { normalizeClientName } from "@/lib/clients";
import type {
  Allocation,
  AllocationCategory,
  Client,
  CompanySettings,
  Employee,
  Project,
  ClientNote,
  ProjectNote,
  ProjectMilestone,
  ProjectMilestoneKind,
  ScheduledProjectPhase,
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
  lead_estimator_id: string | null;
  budgeted_design_hours: number;
  estimated_construction_value: number | null;
  estimate_value: number | null;
  start_date: string | null;
  contract_date: string | null;
  target_completion_date: string | null;
  estimating_completion_date: string | null;
  scope_of_work: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  parent_project_id: string | null;
  is_change_order: boolean;
};

type ProjectNoteRow = {
  id: string;
  project_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  name: string;
  normalized_key: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type ClientNoteRow = {
  id: string;
  client_key: string;
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
  class_code: string | null;
};

type SettingsRow = {
  id: string;
  default_daily_capacity: number;
  default_weekly_capacity: number;
  workweek_start_day: string;
  include_weekends: boolean;
  job_roles?: string[] | null;
  departments?: string[] | null;
  class_codes?: string[] | null;
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
    lead_estimator_id: row.lead_estimator_id ?? undefined,
    budgeted_design_hours: Number(row.budgeted_design_hours),
    design_amount:
      row.estimated_construction_value != null
        ? Number(row.estimated_construction_value)
        : undefined,
    estimate_value: row.estimate_value != null ? Number(row.estimate_value) : undefined,
    start_date: row.start_date ?? undefined,
    contract_date: row.contract_date ?? undefined,
    target_completion_date: row.target_completion_date ?? undefined,
    estimating_completion_date: row.estimating_completion_date ?? undefined,
    scope_of_work: row.scope_of_work ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    active: row.active,
    parent_project_id: row.parent_project_id ?? undefined,
    is_change_order: row.is_change_order,
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

export function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    address: row.address?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    email: row.email?.trim() || undefined,
  };
}

export function clientToRow(client: Client) {
  return {
    id: client.id,
    name: client.name.trim(),
    normalized_key: normalizeClientName(client.name),
    address: client.address?.trim() || null,
    phone: client.phone?.trim() || null,
    email: client.email?.trim() || null,
  };
}

export function mapClientNote(row: ClientNoteRow): ClientNote {
  return {
    id: row.id,
    client_key: row.client_key,
    body: row.body,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function clientNoteToRow(note: ClientNote) {
  return {
    id: note.id,
    client_key: note.client_key.trim().toLowerCase(),
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
    class_code: row.class_code?.trim() || undefined,
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
    class_codes: Array.isArray(row.class_codes) ? row.class_codes.map(String) : [],
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
    lead_estimator_id: project.lead_estimator_id ?? null,
    budgeted_design_hours: project.budgeted_design_hours,
    estimated_construction_value: project.design_amount ?? null,
    estimate_value: project.estimate_value ?? null,
    start_date: project.start_date ?? null,
    contract_date: project.contract_date ?? null,
    target_completion_date: project.target_completion_date ?? null,
    estimating_completion_date: project.estimating_completion_date ?? null,
    scope_of_work: project.scope_of_work ?? null,
    address: project.address ?? null,
    phone: project.phone ?? null,
    email: project.email ?? null,
    notes: project.notes ?? null,
    active: project.active,
    parent_project_id: project.parent_project_id ?? null,
    is_change_order: project.is_change_order ?? false,
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
    class_code: entry.class_code?.trim() || null,
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
    class_codes: normalized.class_codes,
  };
}

type ScheduledProjectPhaseRow = {
  id: string;
  project_id: string;
  phase_key: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  budget_hours: number;
  budget_amount: number | null;
  linked_to_previous: boolean;
  notes: string | null;
};

export function mapScheduledProjectPhase(row: ScheduledProjectPhaseRow): ScheduledProjectPhase {
  return {
    id: row.id,
    project_id: row.project_id,
    phase_key: row.phase_key,
    sort_order: row.sort_order,
    start_date: row.start_date ?? undefined,
    end_date: row.end_date ?? undefined,
    budget_hours: Number(row.budget_hours),
    budget_amount: row.budget_amount != null ? Number(row.budget_amount) : undefined,
    linked_to_previous: row.linked_to_previous,
    notes: row.notes ?? undefined,
  };
}

export function scheduledProjectPhaseToRow(phase: ScheduledProjectPhase) {
  return {
    id: phase.id,
    project_id: phase.project_id,
    phase_key: phase.phase_key,
    sort_order: phase.sort_order,
    start_date: phase.start_date ?? null,
    end_date: phase.end_date ?? null,
    budget_hours: phase.budget_hours,
    budget_amount: phase.budget_amount ?? null,
    linked_to_previous: phase.linked_to_previous,
    notes: phase.notes?.trim() || null,
  };
}

type ProjectMilestoneRow = {
  id: string;
  project_id: string;
  title: string;
  milestone_date: string;
  kind: string;
  sort_order: number;
  notes: string | null;
};

const MILESTONE_KINDS = new Set([
  "submittal",
  "meeting",
  "presentation",
  "budget",
  "cost_proposal",
  "contract",
  "review",
  "permit",
  "delivery",
  "other",
]);

function normalizeMilestoneKind(kind: string): ProjectMilestoneKind {
  if (kind === "client_review") return "review";
  return MILESTONE_KINDS.has(kind) ? (kind as ProjectMilestoneKind) : "other";
}

export function mapProjectMilestone(row: ProjectMilestoneRow): ProjectMilestone {
  return {
    id: row.id,
    project_id: row.project_id,
    title: row.title,
    milestone_date: row.milestone_date,
    kind: normalizeMilestoneKind(row.kind),
    sort_order: row.sort_order,
    notes: row.notes ?? undefined,
  };
}

export function projectMilestoneToRow(milestone: ProjectMilestone) {
  return {
    id: milestone.id,
    project_id: milestone.project_id,
    title: milestone.title.trim(),
    milestone_date: milestone.milestone_date,
    kind: milestone.kind,
    sort_order: milestone.sort_order,
    notes: milestone.notes?.trim() || null,
  };
}
