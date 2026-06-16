"use client";

import { format } from "date-fns";
import { useMemo } from "react";

import { GanttMilestoneMarkers } from "@/components/gantt/gantt-milestone-markers";
import { GanttPhaseBar } from "@/components/gantt/gantt-phase-bar";
import {
  GanttPhaseStaffingStrip,
  GANTT_STAFFING_STRIP_HEIGHT,
} from "@/components/gantt/gantt-phase-staffing-strip";
import { GanttProjectLabel } from "@/components/gantt/gantt-project-label";
import type { GanttProjectRow } from "@/lib/gantt/build-gantt-rows";
import { movePhaseByDays, resizePhaseEnd, resizePhaseStart } from "@/lib/gantt/phase-links";
import { staffingForProject } from "@/lib/gantt/phase-staffing";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import {
  barGeometry,
  dayDeltaFromPixels,
  GANTT_ROW_HEIGHT_PX,
  type GanttZoom,
} from "@/lib/gantt/timeline";
import type { Allocation, Employee, ProjectMilestone, ScheduledProjectPhase } from "@/types";

export type GanttDragMode = "move" | "resize-start" | "resize-end";

export interface GanttDragState {
  projectId: string;
  phaseId: string;
  mode: GanttDragMode;
  startX: number;
  originStart?: string;
  originEnd?: string;
}

interface GanttProjectRowViewProps {
  row: GanttProjectRow;
  rangeStart: Date;
  zoom: GanttZoom;
  timelineWidth: number;
  canEdit: boolean;
  projectPhases: ScheduledProjectPhase[];
  allocations: Allocation[];
  employees: Employee[];
  milestones: ProjectMilestone[];
  dragState: GanttDragState | null;
  onDragStart: (state: GanttDragState) => void;
}

export function GanttProjectRowView({
  row,
  rangeStart,
  zoom,
  timelineWidth,
  canEdit,
  projectPhases,
  allocations,
  employees,
  milestones,
  dragState,
  onDragStart,
}: GanttProjectRowViewProps) {
  const phases = phasesForProject(projectPhases, row.project.id);
  const previewPhases =
    dragState?.projectId === row.project.id ? phases : row.phases.map((s) => s.phase);

  const projectStaffing = useMemo(
    () =>
      staffingForProject(
        allocations,
        employees,
        row.project.id,
        phases.length > 0 ? phases : row.phases.map((s) => s.phase),
      ),
    [allocations, employees, row.project.id, phases, row.phases],
  );

  const rowHeight =
    GANTT_ROW_HEIGHT_PX +
    (projectStaffing.length > 0 ? GANTT_STAFFING_STRIP_HEIGHT + 6 : 0);

  return (
    <div className="flex" style={{ height: rowHeight }}>
      <GanttProjectLabel row={row} />
      <div
        className="relative flex flex-col border-b border-slate-200 bg-white"
        style={{ width: timelineWidth, minWidth: timelineWidth }}
      >
        <div className="relative flex-1">
          <GanttMilestoneMarkers
            milestones={milestones}
            rangeStart={rangeStart}
            zoom={zoom}
            compact
          />
          {row.phases.map((segment) => {
          const phase = previewPhases.find((p) => p.id === segment.phase.id) ?? segment.phase;
          const geom = barGeometry(phase.start_date, phase.end_date, rangeStart, zoom);
          if (!geom) return null;
          const editable = canEdit && !segment.isProjectSpan;

          return (
            <GanttPhaseBar
              key={segment.phase.id}
              segment={{ ...segment, phase }}
              left={geom.left}
              width={geom.width}
              canEdit={editable}
              onPointerDownMove={(e) => {
                if (!phase.start_date || !phase.end_date) return;
                onDragStart({
                  projectId: row.project.id,
                  phaseId: phase.id,
                  mode: "move",
                  startX: e.clientX,
                  originStart: phase.start_date,
                  originEnd: phase.end_date,
                });
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerDownResizeStart={(e) => {
                if (!phase.start_date || !phase.end_date) return;
                onDragStart({
                  projectId: row.project.id,
                  phaseId: phase.id,
                  mode: "resize-start",
                  startX: e.clientX,
                  originStart: phase.start_date,
                  originEnd: phase.end_date,
                });
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerDownResizeEnd={(e) => {
                if (!phase.start_date || !phase.end_date) return;
                onDragStart({
                  projectId: row.project.id,
                  phaseId: phase.id,
                  mode: "resize-end",
                  startX: e.clientX,
                  originStart: phase.start_date,
                  originEnd: phase.end_date,
                });
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
            />
          );
        })}
        </div>
        <GanttPhaseStaffingStrip
          segments={projectStaffing}
          rangeStart={rangeStart}
          zoom={zoom}
          className="px-0 pb-1"
        />
      </div>
    </div>
  );
}

export function commitGanttDrag(
  projectPhases: ScheduledProjectPhase[],
  drag: GanttDragState,
  deltaPx: number,
  zoom: GanttZoom,
): ScheduledProjectPhase[] {
  const phases = phasesForProject(projectPhases, drag.projectId);
  const dayDelta = dayDeltaFromPixels(deltaPx, zoom);

  if (drag.mode === "move") {
    return movePhaseByDays(phases, drag.phaseId, dayDelta);
  }
  if (drag.mode === "resize-end" && drag.originEnd) {
    const end = new Date(drag.originEnd);
    end.setDate(end.getDate() + dayDelta);
    return resizePhaseEnd(phases, drag.phaseId, format(end, "yyyy-MM-dd"));
  }
  if (drag.mode === "resize-start" && drag.originStart) {
    const start = new Date(drag.originStart);
    start.setDate(start.getDate() + dayDelta);
    return resizePhaseStart(phases, drag.phaseId, format(start, "yyyy-MM-dd"));
  }
  return phases;
}
