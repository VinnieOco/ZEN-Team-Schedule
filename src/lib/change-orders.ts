import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { getProjectActualHours } from "@/lib/utilization";
import type { Project, ProjectFormValues, TimeEntry } from "@/types";

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

export function getChangeOrderActualHours(
  timeEntries: TimeEntry[],
  changeOrders: Project[],
): number {
  return changeOrders.reduce(
    (sum, p) => sum + getProjectActualHours(timeEntries, p.id),
    0,
  );
}
