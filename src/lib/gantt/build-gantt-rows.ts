import { phasesForProject } from "@/lib/gantt/seed-phases";
import type { Project, ScheduledProjectPhase, TimeEntry } from "@/types";

export interface GanttPhaseSegment {
  phase: ScheduledProjectPhase;
  hoursUsed: number;
  percentUsed: number;
}

export interface GanttProjectRow {
  project: Project;
  phases: GanttPhaseSegment[];
}

function hoursForPhase(timeEntries: TimeEntry[], projectId: string, phaseKey: string): number {
  return timeEntries
    .filter(
      (e) =>
        e.project_id === projectId &&
        (e.phase?.trim() === phaseKey || (!e.phase?.trim() && phaseKey === "Concept")),
    )
    .reduce((sum, e) => sum + e.hours, 0);
}

export function buildGanttRows(
  projects: Project[],
  allPhases: ScheduledProjectPhase[],
  timeEntries: TimeEntry[],
  options?: { activeOnly?: boolean },
): GanttProjectRow[] {
  const activeOnly = options?.activeOnly ?? true;
  return projects
    .filter((p) => {
      if (p.is_change_order) return false;
      if (activeOnly && !p.active) return false;
      return true;
    })
    .sort((a, b) => a.project_name.localeCompare(b.project_name))
    .map((project) => {
      const phases = phasesForProject(allPhases, project.id).map((phase) => {
        const hoursUsed = Math.round(hoursForPhase(timeEntries, project.id, phase.phase_key) * 10) / 10;
        const percentUsed =
          phase.budget_hours > 0 ? Math.min(100, Math.round((hoursUsed / phase.budget_hours) * 100)) : 0;
        return { phase, hoursUsed, percentUsed };
      });
      return { project, phases };
    })
    .filter((row) => row.phases.length > 0);
}
