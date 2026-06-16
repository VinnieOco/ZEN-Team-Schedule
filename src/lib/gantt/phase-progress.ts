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

export function hoursForPhase(
  timeEntries: Pick<TimeEntry, "project_id" | "phase" | "hours">[],
  projectId: string,
  phaseKey: string,
): number {
  return timeEntries
    .filter(
      (e) =>
        e.project_id === projectId &&
        (e.phase?.trim() === phaseKey || (!e.phase?.trim() && phaseKey === "Concept")),
    )
    .reduce((sum, e) => sum + e.hours, 0);
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
