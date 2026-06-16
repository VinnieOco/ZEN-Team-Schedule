import { computePhaseProgress, hoursForPhase } from "@/lib/gantt/phase-progress";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import type { PhaseProgress } from "@/lib/gantt/phase-progress";
import type { Project, ScheduledProjectPhase, TimeEntry } from "@/types";

export interface GanttPhaseSegment {
  phase: ScheduledProjectPhase;
  progress: PhaseProgress;
}

export interface GanttProjectRow {
  project: Project;
  phases: GanttPhaseSegment[];
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
        const hoursUsed = hoursForPhase(timeEntries, project.id, phase.phase_key);
        return { phase, progress: computePhaseProgress(phase, hoursUsed) };
      });
      return { project, phases };
    })
    .filter((row) => row.phases.length > 0);
}
