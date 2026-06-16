"use client";

import { GanttPhaseBar } from "@/components/gantt/gantt-phase-bar";
import { phaseBarColors } from "@/lib/gantt/phase-display";
import type { GanttPhaseSegment } from "@/lib/gantt/build-gantt-rows";
import type { GanttDragState } from "@/components/gantt/gantt-project-row";
import { barGeometry, type GanttZoom } from "@/lib/gantt/timeline";
import type { ScheduledProjectPhase } from "@/types";

const PHASE_LABEL_WIDTH = 160;
const PHASE_ROW_HEIGHT = 44;

interface GanttPhaseRowViewProps {
  segment: GanttPhaseSegment;
  projectId: string;
  rangeStart: Date;
  zoom: GanttZoom;
  timelineWidth: number;
  canEdit: boolean;
  dragState: GanttDragState | null;
  onDragStart: (state: GanttDragState) => void;
  phaseOverride?: ScheduledProjectPhase;
}

export function GanttPhaseRowView({
  segment,
  projectId,
  rangeStart,
  zoom,
  timelineWidth,
  canEdit,
  dragState,
  onDragStart,
  phaseOverride,
}: GanttPhaseRowViewProps) {
  const phase = phaseOverride ?? segment.phase;
  const geom = barGeometry(phase.start_date, phase.end_date, rangeStart, zoom);
  const colors = phaseBarColors(phase.phase_key);

  return (
    <div className="flex border-b border-slate-100" style={{ height: PHASE_ROW_HEIGHT }}>
      <div
        className="flex shrink-0 items-center border-r border-slate-200 px-2 text-xs font-medium"
        style={{ width: PHASE_LABEL_WIDTH, color: colors.text }}
      >
        <span className="truncate">{phase.phase_key}</span>
      </div>
      <div className="relative flex-1" style={{ width: timelineWidth, minWidth: timelineWidth }}>
        {geom && (
          <GanttPhaseBar
            segment={{ ...segment, phase }}
            left={geom.left}
            width={geom.width}
            canEdit={canEdit}
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
    </div>
  );
}

export { PHASE_LABEL_WIDTH, PHASE_ROW_HEIGHT };
