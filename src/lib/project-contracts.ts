import { estimateDisplayName } from "@/lib/estimating/metrics";
import type { Estimate, EstimateFormValues, EstimateType, Project } from "@/types";

/** Linked contract packages for a project (estimate_type === "contract"). */
export function getContractsForProject(
  estimates: Estimate[],
  projectId: string,
): Estimate[] {
  return estimates
    .filter(
      (estimate) =>
        estimate.project_id === projectId && estimate.estimate_type === "contract",
    )
    .sort((a, b) => {
      const aDate = a.won_date ?? a.submitted_date ?? a.updated_at;
      const bDate = b.won_date ?? b.submitted_date ?? b.updated_at;
      return bDate.localeCompare(aDate);
    });
}

/** Amounts that count toward the project's Estimate amount (exclude lost). */
export function contractCountsTowardEstimate(estimate: Estimate): boolean {
  return estimate.result !== "lost" && estimate.stage !== "lost";
}

export interface ContractSummary {
  count: number;
  /** Linked contracts excluding lost. */
  activeCount: number;
  totalAmount: number;
}

export function summarizeContracts(
  estimates: Estimate[],
  projectId: string,
): ContractSummary {
  const contracts = getContractsForProject(estimates, projectId);
  const active = contracts.filter(contractCountsTowardEstimate);
  return {
    count: contracts.length,
    activeCount: active.length,
    totalAmount: active.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0),
  };
}

export function formatContractRollup(summary: ContractSummary): string | null {
  if (summary.count === 0) return null;
  const parts = [
    `${summary.count} contract${summary.count === 1 ? "" : "s"}`,
  ];
  if (summary.totalAmount > 0) {
    parts.push(`$${Math.round(summary.totalAmount).toLocaleString("en-US")}`);
  }
  return parts.join(" · ");
}

export function buildContractEstimateDefaults(
  project: Project,
): Partial<EstimateFormValues> {
  return {
    client_name: project.client_name,
    project_id: project.id,
    title: project.project_name,
    estimate_type: "contract",
    stage: "pricing",
    amount: undefined,
  };
}

export function contractRowLabel(estimate: Estimate): string {
  return estimateDisplayName(estimate);
}

/**
 * When a package is won and linked to a job, promote its type so it appears in
 * Contracts (or Change Orders). Preserve change_order packages even when linked
 * via existing/new project modes.
 */
export function estimateTypeAfterWon(
  mode: "existing" | "new" | "change_order",
  currentType?: EstimateType,
): EstimateType {
  if (mode === "change_order" || currentType === "change_order") return "change_order";
  return "contract";
}
