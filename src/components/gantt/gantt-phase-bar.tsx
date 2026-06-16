"use client";

import { GanttPhaseProgressOverlay } from "@/components/gantt/phase-progress-bar";
import { phaseAbbreviation, phaseBarColors } from "@/lib/gantt/phase-display";
import { phaseProgressTitle } from "@/lib/gantt/phase-progress";
import type { GanttPhaseSegment } from "@/lib/gantt/build-gantt-rows";
import { cn } from "@/lib/utils";

interface GanttPhaseBarProps {
  segment: GanttPhaseSegment;
  left: number;
  width: number;
  canEdit: boolean;
  onPointerDownMove: (e: React.PointerEvent) => void;
  onPointerDownResizeStart: (e: React.PointerEvent) => void;
  onPointerDownResizeEnd: (e: React.PointerEvent) => void;
}

export function GanttPhaseBar({
  segment,
  left,
  width,
  canEdit,
  onPointerDownMove,
  onPointerDownResizeStart,
  onPointerDownResizeEnd,
}: GanttPhaseBarProps) {
  const isProjectSpan = segment.isProjectSpan === true;
  const editable = canEdit && !isProjectSpan;
  const colors = phaseBarColors(segment.phase.phase_key);
  const label = phaseAbbreviation(segment.phase.phase_key);
  const showLabel = width >= 28;
  const showPercent =
    width >= 52 &&
    segment.progress.hoursBudget > 0 &&
    segment.progress.hoursPercent > 0;
  const tooltip = phaseProgressTitle(segment.phase.phase_key, segment.progress, {
    start: segment.phase.start_date,
    end: segment.phase.end_date,
  });

  return (
    <div className="absolute top-2 h-8" style={{ left, width }} title={tooltip}>
      <div
        className={cn(
          "relative flex h-full items-center overflow-hidden rounded-md border shadow-sm",
          editable && "cursor-grab active:cursor-grabbing",
          isProjectSpan && "border-dashed",
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
        onPointerDown={editable ? onPointerDownMove : undefined}
      >
        <GanttPhaseProgressOverlay progress={segment.progress} />
        {editable && (
          <div
            className="absolute left-0 top-0 z-10 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDownResizeStart(e);
            }}
          />
        )}
        {showLabel && (
          <span className="pointer-events-none relative z-[1] truncate px-1.5 text-[10px] font-semibold">
            {showPercent ? `${label} ${segment.progress.hoursPercent}%` : label}
          </span>
        )}
        {editable && (
          <div
            className="absolute right-0 top-0 z-10 h-full w-2 cursor-ew-resize"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDownResizeEnd(e);
            }}
          />
        )}
      </div>
    </div>
  );
}
