import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { summarizeContracts } from "@/lib/project-contracts";
import { estimateDisplayName } from "@/lib/estimating/metrics";
import { getProjectActualHours } from "@/lib/utilization";
import type { Estimate, EstimateFormValues, Project, ProjectFormValues, TimeEntry } from "@/types";

export function isChangeOrder(project: Pick<Project, "is_change_order" | "parent_project_id">): boolean {
  return Boolean(project.is_change_order || project.parent_project_id);
}

export function isParentProject(project: Pick<Project, "is_change_order" | "parent_project_id">): boolean {
  return !isChangeOrder(project);
}

export function getChangeOrdersForParent(projects: Project[], parentId: string): Project[] {
  return projects
    .filter((p) => p.parent_project_id === parentId)
    .sort((a, b) => a.project_name.localeCompare(b.project_name));
}

/** Linked change-order estimate packages for a project. */
export function getChangeOrderEstimatesForProject(
  estimates: Estimate[],
  projectId: string,
  options?: { wonOnly?: boolean },
): Estimate[] {
  const wonOnly = options?.wonOnly ?? true;
  return estimates
    .filter((estimate) => {
      if (estimate.project_id !== projectId || estimate.estimate_type !== "change_order") {
        return false;
      }
      if (!wonOnly) return true;
      return changeOrderCountsTowardEstimate(estimate);
    })
    .sort((a, b) => {
      const aDate = a.won_date ?? a.submitted_date ?? a.updated_at;
      const bDate = b.won_date ?? b.submitted_date ?? b.updated_at;
      return bDate.localeCompare(aDate);
    });
}

/** Only won change orders count toward project Estimate amount / won section. */
export function changeOrderCountsTowardEstimate(estimate: Estimate): boolean {
  return estimate.result === "won" || estimate.stage === "won";
}

function isLostChangeOrder(estimate: Estimate): boolean {
  return estimate.result === "lost" || estimate.stage === "lost";
}

/**
 * Open change-order packages for a project (not won, not lost).
 * Same records as Pipeline → Estimating while still open.
 */
export function getPendingChangeOrderEstimatesForProject(
  estimates: Estimate[],
  projectId: string,
): Estimate[] {
  return estimates
    .filter((estimate) => {
      if (estimate.project_id !== projectId || estimate.estimate_type !== "change_order") {
        return false;
      }
      if (isLostChangeOrder(estimate)) return false;
      if (changeOrderCountsTowardEstimate(estimate)) return false;
      return true;
    })
    .sort((a, b) => {
      const aDate = a.due_date ?? a.submitted_date ?? a.updated_at;
      const bDate = b.due_date ?? b.submitted_date ?? b.updated_at;
      return aDate.localeCompare(bDate);
    });
}

export function summarizeChangeOrderEstimates(
  estimates: Estimate[],
  projectId: string,
): { count: number; activeCount: number; totalAmount: number } {
  const packages = getChangeOrderEstimatesForProject(estimates, projectId, { wonOnly: true });
  return {
    count: packages.length,
    activeCount: packages.length,
    totalAmount: packages.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0),
  };
}

export function buildChangeOrderEstimateDefaults(
  project: Project,
  existingPackages: Estimate[] = [],
): Partial<EstimateFormValues> {
  const nextNumber =
    existingPackages.filter(
      (estimate) =>
        estimate.project_id === project.id && estimate.estimate_type === "change_order",
    ).length + 1;
  return {
    client_name: project.client_name,
    project_id: project.id,
    title: `${project.project_name} — CO-${String(nextNumber).padStart(2, "0")}`,
    estimate_type: "change_order",
    stage: "pricing",
    amount: undefined,
  };
}

export function changeOrderEstimateRowLabel(estimate: Estimate): string {
  return estimateDisplayName(estimate);
}

/** Marker stored on estimates created from legacy CO project rows. */
export const LEGACY_CO_PROJECT_NOTE_PREFIX = "legacy_co_project_id:";

/** Marker linking a CO package to its hours-only child project (timesheets / schedule). */
export const HOURS_PROJECT_NOTE_PREFIX = "hours_project_id:";

