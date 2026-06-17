import { format, parseISO } from "date-fns";

import type { GanttDragMode } from "@/components/gantt/gantt-project-row";
import type { ScheduledProjectPhase } from "@/types";

export interface GanttPhaseDateChange {
  phaseId: string;
  phaseKey: string;
  previousStart?: string;
  previousEnd?: string;
  nextStart?: string;
  nextEnd?: string;
}

export function ganttDragModeLabel(mode: GanttDragMode): string {
  switch (mode) {
    case "move":
      return "Move schedule";
    case "resize-start":
      return "Change start date";
    case "resize-end":
      return "Change end date";
  }
}

export function formatGanttPhaseDate(value?: string): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function projectPhasesDateChanged(
  before: ScheduledProjectPhase[],
  after: ScheduledProjectPhase[],
): boolean {
  const afterById = new Map(after.map((phase) => [phase.id, phase]));
  return before.some((phase) => {
    const next = afterById.get(phase.id);
    if (!next) return false;
    return phase.start_date !== next.start_date || phase.end_date !== next.end_date;
  });
}

export function describeGanttPhaseDateChanges(
  before: ScheduledProjectPhase[],
  after: ScheduledProjectPhase[],
): GanttPhaseDateChange[] {
  const afterById = new Map(after.map((phase) => [phase.id, phase]));
  const changes: GanttPhaseDateChange[] = [];

  for (const phase of before) {
    const next = afterById.get(phase.id);
    if (!next) continue;
    if (phase.start_date === next.start_date && phase.end_date === next.end_date) continue;
    changes.push({
      phaseId: phase.id,
      phaseKey: phase.phase_key,
      previousStart: phase.start_date,
      previousEnd: phase.end_date,
      nextStart: next.start_date,
      nextEnd: next.end_date,
    });
  }

  return changes;
}
