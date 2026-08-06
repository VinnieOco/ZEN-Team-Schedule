import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  isBefore,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { daysLeftClass } from "@/lib/estimating/metrics";
import {
  matchesDueFocus,
  parsePipelineDueDate,
  type PipelineListFocus,
} from "@/lib/pipeline/focus";
import { designStageLabel } from "@/lib/queue/stages";
import type { DesignQueueItem, DesignQueueStage, QueueHealth } from "@/lib/queue/types";
import { filterAllocationsForWeek } from "@/lib/utilization";
import { getWeekStart } from "@/lib/week";
import type { Allocation, CompanySettings, Employee } from "@/types";

export const UNASSIGNED_DESIGN_OWNER_ID = "__unassigned_design__";

export interface DesignKpiSummary {
  activeCount: number;
  dueThisWeek: number;
  inReview: number;
  hoursScheduled: number;
  hoursCapacity: number;
  utilizationPercent: number | null;
  overdueCount: number;
  unassignedCount: number;
}

export interface DesignWorkloadRow {
  employeeId: string;
  name: string;
  projectCount: number;
  hoursScheduled: number;
  weeklyCapacity: number;
  utilizationPercent: number | null;
}

export interface DesignPhaseBucket {
  phase: string;
  count: number;
}

export interface DesignUpcomingDue {
  projectId: string;
  projectName: string;
  clientName: string;
  dueDate: string;
  leadName?: string;
  health: QueueHealth;
}

export interface DesignDueBuckets {
  today: number;
  tomorrow: number;
  thisWeek: number;
  nextWeek: number;
  overdue: number;
}

const REVIEW_STAGES: DesignQueueStage[] = ["in_review", "client_review"];

const PHASE_COLORS = [
  "#0284c7",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#e11d48",
  "#64748b",
];

function parseDue(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    return startOfDay(parseISO(value));
  } catch {
    return null;
  }
}

function isActiveDesign(item: DesignQueueItem): boolean {
  return item.project.active && item.stage !== "complete";
}

export function buildDesignKpis(
  items: DesignQueueItem[],
  allocations: Allocation[],
  employees: Employee[],
  settings: CompanySettings,
  now = new Date(),
  milestoneDates?: Map<string, string>,
): DesignKpiSummary {
  const active = items.filter(isActiveDesign);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);

  // When milestone dates are supplied, "due this week" totals the tagged
  // milestone dates from the priority queue instead of project due dates.
  const dueThisWeek = active.filter((item) => {
    const source = milestoneDates ? milestoneDates.get(item.project.id) : item.dueDate;
    const due = parseDue(source);
    if (!due) return false;
    return isWithinInterval(due, { start: weekStart, end: weekEnd });
  }).length;

  const inReview = active.filter((item) => REVIEW_STAGES.includes(item.stage)).length;

  const overdueCount = active.filter((item) => {
    if (item.health === "overdue") return true;
    const due = parseDue(item.dueDate);
    return due ? isBefore(due, today) : false;
  }).length;

  const unassignedCount = active.filter((item) => !item.project.lead_employee_id).length;

  const designerIds = new Set(
    active
      .map((i) => i.project.lead_employee_id)
      .filter((id): id is string => Boolean(id)),
  );
  const designers = employees.filter((e) => e.active && designerIds.has(e.id));
  const hoursCapacity = designers.reduce((sum, e) => sum + e.weekly_capacity_hours, 0);

  const projectIds = new Set(active.map((i) => i.project.id));
  const scheduleWeekStart = getWeekStart(now, settings);
  const hoursScheduled = filterAllocationsForWeek(allocations, scheduleWeekStart, settings)
    .filter((a): a is Allocation & { project_id: string } =>
      Boolean(a.project_id && projectIds.has(a.project_id)),
    )
    .reduce((sum, a) => sum + a.hours, 0);

  return {
    activeCount: active.length,
    dueThisWeek,
    inReview,
    hoursScheduled: Math.round(hoursScheduled * 10) / 10,
    hoursCapacity: Math.round(hoursCapacity * 10) / 10,
    utilizationPercent:
      hoursCapacity > 0 ? Math.round((hoursScheduled / hoursCapacity) * 100) : null,
    overdueCount,
    unassignedCount,
  };
}

