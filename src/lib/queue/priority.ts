import { differenceInDays, parseISO } from "date-fns";

import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import type { Project } from "@/types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function daysUntil(dateStr: string | undefined): number | null {
  if (!dateStr?.trim()) return null;
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return null;
  }
}

function scheduleUrgencyScore(dueDate?: string): number {
  const days = daysUntil(dueDate);
  if (days == null) return 0.3;
  if (days < 0) return 1;
  if (days <= 7) return 0.95;
  if (days <= 14) return 0.8;
  if (days <= 30) return 0.55;
  if (days <= 60) return 0.35;
  return 0.15;
}

function revenueScoreFromAmount(value: number): number {
  if (value <= 0) return 0.25;
  if (value >= 500_000) return 1;
  if (value >= 250_000) return 0.85;
  if (value >= 100_000) return 0.65;
  if (value >= 50_000) return 0.45;
  return 0.3;
}

function projectAgeScore(startDate?: string, contractDate?: string): number {
  const ref = contractDate ?? startDate;
  if (!ref?.trim()) return 0.3;
  try {
    const days = differenceInDays(new Date(), parseISO(ref));
    if (days >= 180) return 0.9;
    if (days >= 90) return 0.7;
    if (days >= 30) return 0.5;
    return 0.25;
  } catch {
    return 0.3;
  }
}

function budgetPressureScore(hoursUsed: number, budgetHours: number): number {
  if (budgetHours <= 0) return 0.3;
  const ratio = hoursUsed / budgetHours;
  if (ratio >= 1) return 1;
  if (ratio >= 0.9) return 0.85;
  if (ratio >= 0.75) return 0.6;
  return 0.2;
}

/** Design queue priority (0–100). */
export function calculateDesignPriority(
  project: Project,
  hoursUsed: number,
  budgetHours: number,
): number {
  const due = project.target_completion_date;
  const score =
    scheduleUrgencyScore(due) * 0.4 +
    revenueScoreFromAmount(getProjectDesignAmount(project) ?? 0) * 0.2 +
    0.15 * 0.5 + // client importance placeholder
    projectAgeScore(project.start_date, project.contract_date) * 0.1 +
    0.1 * 0.5 + // strategic value placeholder
    budgetPressureScore(hoursUsed, budgetHours) * 0.05;

  return Math.round(clamp01(score) * 100);
}

/** Estimating queue priority (0–100). */
export function calculateEstimatingPriority(
  project: Project,
  hoursUsed: number,
  budgetHours: number,
): number {
  const bidDue = project.target_completion_date ?? project.contract_date;
  const estimateValue = getProjectEstimateValue(project) ?? getProjectDesignAmount(project) ?? 0;
  const score =
    scheduleUrgencyScore(bidDue) * 0.35 +
    revenueScoreFromAmount(estimateValue) * 0.2 +
    0.2 * 0.5 + // client relationship placeholder
    0.15 * 0.5 + // win probability placeholder
    0.1 * 0.5 + // strategic fit placeholder
    budgetPressureScore(hoursUsed, budgetHours) * 0.05;

  return Math.round(clamp01(score) * 100);
}
