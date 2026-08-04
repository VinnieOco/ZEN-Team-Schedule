import {
  differenceInCalendarDays,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

import { daysLeftClass } from "@/lib/estimating/metrics";
import type { PipelineJob } from "@/lib/pipeline/types";
import type { QueueHealth } from "@/lib/queue/types";
import type { Estimate } from "@/types";

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

function parseDue(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    return startOfDay(parseISO(value));
  } catch {
    return null;
  }
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

/**
 * Priority groups by construction PM (lead designer / PM on the project).
 * Unassigned jobs form a group at the bottom.
 */
export function buildConstructionPriorityGroups(
  jobs: PipelineJob[],
  search = "",
): ConstructionPriorityGroup[] {
  const q = search.trim().toLowerCase();
  const active = constructionJobs(jobs).filter((job) => {
    if (!q) return true;
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
    return haystack.includes(q);
  });

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

export { daysLeftClass };