export function legacyCoProjectIdFromEstimateNotes(notes?: string): string | undefined {
  if (!notes?.includes(LEGACY_CO_PROJECT_NOTE_PREFIX)) return undefined;
  const match = notes.match(new RegExp(`${LEGACY_CO_PROJECT_NOTE_PREFIX}([^\\s]+)`));
  return match?.[1];
}

export function hoursProjectIdFromEstimateNotes(notes?: string): string | undefined {
  if (!notes?.includes(HOURS_PROJECT_NOTE_PREFIX)) return undefined;
  const match = notes.match(new RegExp(`${HOURS_PROJECT_NOTE_PREFIX}([^\\s]+)`));
  return match?.[1];
}

export function withHoursProjectNote(
  notes: string | undefined,
  hoursProjectId: string,
): string {
  const without = (notes ?? "")
    .replace(new RegExp(`${HOURS_PROJECT_NOTE_PREFIX}\\S+\\s*`, "g"), "")
    .trim();
  return without
    ? `${without} ${HOURS_PROJECT_NOTE_PREFIX}${hoursProjectId}`
    : `${HOURS_PROJECT_NOTE_PREFIX}${hoursProjectId}`;
}

export function findEstimateConvertedFromLegacyCo(
  estimates: Estimate[],
  coProjectId: string,
): Estimate | undefined {
  return estimates.find(
    (estimate) => legacyCoProjectIdFromEstimateNotes(estimate.notes) === coProjectId,
  );
}

/** Child CO project used for time/schedule for this package, if still present. */
export function findHoursProjectForEstimate(
  projects: Project[],
  estimate: Estimate,
): Project | undefined {
  const hoursId = hoursProjectIdFromEstimateNotes(estimate.notes);
  if (hoursId) {
    const found = projects.find((p) => p.id === hoursId);
    if (found) return found;
  }
  const legacyId = legacyCoProjectIdFromEstimateNotes(estimate.notes);
  if (legacyId) {
    return projects.find((p) => p.id === legacyId);
  }
  return undefined;
}

/** Legacy CO project rows under a parent that still need a won Estimating package. */
export function legacyChangeOrdersNeedingConversion(
  projects: Project[],
  estimates: Estimate[],
  parentId: string,
): Project[] {
  return getChangeOrdersForParent(projects, parentId).filter(
    (co) => !findEstimateConvertedFromLegacyCo(estimates, co.id),
  );
}

/** Won CO packages that have no usable hours child for timesheets. */
export function wonChangeOrdersNeedingHoursProject(
  projects: Project[],
  estimates: Estimate[],
  parentId: string,
): Estimate[] {
  return getChangeOrderEstimatesForProject(estimates, parentId, { wonOnly: true }).filter(
    (estimate) => !findHoursProjectForEstimate(projects, estimate),
  );
}

/**
 * Build a won change-order estimate package from an older CO project record.
 * Dollar amount moves to Estimating; the child project stays for hours/time entry.
 */
export function buildWonEstimateFromLegacyChangeOrder(
  co: Project,
  parent: Project,
  id: string,
  now = new Date(),
): Estimate {
  const iso = now.toISOString();
  const amount = getProjectEstimateValue(co) ?? getProjectDesignAmount(co);
  return {
    id,
    client_name: parent.client_name,
    project_id: parent.id,
    title: co.project_name,
    estimate_type: "change_order",
    revision_number: 0,
    estimator_id: co.lead_estimator_id,
    amount: amount != null && Number.isFinite(amount) ? amount : undefined,
    stage: "won",
    result: "won",
    won_date: co.contract_date ?? iso.slice(0, 10),
    submitted_date: co.contract_date ?? iso.slice(0, 10),
    checklist: [],
    notes: `${LEGACY_CO_PROJECT_NOTE_PREFIX}${co.id} ${HOURS_PROJECT_NOTE_PREFIX}${co.id}`,
    sort_order: 0,
    created_at: iso,
    updated_at: iso,
  };
}

