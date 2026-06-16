import { getChangeOrdersForParent, isChangeOrder } from "@/lib/change-orders";
import { computePhaseProgress, buildPhaseHoursAllocation } from "@/lib/gantt/phase-progress";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import { getProjectActualHours } from "@/lib/utilization";
import type { PhaseProgress } from "@/lib/gantt/phase-progress";
import type { Project, ScheduledProjectPhase, TimeEntry } from "@/types";

export interface GanttPhaseSegment {
  phase: ScheduledProjectPhase;
  progress: PhaseProgress;
  /** Read-only bar from project dates when no phase schedule exists. */
  isProjectSpan?: boolean;
}

export interface GanttProjectRow {
  project: Project;
  phases: GanttPhaseSegment[];
  isChangeOrder: boolean;
}

function buildSegmentsForProject(
  project: Project,
  allPhases: ScheduledProjectPhase[],
  timeEntries: TimeEntry[],
): GanttPhaseSegment[] {
  const scheduled = phasesForProject(allPhases, project.id);
  if (scheduled.length > 0) {
    const hoursByPhase = buildPhaseHoursAllocation(scheduled, timeEntries, project.id);
    return scheduled.map((phase) => {
      const hoursUsed = hoursByPhase.get(phase.phase_key) ?? 0;
      return { phase, progress: computePhaseProgress(phase, hoursUsed) };
    });
  }

  const start = project.start_date;
  const end = project.target_completion_date ?? project.estimating_completion_date;
  if (!start || !end) return [];

  const spanPhase: ScheduledProjectPhase = {
    id: `project-span-${project.id}`,
    project_id: project.id,
    phase_key: isChangeOrder(project) ? "Change order" : "Schedule",
    sort_order: 0,
    start_date: start,
    end_date: end,
    budget_hours: project.budgeted_design_hours,
    linked_to_previous: false,
  };
  const hoursUsed = getProjectActualHours(timeEntries, project.id);
  return [
    {
      phase: spanPhase,
      progress: computePhaseProgress(spanPhase, hoursUsed),
      isProjectSpan: true,
    },
  ];
}

function rowHasTimeline(row: GanttProjectRow): boolean {
  return row.phases.length > 0;
}

export function buildGanttRows(
  projects: Project[],
  allPhases: ScheduledProjectPhase[],
  timeEntries: TimeEntry[],
  options?: { activeOnly?: boolean },
): GanttProjectRow[] {
  const activeOnly = options?.activeOnly ?? true;
  const rows: GanttProjectRow[] = [];

  const parents = projects
    .filter((p) => !isChangeOrder(p))
    .filter((p) => !activeOnly || p.active)
    .sort((a, b) => a.project_name.localeCompare(b.project_name));

  for (const parent of parents) {
    const parentRow: GanttProjectRow = {
      project: parent,
      phases: buildSegmentsForProject(parent, allPhases, timeEntries),
      isChangeOrder: false,
    };

    const changeOrderRows: GanttProjectRow[] = getChangeOrdersForParent(projects, parent.id)
      .filter((co) => !activeOnly || co.active)
      .map((co) => ({
        project: co,
        phases: buildSegmentsForProject(co, allPhases, timeEntries),
        isChangeOrder: true,
      }));

    const hasChangeOrderTimeline = changeOrderRows.some(rowHasTimeline);
    const hasParentTimeline = rowHasTimeline(parentRow);

    if (!hasParentTimeline && !hasChangeOrderTimeline) continue;

    rows.push(parentRow);
    for (const coRow of changeOrderRows) {
      if (rowHasTimeline(coRow)) {
        rows.push(coRow);
      }
    }
  }

  return rows;
}

export function matchesGanttSearch(project: Project, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    project.project_name.toLowerCase().includes(q) ||
    project.client_name.toLowerCase().includes(q) ||
    (project.project_number?.toLowerCase().includes(q) ?? false)
  );
}

export function filterGanttRows(
  rows: GanttProjectRow[],
  projects: Project[],
  query: string,
): GanttProjectRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  const matchingParentIds = new Set(
    rows
      .filter((row) => !row.isChangeOrder && matchesGanttSearch(row.project, q))
      .map((row) => row.project.id),
  );

  const parentsWithMatchingChangeOrders = new Set(
    projects
      .filter((p) => isChangeOrder(p) && p.parent_project_id && matchesGanttSearch(p, q))
      .map((p) => p.parent_project_id as string),
  );

  return rows.filter((row) => {
    if (matchesGanttSearch(row.project, q)) return true;
    if (!row.isChangeOrder && parentsWithMatchingChangeOrders.has(row.project.id)) return true;
    if (
      row.isChangeOrder &&
      row.project.parent_project_id &&
      matchingParentIds.has(row.project.parent_project_id)
    ) {
      return true;
    }
    return false;
  });
}
