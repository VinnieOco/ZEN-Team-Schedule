/**
 * Per-PM construction priority order for the Pipeline Construction main table.
 * Stored in localStorage (same approach as lead owner priority — avoids extending
 * queue_column_positions.queue_kind until a migration is ready).
 */

const STORAGE_KEY = "zen-construction-pm-priority";

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

export function getConstructionPmPriorityOrder(pmId: string): string[] | undefined {
  const order = loadOrders()[`priority:${pmId}`];
  return order?.length ? order : undefined;
}

export function setConstructionPmPriorityOrder(pmId: string, projectIds: string[]): void {
  const next = { ...loadOrders(), [`priority:${pmId}`]: projectIds };
  saveOrders(next);
}