/** Hours-only child project defaults ($ stays on the Estimating package). */
export function buildHoursOnlyChangeOrderDefaults(
  parent: Project,
  siblings: Project[],
  title: string,
): ProjectFormValues {
  const defaults = buildChangeOrderFormDefaults(parent, siblings);
  return {
    project_name: title.trim() || nextChangeOrderName(parent, siblings),
    client_name: defaults.client_name!,
    department: defaults.department,
    phase: defaults.phase ?? parent.phase,
    lead_employee_id: defaults.lead_employee_id,
    lead_estimator_id: defaults.lead_estimator_id,
    address: defaults.address,
    phone: defaults.phone,
    email: defaults.email,
    budgeted_design_hours: defaults.budgeted_design_hours ?? 0,
    estimate_value: 0,
    design_amount: 0,
    parent_project_id: parent.id,
    is_change_order: true,
    active: true,
  };
}

export function getParentProject(projects: Project[], project: Project): Project | undefined {
  if (!project.parent_project_id) return undefined;
  return projects.find((p) => p.id === project.parent_project_id);
}

export function nextChangeOrderName(parent: Project, siblings: Project[]): string {
  const count = siblings.filter((p) => p.parent_project_id === parent.id).length + 1;
  return `${parent.project_name} — CO-${String(count).padStart(2, "0")}`;
}

export function nextChangeOrderNumber(parent: Project, siblings: Project[]): string | undefined {
  const base = parent.project_number?.trim();
  if (!base) return undefined;
  const count = siblings.filter((p) => p.parent_project_id === parent.id).length + 1;
  return `${base}-CO${String(count).padStart(2, "0")}`;
}

export function buildChangeOrderFormDefaults(
  parent: Project,
  siblings: Project[],
): Partial<ProjectFormValues> {
  return {
    project_name: nextChangeOrderName(parent, siblings),
    client_name: parent.client_name,
    department: parent.department,
    phase: parent.phase,
    lead_employee_id: parent.lead_employee_id,
    lead_estimator_id: parent.lead_estimator_id,
    address: parent.address,
    phone: parent.phone,
    email: parent.email,
    budgeted_design_hours: 0,
    parent_project_id: parent.id,
    is_change_order: true,
  };
}

export interface ChangeOrderSummary {
  count: number;
  totalBudgetHours: number;
  totalDesignAmount: number;
  totalEstimateAmount: number;
}

export interface ProjectBudgetRollup {
  baseBudgetHours: number;
  changeOrderBudgetHours: number;
  totalBudgetHours: number;
  baseDesignAmount: number;
  changeOrderDesignAmount: number;
  totalDesignAmount: number;
  /** Project estimate_value when no linked contracts; otherwise sum of contracts. */
  baseEstimateAmount: number;
  contractEstimateAmount: number;
  changeOrderEstimateAmount: number;
  totalEstimateAmount: number;
  contractCount: number;
  changeOrderCount: number;
}

export interface ProjectHoursRollup {
  baseActualHours: number;
  changeOrderActualHours: number;
  totalActualHours: number;
  changeOrderCount: number;
}

