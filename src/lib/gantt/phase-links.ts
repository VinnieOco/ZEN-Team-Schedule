import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { ScheduledProjectPhase } from "@/types";

function sortPhases(phases: ScheduledProjectPhase[]): ScheduledProjectPhase[] {
  return [...phases].sort((a, b) => a.sort_order - b.sort_order);
}

function phaseDurationDays(phase: ScheduledProjectPhase): number {
  if (!phase.start_date || !phase.end_date) return 7;
  return Math.max(differenceInCalendarDays(parseISO(phase.end_date), parseISO(phase.start_date)), 1);
}

function pushLinkedSuccessors(
  phases: ScheduledProjectPhase[],
  fromIndex: number,
): ScheduledProjectPhase[] {
  const next = phases.map((p) => ({ ...p }));
  for (let i = fromIndex + 1; i < next.length; i++) {
    if (!next[i].linked_to_previous) break;
    const prev = next[i - 1];
    if (!prev.end_date || !next[i].start_date || !next[i].end_date) continue;
    const duration = phaseDurationDays(next[i]);
    const newStart = addDays(parseISO(prev.end_date), 1);
    next[i] = {
      ...next[i],
      start_date: format(newStart, "yyyy-MM-dd"),
      end_date: format(addDays(newStart, duration), "yyyy-MM-dd"),
    };
  }
  return next;
}

/** Update one phase's dates and shift linked successors. */
export function applyPhaseDateChange(
  projectPhases: ScheduledProjectPhase[],
  phaseId: string,
  start_date: string,
  end_date: string,
): ScheduledProjectPhase[] {
  const sorted = sortPhases(projectPhases);
  const index = sorted.findIndex((p) => p.id === phaseId);
  if (index === -1) return projectPhases;

  const updated = sorted.map((p) => ({ ...p }));
  updated[index] = { ...updated[index], start_date, end_date };
  return pushLinkedSuccessors(updated, index);
}

/** Move a phase by a day delta, preserving duration. */
export function movePhaseByDays(
  projectPhases: ScheduledProjectPhase[],
  phaseId: string,
  dayDelta: number,
): ScheduledProjectPhase[] {
  const phase = projectPhases.find((p) => p.id === phaseId);
  if (!phase?.start_date || !phase.end_date || dayDelta === 0) return projectPhases;
  const start = addDays(parseISO(phase.start_date), dayDelta);
  const end = addDays(parseISO(phase.end_date), dayDelta);
  return applyPhaseDateChange(
    projectPhases,
    phaseId,
    format(start, "yyyy-MM-dd"),
    format(end, "yyyy-MM-dd"),
  );
}

/** Resize phase end date (drag right handle). */
export function resizePhaseEnd(
  projectPhases: ScheduledProjectPhase[],
  phaseId: string,
  newEndDate: string,
): ScheduledProjectPhase[] {
  const phase = projectPhases.find((p) => p.id === phaseId);
  if (!phase?.start_date) return projectPhases;
  const start = parseISO(phase.start_date);
  const end = parseISO(newEndDate);
  if (end < start) return projectPhases;
  return applyPhaseDateChange(
    projectPhases,
    phaseId,
    phase.start_date,
    format(end, "yyyy-MM-dd"),
  );
}

/** Resize phase start date (drag left handle). */
export function resizePhaseStart(
  projectPhases: ScheduledProjectPhase[],
  phaseId: string,
  newStartDate: string,
): ScheduledProjectPhase[] {
  const phase = projectPhases.find((p) => p.id === phaseId);
  if (!phase?.end_date) return projectPhases;
  const start = parseISO(newStartDate);
  const end = parseISO(phase.end_date);
  if (start > end) return projectPhases;
  return applyPhaseDateChange(
    projectPhases,
    phaseId,
    format(start, "yyyy-MM-dd"),
    phase.end_date,
  );
}
