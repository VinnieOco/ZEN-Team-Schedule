"use client";

import { phaseAbbreviation, phaseBarColors } from "@/lib/gantt/phase-display";
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
  const colors = phaseBarColors(segment.phase.phase_key);
  const label = phaseAbbreviation(segment.phase.phase_key);
  const showLabel = width >= 28;

  return (
    <div
      className="absolute top-2 h-8"
      style={{ left, width }}
      title={`${segment.phase.phase_key}${segment.phase.start_date ? ` · ${segment.phase.start_date}` : ""}${segment.phase.end_date ? ` → ${segment.phase.end_date}` : ""}`}
    >
      <div
        className={cn(
          "relative flex h-full items-center overflow-hidden rounded-md border shadow-sm",
          canEdit && "cursor-grab active:cursor-grabbing",
        )}
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          color: colors.text,
        }}
        onPointerDown={canEdit ? onPointerDownMove : undefined}
      >
        {canEdit && (
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
            {label}
          </span>
        )}
        {segment.percentUsed > 0 && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-1 bg-slate-900/25"
            style={{ width: `${segment.percentUsed}%` }}
          />
        )}
        {canEdit && (
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
