import { normalizeCompanySettings } from "@/lib/team-options";
import { normalizeClientName } from "@/lib/clients";
import type {
  Allocation,
  AllocationCategory,
  Client,
  CompanySettings,
  Employee,
  Estimate,
  EstimateChecklistItem,
  EstimateResult,
  EstimateStage,
  EstimateType,
  Lead,
  LeadFollowUp,
  LeadNote,
  LeadSource,
  Project,
  ClientNote,
  ProjectNote,
  ProjectMilestone,
  ProjectMilestoneKind,
  ScheduledProjectPhase,
  TimeEntry,
  Todo,
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
  handle: string | null;
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
  wip_cost_to_date: number | null;
  wip_estimated_cost_to_complete: number | null;
  wip_billings_to_date: number | null;
  wip_provision_for_loss: number | null;
  wip_prior_fy_revenue: number | null;
  wip_prior_fy_cost: number | null;
  wip_contract_price: number | null;
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
  timesheet_line_id: string | null;
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
  lead_stages?: unknown;
  lead_sources?: unknown;
  lead_follow_up_types?: unknown;
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
    handle: row.handle ?? undefined,
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
    wip_cost_to_date: row.wip_cost_to_date != null ? Number(row.wip_cost_to_date) : undefined,
    wip_estimated_cost_to_complete:
      row.wip_estimated_cost_to_complete != null
        ? Number(row.wip_estimated_cost_to_complete)
        : undefined,
    wip_billings_to_date:
      row.wip_billings_to_date != null ? Number(row.wip_billings_to_date) : undefined,
    wip_provision_for_loss:
      row.wip_provision_for_loss != null ? Number(row.wip_provision_for_loss) : undefined,
    wip_prior_fy_revenue:
      row.wip_prior_fy_revenue != null ? Number(row.wip_prior_fy_revenue) : undefined,
    wip_prior_fy_cost:
      row.wip_prior_fy_cost != null ? Number(row.wip_prior_fy_cost) : undefined,
    wip_contract_price:
      row.wip_contract_price != null ? Number(row.wip_contract_price) : undefined,
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

type TodoRow = {
  id: string;
  employee_id: string;
  body: string;
  status: string;
  completed_at: string | null;
  created_by: string | null;
  source_type: string;
  source_project_id: string | null;
  source_client_key: string | null;
  source_note_id: string | null;
  source_note_type: string | null;
  created_at: string;
  updated_at: string;
};

export function mapTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    employee_id: row.employee_id,
    body: row.body,
    status: row.status === "completed" ? "completed" : "open",
    completed_at: row.completed_at,
    created_by: row.created_by,
    source_type: row.source_type === "mention" ? "mention" : "manual",
    source_project_id: row.source_project_id,
    source_client_key: row.source_client_key,
    source_note_id: row.source_note_id,
    source_note_type:
      row.source_note_type === "project" || row.source_note_type === "client"
        ? row.source_note_type
        : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function todoToRow(todo: Todo) {
  return {
    id: todo.id,
    employee_id: todo.employee_id,
    body: todo.body.trim(),
    status: todo.status,
    completed_at: todo.completed_at ?? null,
    created_by: todo.created_by ?? null,
    source_type: todo.source_type,
    source_project_id: todo.source_project_id ?? null,
    source_client_key: todo.source_client_key ?? null,
    source_note_id: todo.source_note_id ?? null,
    source_note_type: todo.source_note_type ?? null,
    created_at: todo.created_at,
    updated_at: todo.updated_at,
  };
}

type LeadRow = {
  id: string;
  title: string | null;
  client_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  source: string;
  status: string;
  expected_value: number | null;
  probability: number | null;
  next_follow_up_date: string | null;
  owner_employee_id: string | null;
  notes: string | null;
  converted_project_id: string | null;
  created_at: string;
  updated_at: string;
};

type LeadNoteRow = {
  id: string;
  lead_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function mapLead(row: LeadRow): Lead {
  const rawSource = typeof row.source === "string" ? row.source.trim() : "";
  const source: LeadSource = rawSource || "other";
  const status =
    typeof row.status === "string" && row.status.trim() ? row.status.trim() : "new";
  return {
    id: row.id,
    title: row.title?.trim() || undefined,
    client_name: row.client_name,
    contact_name: row.contact_name?.trim() || undefined,
    contact_phone: row.contact_phone?.trim() || undefined,
    contact_email: row.contact_email?.trim() || undefined,
    address: row.address?.trim() || undefined,
    source,
    status,
    expected_value:
      row.expected_value != null && Number.isFinite(Number(row.expected_value))
        ? Number(row.expected_value)
        : undefined,
    probability:
      row.probability != null && Number.isFinite(Number(row.probability))
        ? Number(row.probability)
        : undefined,
    next_follow_up_date: row.next_follow_up_date ?? undefined,
    owner_employee_id: row.owner_employee_id ?? undefined,
    notes: row.notes?.trim() || undefined,
    converted_project_id: row.converted_project_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function leadToRow(lead: Lead) {
  return {
    id: lead.id,
    title: lead.title?.trim() || null,
    client_name: lead.client_name.trim(),
    contact_name: lead.contact_name?.trim() || null,
    contact_phone: lead.contact_phone?.trim() || null,
    contact_email: lead.contact_email?.trim() || null,
    address: lead.address?.trim() || null,
    source: lead.source,
    status: lead.status,
    expected_value: lead.expected_value ?? null,
    probability: lead.probability ?? null,
    next_follow_up_date: lead.next_follow_up_date || null,
    owner_employee_id: lead.owner_employee_id || null,
    notes: lead.notes?.trim() || null,
    converted_project_id: lead.converted_project_id || null,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
  };
}

export function mapLeadNote(row: LeadNoteRow): LeadNote {
  return {
    id: row.id,
    lead_id: row.lead_id,
    body: row.body,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function leadNoteToRow(note: LeadNote) {
  return {
    id: note.id,
    lead_id: note.lead_id,
    body: note.body.trim(),
    created_by: note.created_by ?? null,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

type LeadFollowUpRow = {
  id: string;
  lead_id: string;
  due_date: string;
  due_time: string | null;
  follow_up_type_id: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Normalize Postgres time / HH:mm:ss to HH:mm for time inputs. */
function normalizeDueTime(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return undefined;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function mapLeadFollowUp(row: LeadFollowUpRow): LeadFollowUp {
  return {
    id: row.id,
    lead_id: row.lead_id,
    due_date: row.due_date,
    due_time: normalizeDueTime(row.due_time),
    follow_up_type_id: row.follow_up_type_id?.trim() || undefined,
    completed: Boolean(row.completed),
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function leadFollowUpToRow(followUp: LeadFollowUp) {
  return {
    id: followUp.id,
    lead_id: followUp.lead_id,
    due_date: followUp.due_date,
    due_time: normalizeDueTime(followUp.due_time) ?? null,
    follow_up_type_id: followUp.follow_up_type_id?.trim() || null,
    completed: followUp.completed,
    completed_at: followUp.completed_at ?? null,
    created_at: followUp.created_at,
    updated_at: followUp.updated_at,
  };
}

type EstimateRow = {
  id: string;
  client_name: string;
  project_id: string | null;
  title: string | null;
  estimate_type: string;
  revision_number: number;
  revises_estimate_id: string | null;
  estimator_id: string | null;
  received_date: string | null;
  due_date: string | null;
  submitted_date: string | null;
  won_date: string | null;
  amount: number | null;
  stage: string;
  result: string;
  checklist: unknown;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const ESTIMATE_TYPE_VALUES = new Set([
  "budget",
  "cost_proposal",
  "contract",
  "change_order",
]);
const ESTIMATE_STAGE_VALUES = new Set([
  "backlog",
  "waiting_docs",
  "pricing",
  "submitted",
  "follow_up",
  "won",
  "lost",
]);
const ESTIMATE_RESULT_VALUES = new Set(["pending", "won", "lost"]);

function mapEstimateChecklist(value: unknown): EstimateChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as { id?: unknown; label?: unknown; done?: unknown };
    if (typeof item.id !== "string" || typeof item.label !== "string") return [];
    return [{ id: item.id, label: item.label, done: item.done === true }];
  });
}

export function mapEstimate(row: EstimateRow): Estimate {
  const estimateType = ESTIMATE_TYPE_VALUES.has(row.estimate_type)
    ? (row.estimate_type as EstimateType)
    : "budget";
  const stage = ESTIMATE_STAGE_VALUES.has(row.stage)
    ? (row.stage as EstimateStage)
    : "backlog";
  const result = ESTIMATE_RESULT_VALUES.has(row.result)
    ? (row.result as EstimateResult)
    : "pending";

  return {
    id: row.id,
    client_name: row.client_name,
    project_id: row.project_id ?? undefined,
    title: row.title?.trim() || undefined,
    estimate_type: estimateType,
    revision_number: Number.isFinite(Number(row.revision_number))
      ? Number(row.revision_number)
      : 0,
    revises_estimate_id: row.revises_estimate_id ?? undefined,
    estimator_id: row.estimator_id ?? undefined,
    received_date: row.received_date ?? undefined,
    due_date: row.due_date ?? undefined,
    submitted_date: row.submitted_date ?? undefined,
    won_date: row.won_date ?? undefined,
    amount:
      row.amount != null && Number.isFinite(Number(row.amount))
        ? Number(row.amount)
        : undefined,
    stage,
    result,
    checklist: mapEstimateChecklist(row.checklist),
    notes: row.notes?.trim() || undefined,
    sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function estimateToRow(estimate: Estimate) {
  return {
    id: estimate.id,
    client_name: estimate.client_name.trim(),
    project_id: estimate.project_id || null,
    title: estimate.title?.trim() || null,
    estimate_type: estimate.estimate_type,
    revision_number: estimate.revision_number,
    revises_estimate_id: estimate.revises_estimate_id || null,
    estimator_id: estimate.estimator_id || null,
    received_date: estimate.received_date || null,
    due_date: estimate.due_date || null,
    submitted_date: estimate.submitted_date || null,
    won_date: estimate.won_date || null,
    amount: estimate.amount ?? null,
    stage: estimate.stage,
    result: estimate.result,
    checklist: estimate.checklist,
    notes: estimate.notes?.trim() || null,
    sort_order: estimate.sort_order,
    created_at: estimate.created_at,
    updated_at: estimate.updated_at,
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
    timesheet_line_id: row.timesheet_line_id ?? undefined,
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
    lead_stages: row.lead_stages as CompanySettings["lead_stages"],
    lead_sources: row.lead_sources as CompanySettings["lead_sources"],
    lead_follow_up_types: row.lead_follow_up_types as CompanySettings["lead_follow_up_types"],
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
    handle: employee.handle ?? null,
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
    wip_cost_to_date: project.wip_cost_to_date ?? null,
    wip_estimated_cost_to_complete: project.wip_estimated_cost_to_complete ?? null,
    wip_billings_to_date: project.wip_billings_to_date ?? null,
    wip_provision_for_loss: project.wip_provision_for_loss ?? null,
    wip_prior_fy_revenue: project.wip_prior_fy_revenue ?? null,
    wip_prior_fy_cost: project.wip_prior_fy_cost ?? null,
    wip_contract_price: project.wip_contract_price ?? null,
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
    timesheet_line_id: entry.timesheet_line_id ?? null,
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
    lead_stages: normalized.lead_stages,
    lead_sources: normalized.lead_sources,
    lead_follow_up_types: normalized.lead_follow_up_types,
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
  pipeline_tag: string | null;
  completed_at: string | null;
  assigned_employee_id: string | null;
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

const MILESTONE_PIPELINE_TAGS = new Set(["design", "estimating", "construction"]);

function normalizeMilestoneKind(kind: string): ProjectMilestoneKind {
  if (kind === "client_review") return "review";
  return MILESTONE_KINDS.has(kind) ? (kind as ProjectMilestoneKind) : "other";
}

function normalizeMilestonePipelineTag(
  tag: string | null | undefined,
): ProjectMilestone["pipeline_tag"] {
  if (!tag) return undefined;
  return MILESTONE_PIPELINE_TAGS.has(tag)
    ? (tag as ProjectMilestone["pipeline_tag"])
    : undefined;
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
    pipeline_tag: normalizeMilestonePipelineTag(row.pipeline_tag),
    completed_at: row.completed_at ?? undefined,
    assigned_employee_id: row.assigned_employee_id ?? undefined,
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
    pipeline_tag: milestone.pipeline_tag ?? null,
    completed_at: milestone.completed_at ?? null,
    assigned_employee_id: milestone.assigned_employee_id ?? null,
  };
}
