/**
 * Per-owner lead priority order for the Pipeline Leads main table.
 * Stored in localStorage (lead IDs are not project FKs, so queue_column_positions
 * cannot hold them).
 */

const STORAGE_KEY = "zen-lead-owner-priority";

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

export function leadPriorityStageKey(ownerId: string): string {
  return `priority:${ownerId}`;
}

export function getLeadOwnerPriorityOrder(ownerId: string): string[] | undefined {
  const order = loadOrders()[leadPriorityStageKey(ownerId)];
  return order?.length ? order : undefined;
}

export function setLeadOwnerPriorityOrder(ownerId: string, leadIds: string[]): void {
  const next = { ...loadOrders(), [leadPriorityStageKey(ownerId)]: leadIds };
  saveOrders(next);
}
