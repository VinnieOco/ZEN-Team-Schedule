import { UNASSIGNED_DEPARTMENT } from "@/lib/departments";
import type {
  DesignQueueItem,
  EstimatingQueueItem,
  QueueFilters,
  QueueHealth,
  QueueItem,
  QueueSortBy,
} from "@/lib/queue/types";

export function defaultQueueFilters(): QueueFilters {
  return { search: "", health: "all", department: null, sortBy: "priority", showInactive: false };
}

export function queueFiltersActive(filters: QueueFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    filters.health !== "all" ||
    Boolean(filters.department) ||
    filters.sortBy !== "priority" ||
    filters.showInactive
  );
}

function projectDepartmentKey(department?: string): string {
  const trimmed = department?.trim();
  return trimmed ? trimmed : UNASSIGNED_DEPARTMENT;
}

function matchesQueueFilters(item: QueueItem, filters: QueueFilters): boolean {
  if (!filters.showInactive && !item.project.active) return false;
  if (filters.health !== "all" && item.health !== filters.health) return false;

  if (filters.department) {
    if (projectDepartmentKey(item.project.department) !== filters.department) return false;
  }

  const q = filters.search.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    item.project.project_name,
    item.project.client_name,
    item.project.department,
    item.project.phase,
    item.leadName,
    item.leadSearchText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function filterQueueItems(items: QueueItem[], filters: QueueFilters): QueueItem[] {
  return items.filter((item) => matchesQueueFilters(item, filters));
}

export function filterDesignQueueItems(
  items: DesignQueueItem[],
  filters: QueueFilters,
): DesignQueueItem[] {
  return items.filter((item) => matchesQueueFilters(item, filters));
}

export function filterEstimatingQueueItems(
  items: EstimatingQueueItem[],
  filters: QueueFilters,
): EstimatingQueueItem[] {
  return items.filter((item) => matchesQueueFilters(item, filters));
}

export const QUEUE_SORT_OPTIONS: { value: QueueSortBy; label: string }[] = [
  { value: "priority", label: "Priority" },
  { value: "department", label: "Department" },
];

export const QUEUE_HEALTH_OPTIONS: { value: QueueHealth | "all"; label: string }[] = [
  { value: "all", label: "All health" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "overdue", label: "Overdue" },
  { value: "blocked", label: "Blocked" },
];
