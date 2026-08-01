import type {
  Allocation,
  Estimate,
  Lead,
  Project,
  ProjectMilestone,
  ProjectNote,
  ScheduledProjectPhase,
  TimeEntry,
  Todo,
} from "@/types";

export type ProjectMergeValidation =
  | { ok: false; message: string }
  | { ok: true; source: Project; target: Project };

export type ProjectMergeActionResult =
  | { ok: true; targetId: string; targetName: string }
  | { ok: false; message: string };

export interface ProjectMergeImpact {
  allocations: number;
  timeEntries: number;
  notes: number;
  estimates: number;
  todos: number;
  changeOrders: number;
  leads: number;
  phases: number;
  milestones: number;
}

export function validateProjectMerge(
  sourceId: string,
  targetId: string,
  projects: Project[],
): ProjectMergeValidation {
  const source = projects.find((p) => p.id === sourceId);
  const target = projects.find((p) => p.id === targetId);

  if (!source) return { ok: false, message: "Source project not found." };
  if (!target) return { ok: false, message: "Select a project to merge into." };
  if (source.id === target.id) {
    return { ok: false, message: "Cannot merge a project with itself." };
  }

  return { ok: true, source, target };
}

export function countProjectMergeImpact(
  sourceId: string,
  projects: Project[],
  allocations: Allocation[],
  timeEntries: TimeEntry[],
  projectNotes: ProjectNote[],
  estimates: Estimate[],
  todos: Todo[],
  leads: Lead[],
  projectPhases: ScheduledProjectPhase[],
  projectMilestones: ProjectMilestone[],
): ProjectMergeImpact {
  return {
    allocations: allocations.filter((a) => a.project_id === sourceId).length,
    timeEntries: timeEntries.filter((e) => e.project_id === sourceId).length,
    notes: projectNotes.filter((n) => n.project_id === sourceId).length,
    estimates: estimates.filter((e) => e.project_id === sourceId).length,
    todos: todos.filter((t) => t.source_project_id === sourceId).length,
    changeOrders: projects.filter((p) => p.parent_project_id === sourceId).length,
    leads: leads.filter((l) => l.converted_project_id === sourceId).length,
    phases: projectPhases.filter((p) => p.project_id === sourceId).length,
    milestones: projectMilestones.filter((m) => m.project_id === sourceId).length,
  };
}

function pickText(preferred?: string, fallback?: string): string | undefined {
  const a = preferred?.trim();
  if (a) return preferred;
  const b = fallback?.trim();
  if (b) return fallback;
  return undefined;
}

function sumOptional(a?: number, b?: number): number | undefined {
  const hasA = a != null && Number.isFinite(a);
  const hasB = b != null && Number.isFinite(b);
  if (!hasA && !hasB) return undefined;
  return (hasA ? (a as number) : 0) + (hasB ? (b as number) : 0);
}

/** Keep target identity; fill blanks from source; sum budget / fee fields. */
export function buildMergedTargetProject(source: Project, target: Project): Project {
  const parentId =
    target.parent_project_id === source.id ? undefined : target.parent_project_id;

  return {
    ...target,
    parent_project_id: parentId,
    is_change_order: parentId ? target.is_change_order : false,
    project_number: pickText(target.project_number, source.project_number),
    department: pickText(target.department, source.department),
    lead_employee_id: pickText(target.lead_employee_id, source.lead_employee_id),
    lead_estimator_id: pickText(target.lead_estimator_id, source.lead_estimator_id),
    start_date: pickText(target.start_date, source.start_date),
    contract_date: pickText(target.contract_date, source.contract_date),
    target_completion_date: pickText(
      target.target_completion_date,
      source.target_completion_date,
    ),
    estimating_completion_date: pickText(
      target.estimating_completion_date,
      source.estimating_completion_date,
    ),
    scope_of_work: pickText(target.scope_of_work, source.scope_of_work),
    address: pickText(target.address, source.address),
    phone: pickText(target.phone, source.phone),
    email: pickText(target.email, source.email),
    notes: pickText(target.notes, source.notes),
    budgeted_design_hours:
      (Number.isFinite(target.budgeted_design_hours) ? target.budgeted_design_hours : 0) +
      (Number.isFinite(source.budgeted_design_hours) ? source.budgeted_design_hours : 0),
    design_amount: sumOptional(target.design_amount, source.design_amount),
    estimate_value: sumOptional(target.estimate_value, source.estimate_value),
    active: target.active || source.active,
  };
}

export interface ProjectMergeStateInput {
  projects: Project[];
  allocations: Allocation[];
  timeEntries: TimeEntry[];
  projectNotes: ProjectNote[];
  estimates: Estimate[];
  todos: Todo[];
  leads: Lead[];
  projectPhases: ScheduledProjectPhase[];
  projectMilestones: ProjectMilestone[];
}

export interface ProjectMergeStateResult extends ProjectMergeStateInput {
  mergedTarget: Project;
}

/** Pure in-memory merge: re-point related rows, drop source schedule, delete source. */
export function applyProjectMergeState(
  input: ProjectMergeStateInput,
  sourceId: string,
  targetId: string,
): ProjectMergeStateResult {
  const source = input.projects.find((p) => p.id === sourceId);
  const target = input.projects.find((p) => p.id === targetId);
  if (!source || !target) {
    throw new Error("Source or target project missing.");
  }

  const mergedTarget = buildMergedTargetProject(source, target);

  const projects = input.projects
    .filter((p) => p.id !== sourceId)
    .map((p) => {
      if (p.id === targetId) return mergedTarget;
      if (p.parent_project_id === sourceId) {
        return { ...p, parent_project_id: targetId, is_change_order: true };
      }
      return p;
    });

  return {
    mergedTarget,
    projects,
    allocations: input.allocations.map((a) =>
      a.project_id === sourceId ? { ...a, project_id: targetId } : a,
    ),
    timeEntries: input.timeEntries.map((e) =>
      e.project_id === sourceId ? { ...e, project_id: targetId } : e,
    ),
    projectNotes: input.projectNotes.map((n) =>
      n.project_id === sourceId ? { ...n, project_id: targetId } : n,
    ),
    estimates: input.estimates.map((e) =>
      e.project_id === sourceId ? { ...e, project_id: targetId } : e,
    ),
    todos: input.todos.map((t) =>
      t.source_project_id === sourceId ? { ...t, source_project_id: targetId } : t,
    ),
    leads: input.leads.map((l) =>
      l.converted_project_id === sourceId
        ? { ...l, converted_project_id: targetId }
        : l,
    ),
    projectPhases: input.projectPhases.filter((p) => p.project_id !== sourceId),
    projectMilestones: input.projectMilestones.filter((m) => m.project_id !== sourceId),
  };
}
