import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { daysLeftClass } from "@/lib/estimating/metrics";
import type { PipelineJob } from "@/lib/pipeline/types";
import type { QueueHealth } from "@/lib/queue/types";
import {
  matchesDueFocus,
  parsePipelineDueDate,
  type PipelineListFocus,
} from "@/lib/pipeline/focus";
import { filterAllocationsForWeek } from "@/lib/utilization";
import { getWeekStart } from "@/lib/week";
import type { Allocation, CompanySettings, Employee, Estimate } from "@/types";

export const UNASSIGNED_CONSTRUCTION_PM_ID = "__unassigned_construction_pm__";

export interface ConstructionKpiSummary {
  activeCount: number;
  contractValue: number;
  dueThisWeek: number;
  overdueCount: number;
  unassignedCount: number;
  recentlyWonCount: number;
}

export interface ConstructionPriorityGroup {
  pmId: string;
  pmName: string;
  items: PipelineJob[];
}

export interface ConstructionWorkloadRow {
  employeeId: string;
  name: string;
  projectCount: number;
  hoursScheduled: number;
  weeklyCapacity: number;
  utilizationPercent: number | null;
}

export interface ConstructionPhaseBucket {
  phase: string;
  count: number;
}

export interface ConstructionDueBuckets {
  today: number;
  tomorrow: number;
  thisWeek: number;
  nextWeek: number;
  overdue: number;
}

export type ConstructionHealthFilter = QueueHealth | "all";

export interface ConstructionTableFilters {
  search: string;
  pmId: string | "all";
  health: ConstructionHealthFilter;
  /** When set, only jobs with this attention focus. */
  focus: PipelineListFocus;
}

const PHASE_COLORS = [
  "#d97706",
  "#059669",
  "#0284c7",
  "#7c3aed",
  "#e11d48",
  "#64748b",
];

function parseDue(value?: string): Date | null {
  return parsePipelineDueDate(value);
}

export function constructionJobs(jobs: PipelineJob[]): PipelineJob[] {
  return jobs.filter((job) => job.active && job.stage === "construction");
}

export function buildConstructionKpis(
  jobs: PipelineJob[],
  estimates: Estimate[],
  milestoneDates?: Map<string, string>,
  now = new Date(),
): ConstructionKpiSummary {
  const active = constructionJobs(jobs);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);

  const effectiveDue = (job: PipelineJob) =>
    milestoneDates?.get(job.projectId) ?? job.dueDate;

  let dueThisWeek = 0;
  let overdueCount = 0;
  for (const job of active) {
    const due = parseDue(effectiveDue(job));
    if (!due) continue;
    if (due < today) overdueCount += 1;
    else if (isWithinInterval(due, { start: weekStart, end: weekEnd })) dueThisWeek += 1;
  }

  const thirtyDaysAgo = startOfDay(new Date(now));
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentlyWonCount = estimates.filter((estimate) => {
    if (estimate.result !== "won" && estimate.stage !== "won") return false;
    const won = parseDue(estimate.won_date);
    return won ? won >= thirtyDaysAgo : false;
  }).length;

  return {
    activeCount: active.length,
    contractValue: active.reduce((sum, job) => sum + (job.value ?? 0), 0),
    dueThisWeek,
    overdueCount,
    unassignedCount: active.filter((job) => !job.ownerId).length,
    recentlyWonCount,
  };
}

function matchesConstructionFilters(
  job: PipelineJob,
  filters: ConstructionTableFilters,
  milestoneDates: Map<string, string> | undefined,
  now: Date,
): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q) {
    const haystack = [
      job.projectName,
      job.clientName,
      job.projectNumber,
      job.ownerName,
      job.phase,
      job.department,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.pmId !== "all") {
    const id = job.ownerId ?? UNASSIGNED_CONSTRUCTION_PM_ID;
    if (id !== filters.pmId) return false;
  }

  if (filters.health !== "all" && job.health !== filters.health) return false;

  const dueRaw = milestoneDates?.get(job.projectId) ?? job.dueDate;
  const due = parseDue(dueRaw);

  if (filters.focus === "unassigned") return !job.ownerId;
  if (filters.focus === "recent_won") return true;

  const dueMatch = matchesDueFocus(due, filters.focus, now);
  if (dueMatch != null) {
    if (filters.focus === "overdue") {
      return dueMatch || job.health === "overdue";
    }
    return dueMatch;
  }

  return true;
}

/**
 * Priority groups by construction PM (lead designer / PM on the project).
 * Unassigned jobs form a group at the bottom.
 * Prefer `listFilteredConstructionJobs` for the flat Construction table.
 */
export function buildConstructionPriorityGroups(
  jobs: PipelineJob[],
  filters: ConstructionTableFilters | string = "",
  milestoneDates?: Map<string, string>,
  now = new Date(),
): ConstructionPriorityGroup[] {
  const normalized: ConstructionTableFilters =
    typeof filters === "string"
      ? { search: filters, pmId: "all", health: "all", focus: "all" }
      : filters;

  const active = constructionJobs(jobs).filter((job) =>
    matchesConstructionFilters(job, normalized, milestoneDates, now),
  );

  const byPm = new Map<string, PipelineJob[]>();
  for (const job of active) {
    const id = job.ownerId ?? UNASSIGNED_CONSTRUCTION_PM_ID;
    const list = byPm.get(id) ?? [];
    list.push(job);
    byPm.set(id, list);
  }

  const groups = [...byPm.entries()].map(([pmId, items]) => ({
    pmId,
    pmName:
      pmId === UNASSIGNED_CONSTRUCTION_PM_ID
        ? "Unassigned"
        : items[0]?.ownerName?.trim() || "PM",
    items: [...items].sort((a, b) => {
      const aDue = a.dueDate ?? "9999";
      const bDue = b.dueDate ?? "9999";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.projectName.localeCompare(b.projectName);
    }),
  }));

  const assigned = groups
    .filter((g) => g.pmId !== UNASSIGNED_CONSTRUCTION_PM_ID)
    .sort((a, b) => a.pmName.localeCompare(b.pmName));
  const unassigned = groups.filter((g) => g.pmId === UNASSIGNED_CONSTRUCTION_PM_ID);
  return [...assigned, ...unassigned];
}

