import { addDays, addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

import { defaultPhaseKeysForProject } from "@/lib/gantt/phase-display";
import type { Project, ScheduledProjectPhase } from "@/types";

function generateId(): string {
  return crypto.randomUUID();
}

/** Spread standard phases between project start and design completion. */
export function seedPhasesForProject(project: Project): ScheduledProjectPhase[] {
  const keys = defaultPhaseKeysForProject(project);
  const start = project.start_date ? parseISO(project.start_date) : new Date();
  const end = project.target_completion_date
    ? parseISO(project.target_completion_date)
    : addMonths(start, Math.max(keys.length, 6));

  const totalDays = Math.max(differenceInCalendarDays(end, start), keys.length);
  const perPhase = Math.max(Math.floor(totalDays / keys.length), 7);
  const hoursEach =
    keys.length > 0 ? Math.round((project.budgeted_design_hours / keys.length) * 10) / 10 : 0;
  const amountEach =
    project.design_amount != null
      ? Math.round((project.design_amount / keys.length) * 100) / 100
      : undefined;

  return keys.map((phase_key, index) => {
    const phaseStart = addDays(start, index * perPhase);
    const phaseEnd =
      index === keys.length - 1 ? end : addDays(start, (index + 1) * perPhase - 1);

    return {
      id: generateId(),
      project_id: project.id,
      phase_key,
      sort_order: index,
      start_date: format(phaseStart, "yyyy-MM-dd"),
      end_date: format(phaseEnd, "yyyy-MM-dd"),
      budget_hours: hoursEach,
      budget_amount: amountEach,
      linked_to_previous: index > 0,
    };
  });
}

export function phasesForProject(
  allPhases: ScheduledProjectPhase[],
  projectId: string,
): ScheduledProjectPhase[] {
  return allPhases
    .filter((p) => p.project_id === projectId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function projectsNeedingPhaseSeed(
  projects: Project[],
  allPhases: ScheduledProjectPhase[],
): Project[] {
  const withPhases = new Set(allPhases.map((p) => p.project_id));
  return projects.filter(
    (p) => p.active && !p.is_change_order && !withPhases.has(p.id),
  );
}
