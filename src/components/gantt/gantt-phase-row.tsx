"use client";

import { useMemo } from "react";

import { GanttPhaseBar } from "@/components/gantt/gantt-phase-bar";
import {
  GanttPhaseStaffingStrip,
  staffingStripHeight,
} from "@/components/gantt/gantt-phase-staffing-strip";
import type { GanttPhaseSegment } from "@/lib/gantt/build-gantt-rows";
import { staffingForPhase } from "@/lib/gantt/phase-staffing";
import type { GanttDragState } from "@/components/gantt/gantt-project-row";
import { barGeometry, type GanttZoom } from "@/lib/gantt/timeline";
import type { Allocation, Employee, ScheduledProjectPhase } from "@/types";

const PHASE_LABEL_WIDTH = 160;
/** Matches GanttPhaseBar (`top-2` + `h-8`). */
const PHASE_BAR_TRACK_HEIGHT = 40;
const STAFFING_GAP = 4;

interface GanttPhaseRowViewProps {
  segment: GanttPhaseSegment;
  projectId: string;
  rangeStart: Date;
  zoom: GanttZoom;
  timelineWidth: number;
  canEdit: boolean;
  allocations: Allocation[];
  employees: Employee[];
  dragState: GanttDragState | null;
  onDragStart: (state: GanttDragState) => void;
  phaseOverride?: ScheduledProjectPhase;
  /** Committed phase dates for staffing — avoids row layout shifts while dragging. */
  staffingPhase?: ScheduledProjectPhase;
}

export function GanttPhaseRowView({
  segment,
  projectId,
  rangeStart,
  zoom,
  timelineWidth,
  canEdit,
  allocations,
  employees,
  dragState,
  onDragStart,
  phaseOverride,
  staffingPhase,
}: GanttPhaseRowViewProps) {
  const phase = phaseOverride ?? segment.phase;
  const geom = barGeometry(phase.start_date, phase.end_date, rangeStart, zoom);
  const editable = canEdit && !segment.isProjectSpan;

  const staffing = useMemo(
    () =>
      staffingForPhase(
        allocations,
        employees,
        projectId,
        staffingPhase ?? phase,
      ),
    [allocations, employees, projectId, staffingPhase, phase],
  );

  const staffingHeight = staffingStripHeight(staffing);
  const rowHeight =
    PHASE_BAR_TRACK_HEIGHT +
    (staffingHeight > 0 ? STAFFING_GAP + staffingHeight : 0);

  return (
    <div className="flex border-b border-slate-100" style={{ height: rowHeight }}>
      <div
        className="flex shrink-0 items-center border-r border-slate-200 px-2 text-xs font-medium"
        style={{ width: PHASE_LABEL_WIDTH, height: rowHeight }}
      >
        <span className="truncate text-slate-900">{phase.phase_key}</span>
      </div>
      <div
        className="relative shrink-0"
        style={{ width: timelineWidth, minWidth: timelineWidth, height: rowHeight }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: PHASE_BAR_TRACK_HEIGHT }}
        >
          {geom && (
            <GanttPhaseBar
              segment={{ ...segment, phase }}
              left={geom.left}
              width={geom.width}
              canEdit={editable}
              onPointerDownMove={(e) => {
                if (!phase.start_date || !phase.end_date) return;
                onDragStart({
                  projectId,
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
                  projectId,
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
                  projectId,
                  phaseId: phase.id,
                  mode: "resize-end",
                  startX: e.clientX,
                  originStart: phase.start_date,
                  originEnd: phase.end_date,
                });
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
            />
          )}
          {!geom && (
            <p className="px-2 py-3 text-[10px] text-muted-foreground">Set dates to show on timeline</p>
          )}
        </div>
        {staffingHeight > 0 && (
          <div
            className="absolute inset-x-0"
            style={{
              top: PHASE_BAR_TRACK_HEIGHT + STAFFING_GAP,
              height: staffingHeight,
            }}
          >
            <GanttPhaseStaffingStrip
              segments={staffing}
              rangeStart={rangeStart}
              zoom={zoom}
              className="h-full"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { PHASE_LABEL_WIDTH };