/** Flat filtered construction jobs (default due-date sort). */
export function listFilteredConstructionJobs(
  jobs: PipelineJob[],
  filters: ConstructionTableFilters | string = "",
  milestoneDates?: Map<string, string>,
  now = new Date(),
): PipelineJob[] {
  const normalized: ConstructionTableFilters =
    typeof filters === "string"
      ? { search: filters, pmId: "all", health: "all", focus: "all" }
      : filters;

  return constructionJobs(jobs)
    .filter((job) => matchesConstructionFilters(job, normalized, milestoneDates, now))
    .sort((a, b) => {
      const aDue = a.dueDate ?? "9999";
      const bDue = b.dueDate ?? "9999";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return a.projectName.localeCompare(b.projectName);
    });
}

export function sortConstructionJobsByOrder(
  items: PipelineJob[],
  savedOrder: string[] | undefined,
): PipelineJob[] {
  if (items.length <= 1 || !savedOrder?.length) return items;
  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const aRank = rank.get(a.projectId);
    const bRank = rank.get(b.projectId);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    const aDue = a.dueDate ?? "9999";
    const bDue = b.dueDate ?? "9999";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return a.projectName.localeCompare(b.projectName);
  });
}

export function buildConstructionWorkload(
  jobs: PipelineJob[],
  allocations: Allocation[],
  employees: Employee[],
  settings: CompanySettings,
  getEmployeeFullName: (employee: Employee) => string,
  now = new Date(),
): ConstructionWorkloadRow[] {
  const active = constructionJobs(jobs);
  const projectIds = new Set(active.map((j) => j.projectId));
  const weekStart = getWeekStart(now, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, weekStart, settings).filter(
    (a): a is Allocation & { project_id: string } =>
      Boolean(a.project_id && projectIds.has(a.project_id)),
  );

  const byEmployee = new Map<string, { projectIds: Set<string>; hours: number }>();

  for (const job of active) {
    if (!job.ownerId) continue;
    const row = byEmployee.get(job.ownerId) ?? { projectIds: new Set(), hours: 0 };
    row.projectIds.add(job.projectId);
    byEmployee.set(job.ownerId, row);
  }

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

export function buildConstructionPhaseDistribution(jobs: PipelineJob[]): ConstructionPhaseBucket[] {
  const counts = new Map<string, number>();
  for (const job of constructionJobs(jobs)) {
    const phase = job.phase?.trim() || "Unspecified";
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([phase, count]) => ({ phase, count }))
    .sort((a, b) => b.count - a.count || a.phase.localeCompare(b.phase));
}

export function constructionPhaseColor(index: number): string {
  return PHASE_COLORS[index % PHASE_COLORS.length];
}

export function constructionDueThisWeek(
  jobs: PipelineJob[],
  milestoneDates?: Map<string, string>,
  now = new Date(),
): PipelineJob[] {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const effectiveDate = (job: PipelineJob) =>
    milestoneDates?.get(job.projectId) ?? job.dueDate;
  return constructionJobs(jobs)
    .filter((job) => {
      const due = parseDue(effectiveDate(job));
      return due ? isWithinInterval(due, { start: weekStart, end: weekEnd }) : false;
    })
    .sort((a, b) => (effectiveDate(a) ?? "").localeCompare(effectiveDate(b) ?? ""));
}

export function buildConstructionDueBuckets(
  jobs: PipelineJob[],
  milestoneDates?: Map<string, string>,
  now = new Date(),
): ConstructionDueBuckets {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  const buckets: ConstructionDueBuckets = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    overdue: 0,
  };

  for (const job of constructionJobs(jobs)) {
    const due = parseDue(milestoneDates?.get(job.projectId) ?? job.dueDate);
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

export function recentWonEstimatesForConstruction(
  estimates: Estimate[],
  limit = 8,
): Estimate[] {
  return estimates
    .filter((e) => e.stage === "won" || e.result === "won")
    .sort((a, b) => (b.won_date ?? "").localeCompare(a.won_date ?? ""))
    .slice(0, limit);
}

export function constructionDaysLeft(dueDate: string | undefined, now = new Date()): number | null {
  const due = parseDue(dueDate);
  if (!due) return null;
  return differenceInCalendarDays(due, startOfDay(now));
}

export function constructionRowAccentClass(
  health: QueueHealth,
  dueDate: string | undefined,
  now = new Date(),
): string {
  const days = constructionDaysLeft(dueDate, now);
  if (health === "overdue" || (days != null && days < 0)) return "bg-rose-500";
  if (health === "at_risk" || (days != null && days <= 2)) return "bg-amber-500";
  if (health === "blocked") return "bg-slate-400";
  return "bg-amber-400";
}

export function constructionPriorityStageKey(pmId: string): string {
  return `priority:${pmId}`;
}

export { daysLeftClass };
