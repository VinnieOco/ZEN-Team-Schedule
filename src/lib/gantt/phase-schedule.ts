import { addDays, addWeeks, format, parseISO } from "date-fns";

import { defaultPhaseKeysForProject } from "@/lib/gantt/phase-display";
import { PROJECT_PHASES } from "@/lib/project-options";
import type { Project, ProjectPhase, ScheduledProjectPhase } from "@/types";

function generateId(): string {
  return crypto.randomUUID();
}

/** Phase keys not already on this project's schedule. */
export function availablePhaseKeysToAdd(
  project: Project,
  currentPhases: ScheduledProjectPhase[],
): ProjectPhase[] {
  const used = new Set(currentPhases.map((p) => p.phase_key));
  const preferred = defaultPhaseKeysForProject(project);
  const pool = [...new Set([...preferred, ...PROJECT_PHASES])];
  return pool.filter((key) => !used.has(key));
}

export function createPhaseForProject(
  project: Project,
  phaseKey: ProjectPhase,
  existingPhases: ScheduledProjectPhase[],
): ScheduledProjectPhase {
  const sortOrder = existingPhases.length;
  const lastPhase = existingPhases[existingPhases.length - 1];

  let start: Date;
  if (lastPhase?.end_date) {
    start = addDays(parseISO(lastPhase.end_date), 1);
  } else if (project.start_date) {
    start = parseISO(project.start_date);
  } else {
    start = new Date();
  }

  const end = addWeeks(start, 2);
  const usedHours = existingPhases.reduce((sum, p) => sum + p.budget_hours, 0);
  const remainingHours = Math.max(0, project.budgeted_design_hours - usedHours);
  const usedAmount = existingPhases.reduce((sum, p) => sum + (p.budget_amount ?? 0), 0);
  const designAmount = project.design_amount ?? 0;
  const remainingAmount = Math.max(0, designAmount - usedAmount);

  return {
    id: generateId(),
    project_id: project.id,
    phase_key: phaseKey,
    sort_order: sortOrder,
    start_date: format(start, "yyyy-MM-dd"),
    end_date: format(end, "yyyy-MM-dd"),
    budget_hours: Math.round(remainingHours * 10) / 10,
    budget_amount:
      designAmount > 0 ? Math.round(remainingAmount * 100) / 100 : undefined,
    linked_to_previous: sortOrder > 0,
  };
}

export function removePhaseFromSchedule(
  phases: ScheduledProjectPhase[],
  phaseId: string,
): ScheduledProjectPhase[] {
  return phases
    .filter((p) => p.id !== phaseId)
    .map((phase, index) => ({
      ...phase,
      sort_order: index,
      linked_to_previous: index === 0 ? false : phase.linked_to_previous,
    }));
}

export function addPhaseToSchedule(
  project: Project,
  phases: ScheduledProjectPhase[],
  phaseKey: ProjectPhase,
): ScheduledProjectPhase[] {
  return [...phases, createPhaseForProject(project, phaseKey, phases)];
}
