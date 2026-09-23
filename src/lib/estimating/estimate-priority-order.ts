/**
 * Per-estimator priority order for the Pipeline Estimating main table.
 * Stored in localStorage (estimate IDs are not project FKs, so
 * queue_column_positions cannot hold them — same approach as lead owner priority).
 */

const STORAGE_KEY = "zen-estimate-estimator-priority";

type OrderMap = Record<string, string[]>;

function loadOrders(): OrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OrderMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveOrders(map: OrderMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function estimatePriorityStageKey(estimatorId: string): string {
  return `priority:${estimatorId}`;
}

export function getEstimatePriorityOrder(estimatorId: string): string[] | undefined {
  const order = loadOrders()[estimatePriorityStageKey(estimatorId)];
  return order?.length ? order : undefined;
}

export function setEstimatePriorityOrder(estimatorId: string, estimateIds: string[]): void {
  const next = { ...loadOrders(), [estimatePriorityStageKey(estimatorId)]: estimateIds };
  saveOrders(next);
}
