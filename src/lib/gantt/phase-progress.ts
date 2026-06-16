import { formatProjectAmount, formatProjectHours } from "@/lib/project-format";
import type { ScheduledProjectPhase, TimeEntry } from "@/types";

export interface PhaseProgress {
  hoursUsed: number;
  hoursBudget: number;
  hoursPercent: number;
  feeBudget?: number;
  feeUsed?: number;
  feePercent?: number;
}

export type PhaseProgressStatus = "under" | "near" | "over" | "none";

function entryPhaseKey(phase?: string): string {
  const trimmed = phase?.trim();
  return trimmed || "Concept";
}

function entryMatchesPhase(
  entry: Pick<TimeEntry, "phase">,
  phaseKey: string,
): boolean {
  return entryPhaseKey(entry.phase) === phaseKey;
}

/** Hours logged directly to a phase via time entry tags. */
export function directHoursForPhase(
  timeEntries: Pick<TimeEntry, "project_id" | "phase" | "hours">[],
  projectId: string,
  phaseKey: string,
): number {
  return timeEntries
    .filter((e) => e.project_id === projectId && entryMatchesPhase(e, phaseKey))
    .reduce((sum, e) => sum + e.hours, 0);
}

/** @deprecated Prefer buildPhaseHoursAllocation for schedule views. */
export function hoursForPhase(
  timeEntries: Pick<TimeEntry, "project_id" | "phase" | "hours">[],
  projectId: string,
  phaseKey: string,
): number {
  return directHoursForPhase(timeEntries, projectId, phaseKey);
}

function sortPhasesForHourAllocation(
  phases: ScheduledProjectPhase[],
): ScheduledProjectPhase[] {
  return [...phases].sort((a, b) => {
    if (a.start_date && b.start_date) {
      const byStart = a.start_date.localeCompare(b.start_date);
      if (byStart !== 0) return byStart;
    } else if (a.start_date) {
      return -1;
    } else if (b.start_date) {
      return 1;
    }
    return a.sort_order - b.sort_order;
  });
}

/**
 * Distributes logged hours across the active schedule. Hours tagged to removed phases
 * fill the earliest-started phase first until its budget, then cascade forward; any
 * remainder lands on the last phase as over budget.
 */
export function buildPhaseHoursAllocation(
  phases: ScheduledProjectPhase[],
  timeEntries: Pick<TimeEntry, "project_id" | "phase" | "hours">[],
  projectId: string,
): Map<string, number> {
  const activeKeys = new Set(phases.map((phase) => phase.phase_key));
  const directByKey = new Map<string, number>();

  for (const phase of phases) {
    directByKey.set(
      phase.phase_key,
      directHoursForPhase(timeEntries, projectId, phase.phase_key),
    );
  }

  let orphanHours = 0;
  for (const entry of timeEntries) {
    if (entry.project_id !== projectId) continue;
    if (!activeKeys.has(entryPhaseKey(entry.phase))) {
      orphanHours += entry.hours;
    }
  }

  const allocation = new Map<string, number>();
  for (const phase of phases) {
    allocation.set(phase.phase_key, directByKey.get(phase.phase_key) ?? 0);
  }

  if (orphanHours <= 0 || phases.length === 0) {
    return allocation;
  }

  let remaining = orphanHours;
  const sorted = sortPhasesForHourAllocation(phases);

  for (const phase of sorted) {
    if (remaining <= 0) break;

    const direct = directByKey.get(phase.phase_key) ?? 0;
    const budget = phase.budget_hours;
    const capacity = budget > 0 ? Math.max(0, budget - direct) : 0;
    if (capacity <= 0) continue;

    const applied = Math.min(remaining, capacity);
    allocation.set(phase.phase_key, direct + applied);
    remaining -= applied;
  }

  if (remaining > 0) {
    const lastPhase = sorted[sorted.length - 1]!;
    allocation.set(
      lastPhase.phase_key,
      (allocation.get(lastPhase.phase_key) ?? 0) + remaining,
    );
  }

  return allocation;
}

export function allocatedHoursForPhase(
  phases: ScheduledProjectPhase[],
  timeEntries: Pick<TimeEntry, "project_id" | "phase" | "hours">[],
  projectId: string,
  phaseKey: string,
): number {
  return buildPhaseHoursAllocation(phases, timeEntries, projectId).get(phaseKey) ?? 0;
}

export function computePhaseProgress(
  phase: ScheduledProjectPhase,
  hoursUsed: number,
): PhaseProgress {
  const roundedHours = Math.round(hoursUsed * 100) / 100;
  const hoursBudget = phase.budget_hours;
  const hoursPercent =
    hoursBudget > 0 ? Math.round((roundedHours / hoursBudget) * 100) : 0;

  const feeBudget = phase.budget_amount;
  let feeUsed: number | undefined;
  let feePercent: number | undefined;

  if (feeBudget != null && feeBudget > 0 && hoursBudget > 0) {
    feeUsed = Math.round((roundedHours / hoursBudget) * feeBudget * 100) / 100;
    feePercent = Math.round((feeUsed / feeBudget) * 100);
  }

  return {
    hoursUsed: roundedHours,
    hoursBudget,
    hoursPercent,
    feeBudget,
    feeUsed,
    feePercent,
  };
}

export function progressStatus(percent: number, hasBudget: boolean): PhaseProgressStatus {
  if (!hasBudget || percent <= 0) return "none";
  if (percent > 100) return "over";
  if (percent >= 85) return "near";
  return "under";
}

export function hoursOverlayClass(status: PhaseProgressStatus): string {
  switch (status) {
    case "over":
      return "bg-rose-700";
    case "near":
      return "bg-amber-600";
    case "under":
      return "bg-emerald-700";
    default:
      return "bg-slate-600";
  }
}

export function hoursStripClass(status: PhaseProgressStatus): string {
  switch (status) {
    case "over":
      return "bg-rose-600";
    case "near":
      return "bg-amber-500";
    case "under":
      return "bg-emerald-600";
    default:
      return "bg-slate-500";
  }
}

export function feeStripClass(status: PhaseProgressStatus): string {
  switch (status) {
    case "over":
      return "bg-rose-500";
    case "near":
      return "bg-amber-400";
    case "under":
      return "bg-amber-500";
    default:
      return "bg-amber-400";
  }
}

export function phaseProgressTitle(
  phaseKey: string,
  progress: PhaseProgress,
  dates?: { start?: string; end?: string },
): string {
  const parts = [phaseKey];
  if (dates?.start && dates?.end) {
    parts.push(`${dates.start} → ${dates.end}`);
  }
  if (progress.hoursBudget > 0) {
    parts.push(
      `${formatProjectHours(progress.hoursUsed)}h / ${formatProjectHours(progress.hoursBudget)}h (${progress.hoursPercent}%)`,
    );
  } else if (progress.hoursUsed > 0) {
    parts.push(`${formatProjectHours(progress.hoursUsed)}h logged`);
  }
  if (progress.feeBudget != null && progress.feeBudget > 0 && progress.feeUsed != null) {
    parts.push(
      `${formatProjectAmount(progress.feeUsed)} / ${formatProjectAmount(progress.feeBudget)} fee (${progress.feePercent}%)`,
    );
  }
  return parts.join(" · ");
}
