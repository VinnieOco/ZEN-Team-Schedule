import {
  addDays,
  differenceInCalendarDays,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
  startOfYear,
} from "date-fns";

import type {
  Estimate,
  EstimateResult,
  EstimateStage,
  EstimateType,
} from "@/types";
import {
  matchesDueFocus,
  parsePipelineDueDate,
  type PipelineListFocus,
} from "@/lib/pipeline/focus";
import { getColumnOrder } from "@/lib/queue/column-order";

export const ESTIMATE_TYPES: { value: EstimateType; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "cost_proposal", label: "Cost proposal" },
  { value: "contract", label: "Contract" },
  { value: "change_order", label: "Change order" },
];

export const ESTIMATE_STAGES: { value: EstimateStage; label: string }[] = [
  { value: "backlog", label: "Backlog" },
  { value: "waiting_docs", label: "Waiting on documents" },
  { value: "pricing", label: "Pricing" },
  { value: "submitted", label: "Submitted" },
  { value: "follow_up", label: "Follow-up" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const OPEN_ESTIMATE_STAGES: EstimateStage[] = [
  "backlog",
  "waiting_docs",
  "pricing",
  "submitted",
  "follow_up",
];

export function estimateTypeLabel(type: EstimateType): string {
  return ESTIMATE_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function estimateStageLabel(stage: EstimateStage): string {
  return ESTIMATE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export function estimateDisplayName(estimate: Estimate): string {
  return estimate.title?.trim() || estimate.client_name;
}

/** "Rev 2" suffix for revisions; originals have no suffix. */
export function estimateRevisionLabel(estimate: Estimate): string | null {
  return estimate.revision_number > 0 ? `Rev ${estimate.revision_number}` : null;
}

export function isOpenEstimate(estimate: Estimate): boolean {
  return estimate.result === "pending" && OPEN_ESTIMATE_STAGES.includes(estimate.stage);
}

function parseDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    const parsed = startOfDay(parseISO(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export interface EstimateKpiSummary {
  activeCount: number;
  dueThisWeek: number;
  submittedThisWeekCount: number;
  submittedThisWeekAmount: number;
  wonThisWeekCount: number;
  wonThisWeekAmount: number;
  pipelineValue: number;
  winRatePercent: number | null;
  avgTurnaroundDays: number | null;
}

export function buildEstimateKpis(
  estimates: Estimate[],
  now = new Date(),
  milestoneDates?: Map<string, string>,
  periodRange?: { start: Date; end: Date },
): EstimateKpiSummary {
  const open = estimates.filter(isOpenEstimate);
  const rangeStart = periodRange?.start ?? startOfWeek(now, { weekStartsOn: 1 });
  const rangeEnd = periodRange?.end ?? endOfWeek(now, { weekStartsOn: 1 });
  const yearStart = startOfYear(now);

  // When milestone dates are supplied, "due this period" totals the tagged
  // estimating milestone dates instead of estimate due dates.
  const dueThisWeek = open.filter((estimate) => {
    const source = milestoneDates
      ? estimate.project_id
        ? milestoneDates.get(estimate.project_id)
        : undefined
      : estimate.due_date;
    const due = parseDate(source);
    return due ? isWithinInterval(due, { start: rangeStart, end: rangeEnd }) : false;
  });

  const submittedThisWeek = estimates.filter((estimate) => {
    const submitted = parseDate(estimate.submitted_date);
    return submitted
      ? isWithinInterval(submitted, { start: rangeStart, end: rangeEnd })
      : false;
  });

  const wonThisWeekEstimates = estimates.filter((estimate) => {
    if (estimate.result !== "won" && estimate.stage !== "won") return false;
    const won = parseDate(estimate.won_date);
    return won ? isWithinInterval(won, { start: rangeStart, end: rangeEnd }) : false;
  });

  const decidedYtd = estimates.filter((estimate) => {
    if (estimate.result === "pending") return false;
    const decidedOn =
      (estimate.result === "won" ? parseDate(estimate.won_date) : undefined) ??
      parseDate(estimate.submitted_date) ??
      parseDate(estimate.updated_at);
    return decidedOn ? decidedOn >= yearStart : false;
  });
  const wonYtd = decidedYtd.filter((estimate) => estimate.result === "won").length;

  const turnarounds = estimates.flatMap((estimate) => {
    const received = parseDate(estimate.received_date);
    const submitted = parseDate(estimate.submitted_date);
    if (!received || !submitted) return [];
    const days = differenceInCalendarDays(submitted, received);
    return days >= 0 ? [days] : [];
  });

  return {
    activeCount: open.length,
    dueThisWeek: dueThisWeek.length,
    submittedThisWeekCount: submittedThisWeek.length,
    submittedThisWeekAmount: submittedThisWeek.reduce(
      (sum, estimate) => sum + (estimate.amount ?? 0),
      0,
    ),
    wonThisWeekCount: wonThisWeekEstimates.length,
    wonThisWeekAmount: wonThisWeekEstimates.reduce(
      (sum, estimate) => sum + (estimate.amount ?? 0),
      0,
    ),
    pipelineValue: open.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0),
    winRatePercent:
      decidedYtd.length > 0 ? Math.round((wonYtd / decidedYtd.length) * 100) : null,
    avgTurnaroundDays:
      turnarounds.length > 0
        ? Math.round(
            (turnarounds.reduce((sum, days) => sum + days, 0) / turnarounds.length) * 10,
          ) / 10
        : null,
  };
}

export interface EstimatorWorkloadRow {
  estimatorId: string | null;
  openCount: number;
  dueSoonCount: number;
  amount: number;
}

export function buildEstimatorWorkload(
  estimates: Estimate[],
  now = new Date(),
): EstimatorWorkloadRow[] {
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const byEstimator = new Map<string | null, EstimatorWorkloadRow>();

  for (const estimate of estimates.filter(isOpenEstimate)) {
    const key = estimate.estimator_id ?? null;
    const row =
      byEstimator.get(key) ??
      ({ estimatorId: key, openCount: 0, dueSoonCount: 0, amount: 0 } satisfies EstimatorWorkloadRow);
    row.openCount += 1;
    row.amount += estimate.amount ?? 0;
    const due = parseDate(estimate.due_date);
    if (due && due <= weekEnd) row.dueSoonCount += 1;
    byEstimator.set(key, row);
  }

  return [...byEstimator.values()].sort((a, b) => b.openCount - a.openCount);
}

export function submittedThisWeek(
  estimates: Estimate[],
  now = new Date(),
  periodRange?: { start: Date; end: Date },
): Estimate[] {
  const rangeStart = periodRange?.start ?? startOfWeek(now, { weekStartsOn: 1 });
  const rangeEnd = periodRange?.end ?? endOfWeek(now, { weekStartsOn: 1 });
  return estimates
    .filter((estimate) => {
      const submitted = parseDate(estimate.submitted_date);
      return submitted
        ? isWithinInterval(submitted, { start: rangeStart, end: rangeEnd })
        : false;
    })
    .sort((a, b) => (a.submitted_date ?? "").localeCompare(b.submitted_date ?? ""));
}

/** Estimates marked won whose won_date falls in the selected period. */
export function wonThisWeek(
  estimates: Estimate[],
  now = new Date(),
  periodRange?: { start: Date; end: Date },
): Estimate[] {
  const rangeStart = periodRange?.start ?? startOfWeek(now, { weekStartsOn: 1 });
  const rangeEnd = periodRange?.end ?? endOfWeek(now, { weekStartsOn: 1 });
  return estimates
    .filter((estimate) => {
      if (estimate.result !== "won" && estimate.stage !== "won") return false;
      const won = parseDate(estimate.won_date);
      return won ? isWithinInterval(won, { start: rangeStart, end: rangeEnd }) : false;
    })
    .sort((a, b) => (b.won_date ?? "").localeCompare(a.won_date ?? ""));
}

export interface EstimateTypeBucket {
  type: EstimateType;
  label: string;
  count: number;
  amount: number;
}

export function buildEstimateTypeBuckets(estimates: Estimate[]): EstimateTypeBucket[] {
  const open = estimates.filter(isOpenEstimate);
  return ESTIMATE_TYPES.map(({ value, label }) => {
    const matching = open.filter((estimate) => estimate.estimate_type === value);
    return {
      type: value,
      label,
      count: matching.length,
      amount: matching.reduce((sum, estimate) => sum + (estimate.amount ?? 0), 0),
    };
  });
}

export function buildUpcomingEstimateDue(
  estimates: Estimate[],
  limit = 6,
  now = new Date(),
): Estimate[] {
  const today = startOfDay(now);
  return estimates
    .filter((estimate) => isOpenEstimate(estimate) && parseDate(estimate.due_date))
    .sort((a, b) => {
      const aDue = parseDate(a.due_date)!;
      const bDue = parseDate(b.due_date)!;
      const aPast = aDue < today;
      const bPast = bDue < today;
      if (aPast !== bPast) return aPast ? -1 : 1;
      return aDue.getTime() - bDue.getTime();
    })
    .slice(0, limit);
}

/** Overdue while still open — drives the red due dates and at-risk styling. */
export function isEstimateDueOverdue(estimate: Estimate, now = new Date()): boolean {
  if (!isOpenEstimate(estimate)) return false;
  const due = parseDate(estimate.due_date);
  return due ? due < startOfDay(now) : false;
}

/** Whether an estimate matches Pipeline list focus (metrics / due buckets). */
export function matchesEstimateListFocus(
  estimate: Estimate,
  focus: PipelineListFocus,
  now = new Date(),
  options?: {
    milestoneDates?: Map<string, string>;
    periodRange?: { start: Date; end: Date };
  },
): boolean {
  if (focus === "all") return true;
  if (focus === "unassigned") return !estimate.estimator_id;

  const dueRaw =
    (estimate.project_id && options?.milestoneDates?.get(estimate.project_id)) ||
    estimate.due_date;
  const due = parsePipelineDueDate(dueRaw);
  const dueMatch = matchesDueFocus(due, focus, now, options?.periodRange);
  if (dueMatch != null) return dueMatch;

  return true;
}

/** Calendar days until due (negative when overdue). Null when no due date. */
export function estimateDaysLeft(estimate: Estimate, now = new Date()): number | null {
  const due = parseDate(estimate.due_date);
  if (!due) return null;
  return differenceInCalendarDays(due, startOfDay(now));
}

export function daysLeftClass(days: number | null): string {
  if (days == null) return "text-muted-foreground";
  if (days < 0) return "font-semibold text-rose-600";
  if (days === 0) return "font-semibold text-rose-600";
  if (days <= 2) return "font-semibold text-amber-600";
  if (days <= 7) return "font-medium text-amber-700";
  return "tabular-nums text-slate-700";
}

export interface EstimateDueBuckets {
  today: number;
  tomorrow: number;
  thisWeek: number;
  nextWeek: number;
  overdue: number;
}

/** Mockup-style upcoming due buckets for the bottom widget. */
export function buildEstimateDueBuckets(
  estimates: Estimate[],
  now = new Date(),
): EstimateDueBuckets {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  const buckets: EstimateDueBuckets = {
    today: 0,
    tomorrow: 0,
    thisWeek: 0,
    nextWeek: 0,
    overdue: 0,
  };

  for (const estimate of estimates.filter(isOpenEstimate)) {
    const due = parseDate(estimate.due_date);
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

export function estimateTypeBadgeClass(type: EstimateType): string {
  switch (type) {
    case "budget":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200";
    case "cost_proposal":
      return "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200";
    case "contract":
      return "bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200";
    case "change_order":
      return "bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

/** Left edge accent on priority-queue rows (urgency + stage). */
export function estimateRowAccentClass(estimate: Estimate, now = new Date()): string {
  const days = estimateDaysLeft(estimate, now);
  if (days != null && days < 0) return "bg-rose-500";
  if (days != null && days <= 2) return "bg-amber-500";
  switch (estimate.stage) {
    case "pricing":
      return "bg-sky-500";
    case "waiting_docs":
      return "bg-amber-400";
    case "submitted":
      return "bg-violet-500";
    case "follow_up":
      return "bg-orange-500";
    case "won":
      return "bg-emerald-500";
    case "lost":
      return "bg-slate-400";
    default:
      return "bg-slate-300";
  }
}

export function estimateStageBadgeClass(stage: EstimateStage): string {
  switch (stage) {
    case "backlog":
      return "bg-slate-100 text-slate-800";
    case "waiting_docs":
      return "bg-amber-100 text-amber-900";
    case "pricing":
      return "bg-sky-100 text-sky-900";
    case "submitted":
      return "bg-violet-100 text-violet-900";
    case "follow_up":
      return "bg-orange-100 text-orange-900";
    case "won":
      return "bg-emerald-100 text-emerald-800";
    case "lost":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

export function estimateResultLabel(result: EstimateResult): string {
  if (result === "won") return "Won";
  if (result === "lost") return "Lost";
  return "Pending";
}

/** Sort for tables and kanban columns: due date first, then most recent. */
export function compareEstimatesForQueue(a: Estimate, b: Estimate): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  const aDue = parseDate(a.due_date);
  const bDue = parseDate(b.due_date);
  if (aDue && bDue && aDue.getTime() !== bDue.getTime()) {
    return aDue.getTime() - bDue.getTime();
  }
  if (aDue && !bDue) return -1;
  if (!aDue && bDue) return 1;
  return b.created_at.localeCompare(a.created_at);
}

/** Column-order key for an estimator's priority list on the Estimating main table. */
export function estimatePriorityStageKey(estimatorId: string): string {
  return `priority:${estimatorId}`;
}

/** Apply saved drag order for an estimator's priority queue. */
export function sortEstimatePriorityItems(
  estimates: Estimate[],
  estimatorId: string,
): Estimate[] {
  if (estimates.length <= 1) return estimates;

  const savedOrder = getColumnOrder("estimating", estimatePriorityStageKey(estimatorId));
  if (!savedOrder?.length) {
    return [...estimates].sort(compareEstimatesForQueue);
  }

  const rank = new Map(savedOrder.map((id, index) => [id, index]));
  return [...estimates].sort((a, b) => {
    const aRank = rank.get(a.id);
    const bRank = rank.get(b.id);
    if (aRank != null && bRank != null) return aRank - bRank;
    if (aRank != null) return -1;
    if (bRank != null) return 1;
    return compareEstimatesForQueue(a, b);
  });
}

export interface EstimatePriorityGroup {
  estimatorId: string;
  estimatorName: string;
  items: Estimate[];
}

/**
 * Priority queue grouped by estimator.
 * Only estimates with an assigned estimator appear; estimators with zero
 * matching estimates are omitted.
 */
export function buildEstimatePriorityGroups(
  estimates: Estimate[],
  estimatorName: (estimatorId: string) => string,
): EstimatePriorityGroup[] {
  const byEstimator = new Map<string, Estimate[]>();
  for (const estimate of estimates) {
    if (!estimate.estimator_id) continue;
    const list = byEstimator.get(estimate.estimator_id) ?? [];
    list.push(estimate);
    byEstimator.set(estimate.estimator_id, list);
  }

  return [...byEstimator.entries()]
    .map(([estimatorId, items]) => ({
      estimatorId,
      estimatorName: estimatorName(estimatorId)?.trim() || "Estimator",
      items: sortEstimatePriorityItems(items, estimatorId),
    }))
    .sort((a, b) => a.estimatorName.localeCompare(b.estimatorName));
}