export function buildDesignWorkload(
  items: DesignQueueItem[],
  allocations: Allocation[],
  employees: Employee[],
  settings: CompanySettings,
  getEmployeeFullName: (employee: Employee) => string,
  now = new Date(),
): DesignWorkloadRow[] {
  const active = items.filter(isActiveDesign);
  const projectIds = new Set(active.map((i) => i.project.id));
  const weekStart = getWeekStart(now, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, weekStart, settings).filter(
    (a): a is Allocation & { project_id: string } =>
      Boolean(a.project_id && projectIds.has(a.project_id)),
  );

  const byEmployee = new Map<string, { projectIds: Set<string>; hours: number }>();

  for (const item of active) {
    const leadId = item.project.lead_employee_id;
    if (!leadId) continue;
    const row = byEmployee.get(leadId) ?? { projectIds: new Set(), hours: 0 };
    row.projectIds.add(item.project.id);
    byEmployee.set(leadId, row);
  }

  // Only attribute hours to lead designers — do not add other scheduled staff to this list.
  for (const alloc of weekAllocations) {
    const row = byEmployee.get(alloc.employee_id);
    if (!row) continue;
    row.hours += alloc.hours;
  }

  return [...byEmployee.entries()]
    .map(([employeeId, data]) => {
      const employee = employees.find((e) => e.id === employeeId);
      const weeklyCapacity = employee?.weekly_capacity_hours ?? 0;
      const hoursScheduled = Math.round(data.hours * 10) / 10;
      return {
        employeeId,
        name: employee ? getEmployeeFullName(employee) : "Unknown",
        projectCount: data.projectIds.size,
        hoursScheduled,
        weeklyCapacity,
        utilizationPercent:
          weeklyCapacity > 0 ? Math.round((hoursScheduled / weeklyCapacity) * 100) : null,
      };
    })
    .sort((a, b) => (b.utilizationPercent ?? -1) - (a.utilizationPercent ?? -1));
}

export function buildDesignPhaseDistribution(items: DesignQueueItem[]): DesignPhaseBucket[] {
  const counts = new Map<string, number>();
  for (const item of items.filter(isActiveDesign)) {
    const phase = item.project.phase?.trim() || "Unspecified";
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([phase, count]) => ({ phase, count }))
    .sort((a, b) => b.count - a.count || a.phase.localeCompare(b.phase));
}

export function designPhaseColor(index: number): string {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

export function buildDesignUpcomingDue(
  items: DesignQueueItem[],
  limit = 6,
  now = new Date(),
): DesignUpcomingDue[] {
  const today = startOfDay(now);
  return items
    .filter((i) => isActiveDesign(i) && i.dueDate)
    .map((item) => ({
      item,
      due: parseDue(item.dueDate)!,
    }))
    .filter((row): row is { item: DesignQueueItem; due: Date } => Boolean(row.due))
    .sort((a, b) => {
      const aPast = a.due < today;
      const bPast = b.due < today;
      if (aPast !== bPast) return aPast ? -1 : 1;
      return a.due.getTime() - b.due.getTime();
    })
    .slice(0, limit)
    .map(({ item }) => ({
      projectId: item.project.id,
      projectName: item.project.project_name,
      clientName: item.project.client_name,
      dueDate: item.dueDate!,
      leadName: item.leadName,
      health: item.health,
    }));
}

/** Open design jobs due this calendar week — for the “this week” activity widget. */
export function designDueThisWeek(
  items: DesignQueueItem[],
  now = new Date(),
  milestoneDates?: Map<string, string>,
): DesignQueueItem[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const effectiveDate = (item: DesignQueueItem) =>
    milestoneDates ? milestoneDates.get(item.project.id) : item.dueDate;
  return items
    .filter((item) => {
      if (!isActiveDesign(item)) return false;
      const due = parseDue(effectiveDate(item));
      return due ? isWithinInterval(due, { start: weekStart, end: weekEnd }) : false;
    })
    .sort((a, b) => (effectiveDate(a) ?? "").localeCompare(effectiveDate(b) ?? ""));
}

export function buildDesignDueBuckets(
  items: DesignQueueItem[],
  now = new Date(),
): DesignDueBuckets {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  const buckets: DesignDueBuckets = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    overdue: 0,
  };

  for (const item of items.filter(isActiveDesign)) {
    const due = parseDue(item.dueDate);
    if (!due) continue;
    if (due < today) {
      buckets.overdue += 1;
      continue;
    }
    if (isSameDay(due, today)) {
      buckets.today += 1;
      continue;
    }
    if (isSameDay(due, tomorrow)) {
      buckets.tomorrow += 1;
      continue;
    }
    if (isWithinInterval(due, { start: weekStart, end: weekEnd })) {
      buckets.thisWeek += 1;
      continue;
    }
    if (isWithinInterval(due, { start: nextWeekStart, end: nextWeekEnd })) {
      buckets.nextWeek += 1;
    }
  }

  return buckets;
}

