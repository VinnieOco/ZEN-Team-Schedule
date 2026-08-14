import { isParentProject } from "@/lib/change-orders";
import { UNASSIGNED_DEPARTMENT, getProjectDepartmentKey } from "@/lib/departments";
import type { PipelineJob } from "@/lib/pipeline/types";
import type { Estimate, Project } from "@/types";

/** Entered WIP fields (stored on the project). */
export type ProjectWipInputFields = Pick<
  Project,
  | "wip_contract_price"
  | "wip_cost_to_date"
  | "wip_estimated_cost_to_complete"
  | "wip_billings_to_date"
  | "wip_provision_for_loss"
  | "wip_prior_fy_revenue"
  | "wip_prior_fy_cost"
>;

export const WIP_INPUT_KEYS: (keyof ProjectWipInputFields)[] = [
  "wip_contract_price",
  "wip_cost_to_date",
  "wip_estimated_cost_to_complete",
  "wip_billings_to_date",
  "wip_provision_for_loss",
  "wip_prior_fy_revenue",
  "wip_prior_fy_cost",
];

/** Preferred section order matching the accounting WIP schedule. */
export const WIP_DEPARTMENT_ORDER = [
  "Design",
  "Construction",
  "Landscape",
  "Interior",
] as const;

/** Active design + construction jobs included on the WIP schedule. */
export function wipScheduleJobs(jobs: PipelineJob[]): PipelineJob[] {
  return jobs.filter(
    (job) => job.active && (job.stage === "design" || job.stage === "construction"),
  );
}

export interface WipScheduleRow {
  projectId: string;
  jobName: string;
  clientName: string;
  department: string;
  /** C: Contract price including change orders (entered). */
  contractPrice: number;
  /** D: Estimated cost to complete (entered). */
  estimatedCostToComplete: number;
  /** E: Cost to date (entered). */
  costToDate: number;
  /** F = D + E */
  estimatedTotalCost: number;
  /** G = E / F */
  percentComplete: number | null;
  /** H = C - F */
  estimatedGrossProfit: number;
  /** I = H / C */
  estimatedGrossProfitPercent: number | null;
  /** J = C * G */
  revenueEarnedToDate: number;
  /** K = J - E (also ≈ H * G) */
  earnedGrossProfitToDate: number;
  /** L: Billings to date (entered). */
  billingsToDate: number;
  /** M = L - E */
  grossProfitToDate: number;
  /** N = M / L */
  grossProfitPercentToDate: number | null;
  /** O: underbillings (asset) = max(0, J - L) */
  costsAndEarningsOverBillings: number;
  /** P: overbillings (liability) = max(0, L - J) */
  billingsOverCostsAndEarnings: number;
  /** Q: provision for loss (entered). */
  provisionForLoss: number;
  /** R: prior FY revenue (entered). */
  priorFyRevenue: number;
  /** S: prior FY cost (entered). */
  priorFyCost: number;
  /** T = R - S */
  priorFyGrossEarnings: number;
  /** U = J - R */
  thisFyRevenue: number;
  /** V = E - S */
  thisFyCost: number;
  /** W = U - V */
  thisFyGrossEarnings: number;
  /** X = C - J */
  remainingRevenue: number;
  /** Y = D */
  backlogCostToComplete: number;
  /** Z = X - Y */
  backlogEstimatedGrossProfit: number;
}

export interface WipScheduleTotals extends Omit<
  WipScheduleRow,
  | "projectId"
  | "jobName"
  | "clientName"
  | "department"
  | "percentComplete"
  | "estimatedGrossProfitPercent"
  | "grossProfitPercentToDate"
> {
  percentComplete: number | null;
  estimatedGrossProfitPercent: number | null;
  grossProfitPercentToDate: number | null;
}

