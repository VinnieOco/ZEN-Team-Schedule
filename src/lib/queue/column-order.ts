import type { QueueKind, QueueSortBy } from "@/lib/queue/types";

const STORAGE_KEY = "zen-queue-column-order";

type ColumnOrderMap = Record<string, string[]>;

function columnKey(kind: QueueKind, stage: string): string {
  return `${kind}::${stage}`;
}

function loadOrders(): ColumnOrderMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ColumnOrderMap;
  } catch {
    return {};
  }
}

function saveOrders(map: ColumnOrderMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getColumnOrder(kind: QueueKind, stage: string): string[] | undefined {
  return loadOrders()[columnKey(kind, stage)];
}

export function setColumnOrder(kind: QueueKind, stage: string, projectIds: string[]): void {
  const map = loadOrders();
  map[columnKey(kind, stage)] = projectIds;
  saveOrders(map);
}

export function removeFromColumnOrder(kind: QueueKind, stage: string, projectId: string): void {
  const existing = getColumnOrder(kind, stage);
  if (!existing) return;
  setColumnOrder(
    kind,
    stage,
    existing.filter((id) => id !== projectId),
  );
}

interface SortableQueueItem {
  project: { id: string; department?: string; project_name: string };
  priorityScore: number;
}

function departmentSortLabel(department?: string): string {
  const trimmed = department?.trim();
  return trimmed ? trimmed : "Unassigned";
}

function compareDefaultSort<T extends SortableQueueItem>(a: T, b: T, sortBy: QueueSortBy): number {
  if (sortBy === "department") {
    const deptCmp = departmentSortLabel(a.project.department).localeCompare(
      departmentSortLabel(b.project.department),
    );
    if (deptCmp !== 0) return deptCmp;
    return a.project.project_name.localeCompare(b.project.project_name);
  }
  return b.priorityScore - a.priorityScore;
}

/** Top of column = highest priority. Uses saved order, then sort mode for new items. */
export function sortQueueColumnItems<T extends SortableQueueItem>(
  kind: QueueKind,
  stage: string,
  items: T[],
  sortBy: QueueSortBy = "priority",
): T[] {
  if (items.length <= 1) return items;

  const savedOrder = getColumnOrder(kind, stage);
  if (!savedOrder?.length) {
    return [...items].sort((a, b) => compareDefaultSort(a, b, sortBy));
  }

  const rank = new Map(savedOrder.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const aRank = rank.get(a.project.id);
    const bRank = rank.get(b.project.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return compareDefaultSort(a, b, sortBy);
  });
}

export function arrayMoveIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