export function designDaysLeft(item: DesignQueueItem, now = new Date()): number | null {
  const due = parseDue(item.dueDate);
  if (!due) return null;
  return differenceInCalendarDays(due, startOfDay(now));
}

export function designRowAccentClass(item: DesignQueueItem, now = new Date()): string {
  const days = designDaysLeft(item, now);
  if (item.health === "overdue" || (days != null && days < 0)) return "bg-rose-500";
  if (item.health === "at_risk" || (days != null && days <= 2)) return "bg-amber-500";
  if (item.health === "blocked") return "bg-slate-400";
  switch (item.stage) {
    case "ready":
      return "bg-sky-500";
    case "active":
    case "active_dd_cd":
      return "bg-emerald-500";
    case "in_review":
      return "bg-amber-400";
    case "client_review":
      return "bg-violet-500";
    default:
      return "bg-slate-300";
  }
}

export function designQueueStageBadgeClass(stage: DesignQueueStage): string {
  switch (stage) {
    case "backlog":
      return "bg-slate-100 text-slate-800";
    case "ready":
      return "bg-sky-100 text-sky-900";
    case "active":
    case "active_dd_cd":
      return "bg-emerald-100 text-emerald-800";
    case "in_review":
      return "bg-amber-100 text-amber-900";
    case "client_review":
      return "bg-violet-100 text-violet-900";
    case "complete":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function compareDesignPriority(a: DesignQueueItem, b: DesignQueueItem): number {
  if (a.priorityScore !== b.priorityScore) return b.priorityScore - a.priorityScore;
  const aDue = parseDue(a.dueDate);
  const bDue = parseDue(b.dueDate);
  if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
    return aDue.getTime() - bDue.getTime();
  }
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  return a.project.project_name.localeCompare(b.project.project_name);
}

/** Column-order key for a designer's priority list on the Design main table. */
export function designPriorityStageKey(designerId: string): string {
  return `priority:${designerId}`;
}

export interface DesignPriorityGroup {
  designerId: string;
  designerName: string;
  items: DesignQueueItem[];
}

function matchesDesignListFocus(
  item: DesignQueueItem,
  focus: PipelineListFocus,
  milestoneDates?: Map<string, string>,
  now = new Date(),
): boolean {
  if (focus === "all") return true;
  if (focus === "unassigned") return !item.project.lead_employee_id;
  if (focus === "in_review") {
    return item.stage === "in_review" || item.stage === "client_review";
  }

  const dueRaw = milestoneDates?.get(item.project.id) ?? item.dueDate;
  const due = parsePipelineDueDate(dueRaw);
  const dueMatch = matchesDueFocus(due, focus, now);
  if (dueMatch != null) {
    if (focus === "overdue") {
      return dueMatch || item.health === "overdue";
    }
    return dueMatch;
  }

  return true;
}

/**
 * Priority queue grouped by lead designer.
 * Unassigned projects are omitted when focus is `all` (shown via the hidden count).
 * When focus is set, matching unassigned projects appear in an Unassigned group.
 */
export function buildDesignPriorityGroups(
  items: DesignQueueItem[],
  search = "",
  focus: PipelineListFocus = "all",
  milestoneDates?: Map<string, string>,
  now = new Date(),
): DesignPriorityGroup[] {
  const q = search.trim().toLowerCase();
  const eligible = items.filter((item) => {
    if (item.stage === "complete") return false;
    if (!matchesDesignListFocus(item, focus, milestoneDates, now)) return false;
    if (focus === "all" && !item.project.lead_employee_id) return false;
    if (!q) return true;
    const haystack = [
      item.project.project_name,
      item.project.client_name,
      item.project.project_number,
      item.leadName,
      item.project.phase,
      designStageLabel(item.stage),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const byDesigner = new Map<string, DesignQueueItem[]>();
  const unassigned: DesignQueueItem[] = [];
  for (const item of eligible) {
    const id = item.project.lead_employee_id;
    if (!id) {
      unassigned.push(item);
      continue;
    }
    const list = byDesigner.get(id) ?? [];
    list.push(item);
    byDesigner.set(id, list);
  }

  const groups = [...byDesigner.entries()]
    .map(([designerId, groupItems]) => ({
      designerId,
      designerName: groupItems[0]?.leadName?.trim() || "Designer",
      items: groupItems,
    }))
    .sort((a, b) => a.designerName.localeCompare(b.designerName));

  if (unassigned.length > 0) {
    groups.push({
      designerId: UNASSIGNED_DESIGN_OWNER_ID,
      designerName: "Unassigned",
      items: unassigned,
    });
  }

  return groups;
}

export { designStageLabel, daysLeftClass };