function n(value: number | undefined | null): number {
  return value != null && Number.isFinite(value) ? value : 0;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

/**
 * Excel-style WIP formulas matching the ZEN WIP Schedule spreadsheet.
 * Contract price and other amber cells are entered on the project and carry
 * across As-of months (the month picker is a reporting label only).
 */
export function computeWipScheduleRow(
  project: Project,
  _allProjects: Project[] = [],
  _estimates: Estimate[] = [],
): WipScheduleRow {
  const contractPrice = n(project.wip_contract_price);

  const estimatedCostToComplete = n(project.wip_estimated_cost_to_complete);
  const costToDate = n(project.wip_cost_to_date);
  const billingsToDate = n(project.wip_billings_to_date);
  const provisionForLoss = n(project.wip_provision_for_loss);
  const priorFyRevenue = n(project.wip_prior_fy_revenue);
  const priorFyCost = n(project.wip_prior_fy_cost);

  const estimatedTotalCost = estimatedCostToComplete + costToDate;
  const percentComplete = pct(costToDate, estimatedTotalCost);
  const estimatedGrossProfit = contractPrice - estimatedTotalCost;
  const estimatedGrossProfitPercent = pct(estimatedGrossProfit, contractPrice);
  const revenueEarnedToDate =
    percentComplete == null ? 0 : contractPrice * percentComplete;
  const earnedGrossProfitToDate = revenueEarnedToDate - costToDate;
  const grossProfitToDate = billingsToDate - costToDate;
  const grossProfitPercentToDate = pct(grossProfitToDate, billingsToDate);

  const underBillings = Math.max(0, revenueEarnedToDate - billingsToDate);
  const overBillings = Math.max(0, billingsToDate - revenueEarnedToDate);

  const priorFyGrossEarnings = priorFyRevenue - priorFyCost;
  const thisFyRevenue = revenueEarnedToDate - priorFyRevenue;
  const thisFyCost = costToDate - priorFyCost;
  const thisFyGrossEarnings = thisFyRevenue - thisFyCost;

  const remainingRevenue = contractPrice - revenueEarnedToDate;
  const backlogCostToComplete = estimatedCostToComplete;
  const backlogEstimatedGrossProfit = remainingRevenue - backlogCostToComplete;

  const departmentKey = getProjectDepartmentKey(project);

  return {
    projectId: project.id,
    jobName: project.project_name,
    clientName: project.client_name,
    department: departmentKey === UNASSIGNED_DEPARTMENT ? "Unassigned" : departmentKey,
    contractPrice,
    estimatedCostToComplete,
    costToDate,
    estimatedTotalCost,
    percentComplete,
    estimatedGrossProfit,
    estimatedGrossProfitPercent,
    revenueEarnedToDate,
    earnedGrossProfitToDate,
    billingsToDate,
    grossProfitToDate,
    grossProfitPercentToDate,
    costsAndEarningsOverBillings: underBillings,
    billingsOverCostsAndEarnings: overBillings,
    provisionForLoss,
    priorFyRevenue,
    priorFyCost,
    priorFyGrossEarnings,
    thisFyRevenue,
    thisFyCost,
    thisFyGrossEarnings,
    remainingRevenue,
    backlogCostToComplete,
    backlogEstimatedGrossProfit,
  };
}

export function buildConstructionWipRows(
  jobs: PipelineJob[],
  projects: Project[],
  estimates: Estimate[],
): WipScheduleRow[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const rows: WipScheduleRow[] = [];

  for (const job of jobs) {
    const project = byId.get(job.projectId);
    if (!project || !isParentProject(project)) continue;
    rows.push(computeWipScheduleRow(project, projects, estimates));
  }

  return rows.sort((a, b) => a.jobName.localeCompare(b.jobName));
}

export interface WipDepartmentSection {
  department: string;
  rows: WipScheduleRow[];
  totals: WipScheduleTotals;
}

function compareWipDepartments(a: string, b: string): number {
  const order = WIP_DEPARTMENT_ORDER.map((name) => name.toLowerCase());
  const rank = (name: string) => {
    const preferred = order.indexOf(name.toLowerCase());
    if (preferred >= 0) return preferred;
    if (name === "Unassigned") return 10_000;
    return 100;
  };
  const diff = rank(a) - rank(b);
  if (diff !== 0) return diff;
  return a.localeCompare(b);
}

/**
 * Group WIP rows by project department with section totals.
 * Preferred order: Design → Construction → Landscape → Interior → others A–Z → Unassigned.
 */
export function groupWipRowsByDepartment(rows: WipScheduleRow[]): WipDepartmentSection[] {
  const byDept = new Map<string, WipScheduleRow[]>();
  for (const row of rows) {
    const list = byDept.get(row.department) ?? [];
    list.push(row);
    byDept.set(row.department, list);
  }

  return [...byDept.entries()]
    .sort(([a], [b]) => compareWipDepartments(a, b))
    .map(([department, deptRows]) => ({
      department,
      rows: [...deptRows].sort((x, y) => x.jobName.localeCompare(y.jobName)),
      totals: sumWipScheduleRows(deptRows),
    }));
}

export function sumWipScheduleRows(rows: WipScheduleRow[]): WipScheduleTotals {
  const sum = (pick: (row: WipScheduleRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  const contractPrice = sum((r) => r.contractPrice);
  const estimatedCostToComplete = sum((r) => r.estimatedCostToComplete);
  const costToDate = sum((r) => r.costToDate);
  const estimatedTotalCost = sum((r) => r.estimatedTotalCost);
  const estimatedGrossProfit = sum((r) => r.estimatedGrossProfit);
  const revenueEarnedToDate = sum((r) => r.revenueEarnedToDate);
  const earnedGrossProfitToDate = sum((r) => r.earnedGrossProfitToDate);
  const billingsToDate = sum((r) => r.billingsToDate);
  const grossProfitToDate = sum((r) => r.grossProfitToDate);
  const costsAndEarningsOverBillings = sum((r) => r.costsAndEarningsOverBillings);
  const billingsOverCostsAndEarnings = sum((r) => r.billingsOverCostsAndEarnings);
  const provisionForLoss = sum((r) => r.provisionForLoss);
  const priorFyRevenue = sum((r) => r.priorFyRevenue);
  const priorFyCost = sum((r) => r.priorFyCost);
  const priorFyGrossEarnings = sum((r) => r.priorFyGrossEarnings);
  const thisFyRevenue = sum((r) => r.thisFyRevenue);
  const thisFyCost = sum((r) => r.thisFyCost);
  const thisFyGrossEarnings = sum((r) => r.thisFyGrossEarnings);
  const remainingRevenue = sum((r) => r.remainingRevenue);
  const backlogCostToComplete = sum((r) => r.backlogCostToComplete);
  const backlogEstimatedGrossProfit = sum((r) => r.backlogEstimatedGrossProfit);

  return {
    contractPrice,
    estimatedCostToComplete,
    costToDate,
    estimatedTotalCost,
    percentComplete: pct(costToDate, estimatedTotalCost),
    estimatedGrossProfit,
    estimatedGrossProfitPercent: pct(estimatedGrossProfit, contractPrice),
    revenueEarnedToDate,
    earnedGrossProfitToDate,
    billingsToDate,
    grossProfitToDate,
    grossProfitPercentToDate: pct(grossProfitToDate, billingsToDate),
    costsAndEarningsOverBillings,
    billingsOverCostsAndEarnings,
    provisionForLoss,
    priorFyRevenue,
    priorFyCost,
    priorFyGrossEarnings,
    thisFyRevenue,
    thisFyCost,
    thisFyGrossEarnings,
    remainingRevenue,
    backlogCostToComplete,
    backlogEstimatedGrossProfit,
  };
}

export function formatWipMoney(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("en-US");
  return rounded < 0 ? `(${abs})` : abs;
}

export function formatWipPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}
