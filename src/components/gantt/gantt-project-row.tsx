"use client";

import { format } from "date-fns";

import { GanttMilestoneMarkers } from "@/components/gantt/gantt-milestone-markers";
import { GanttPhaseBar } from "@/components/gantt/gantt-phase-bar";
import { GanttProjectLabel } from "@/components/gantt/gantt-project-label";
import type { GanttProjectRow } from "@/lib/gantt/build-gantt-rows";
import { movePhaseByDays, resizePhaseEnd, resizePhaseStart } from "@/lib/gantt/phase-links";
import { phasesForProject } from "@/lib/gantt/seed-phases";
import {
  barGeometry,
  dayDeltaFromPixels,
  GANTT_ROW_HEIGHT_PX,
  offsetPxToDate,
  type GanttZoom,
} from "@/lib/gantt/timeline";
import type { ProjectMilestone, ScheduledProjectPhase } from "@/types";

export type GanttDragMode = "move" | "resize-start" | "resize-end";

export interface GanttDragState {
  projectId: string;
  phaseId: string;
  mode: GanttDragMode;
  startX: number;
  originStart?: string;
  originEnd?: string;
}

export interface GanttTimelineContextRequest {
  clientX: number;
  clientY: number;
  date: string;
}

interface GanttProjectRowViewProps {
  row: GanttProjectRow;
  rangeStart: Date;
  zoom: GanttZoom;
  timelineWidth: number;
  canEdit: boolean;
  projectPhases: ScheduledProjectPhase[];
  milestones: ProjectMilestone[];
  dragState: GanttDragState | null;
  onDragStart: (state: GanttDragState) => void;
  onTimelineContextMenu?: (request: GanttTimelineContextRequest) => void;
}

export function GanttProjectRowView({
  row,
  rangeStart,
  zoom,
  timelineWidth,
  canEdit,
  projectPhases,
  milestones,
  dragState,
  onDragStart,
  onTimelineContextMenu,
}: GanttProjectRowViewProps) {
  const phases = phasesForProject(projectPhases, row.project.id);
  const previewPhases =
    dragState?.projectId === row.project.id ? phases : row.phases.map((s) => s.phase);

  return (
    <div className="flex" style={{ height: GANTT_ROW_HEIGHT_PX }}>
      <GanttProjectLabel row={row} className="relative z-10" />
      <div
        className="relative overflow-hidden border-b border-slate-200 bg-white"
        style={{ width: timelineWidth, minWidth: timelineWidth }}
        onContextMenu={(event) => {
          if (!canEdit || !onTimelineContextMenu || dragState) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const offsetPx = event.clientX - rect.left;
          const date = format(offsetPxToDate(offsetPx, rangeStart, zoom), "yyyy-MM-dd");
          onTimelineContextMenu({
            clientX: event.clientX,
            clientY: event.clientY,
            date,
          });
        }}
      >
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