export function getProjectBudgetRollup(
  projects: Project[],
  project: Project,
  estimates: Estimate[] = [],
): ProjectBudgetRollup {
  const coSummary = isParentProject(project)
    ? summarizeChangeOrders(projects, project.id)
    : {
        count: 0,
        totalBudgetHours: 0,
        totalDesignAmount: 0,
        totalEstimateAmount: 0,
      };

  const estimateCoSummary = isParentProject(project)
    ? summarizeChangeOrderEstimates(estimates, project.id)
    : { count: 0, activeCount: 0, totalAmount: 0 };

  const contractSummary = isParentProject(project)
    ? summarizeContracts(estimates, project.id)
    : { count: 0, activeCount: 0, totalAmount: 0 };

  const baseDesignAmount = getProjectDesignAmount(project) ?? 0;
  const projectEstimateValue = getProjectEstimateValue(project) ?? 0;
  // Linked contracts are the source of truth for estimate $ when present;
  // otherwise fall back to the project's estimate_value field.
  const baseEstimateAmount =
    contractSummary.count > 0 ? contractSummary.totalAmount : projectEstimateValue;
  // Won Estimating packages + any remaining legacy CO project estimate_value
  // (legacy amounts are cleared when converted to packages).
  const changeOrderEstimateAmount =
    estimateCoSummary.totalAmount + coSummary.totalEstimateAmount;
  const changeOrderCount = estimateCoSummary.count + coSummary.count;

  return {
    baseBudgetHours: project.budgeted_design_hours,
    changeOrderBudgetHours: coSummary.totalBudgetHours,
    totalBudgetHours: project.budgeted_design_hours + coSummary.totalBudgetHours,
    baseDesignAmount,
    changeOrderDesignAmount: coSummary.totalDesignAmount,
    totalDesignAmount: baseDesignAmount + coSummary.totalDesignAmount,
    baseEstimateAmount,
    contractEstimateAmount: contractSummary.totalAmount,
    changeOrderEstimateAmount,
    totalEstimateAmount: baseEstimateAmount + changeOrderEstimateAmount,
    contractCount: contractSummary.count,
    changeOrderCount,
  };
}

export function getProjectHoursRollup(
  projects: Project[],
  project: Project,
  timeEntries: TimeEntry[],
): ProjectHoursRollup {
  const changeOrders = isParentProject(project)
    ? getChangeOrdersForParent(projects, project.id)
    : [];
  const baseActualHours = getProjectActualHours(timeEntries, project.id);
  const changeOrderActualHours = getChangeOrderActualHours(timeEntries, changeOrders);

  return {
    baseActualHours,
    changeOrderActualHours,
    totalActualHours: baseActualHours + changeOrderActualHours,
    changeOrderCount: changeOrders.length,
  };
}

export function hasChangeOrderRollup(rollup: Pick<ProjectBudgetRollup, "changeOrderCount">): boolean {
  return rollup.changeOrderCount > 0;
}

export function hasEstimateRollup(
  rollup: Pick<ProjectBudgetRollup, "changeOrderCount" | "contractCount">,
): boolean {
  return rollup.changeOrderCount > 0 || rollup.contractCount > 0;
}

export function summarizeChangeOrders(
  projects: Project[],
  parentId: string,
): ChangeOrderSummary {
  const orders = getChangeOrdersForParent(projects, parentId);
  return {
    count: orders.length,
    totalBudgetHours: orders.reduce((sum, p) => sum + p.budgeted_design_hours, 0),
    totalDesignAmount: orders.reduce((sum, p) => sum + (getProjectDesignAmount(p) ?? 0), 0),
    totalEstimateAmount: orders.reduce((sum, p) => sum + (getProjectEstimateValue(p) ?? 0), 0),
  };
}

export function formatChangeOrderRollup(summary: ChangeOrderSummary): string | null {
  if (summary.count === 0) return null;
  const parts = [`${summary.count} CO${summary.count === 1 ? "" : "s"}`];
  if (summary.totalBudgetHours > 0) {
    parts.push(`+${summary.totalBudgetHours}h`);
  }
  if (summary.totalEstimateAmount > 0) {
    parts.push(
      `+$${Math.round(summary.totalEstimateAmount).toLocaleString("en-US")} est.`,
    );
  } else if (summary.totalDesignAmount > 0) {
    parts.push(`+$${Math.round(summary.totalDesignAmount).toLocaleString("en-US")}`);
  }
  return parts.join(" · ");
}

export function formatChangeOrderPackageRollup(summary: {
  count: number;
  totalAmount: number;
}): string | null {
  if (summary.count === 0) return null;
  const parts = [
    `${summary.count} change order${summary.count === 1 ? "" : "s"}`,
  ];
  if (summary.totalAmount > 0) {
    parts.push(`$${Math.round(summary.totalAmount).toLocaleString("en-US")}`);
  }
  return parts.join(" · ");
}

export function getChangeOrderActualHours(
  timeEntries: TimeEntry[],
  changeOrders: Project[],
): number {
  return changeOrders.reduce(
    (sum, p) => sum + getProjectActualHours(timeEntries, p.id),
    0,
  );
}
