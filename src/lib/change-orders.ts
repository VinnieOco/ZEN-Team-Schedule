import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import {
  contractCountsTowardEstimate,
  summarizeContracts,
} from "@/lib/project-contracts";
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
): Estimate[] {
  return estimates
    .filter(
      (estimate) =>
        estimate.project_id === projectId && estimate.estimate_type === "change_order",
    )
    .sort((a, b) => {
      const aDate = a.won_date ?? a.submitted_date ?? a.updated_at;
      const bDate = b.won_date ?? b.submitted_date ?? b.updated_at;
      return bDate.localeCompare(aDate);
    });
}

export function summarizeChangeOrderEstimates(
  estimates: Estimate[],
  projectId: string,
): { count: number; activeCount: number; totalAmount: number } {
  const packages = getChangeOrderEstimatesForProject(estimates, projectId);
  const active = packages.filter(contractCountsTowardEstimate);
  return {
    count: packages.length,
    activeCount: active.length,
    totalAmount: active.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0),
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
  const changeOrderEstimateAmount =
    coSummary.totalEstimateAmount + estimateCoSummary.totalAmount;
  const changeOrderCount = coSummary.count + estimateCoSummary.count;

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
