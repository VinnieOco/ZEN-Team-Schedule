"use client";

import { formatProjectHours } from "@/lib/project-format";
import type { PhaseStaffingSegment } from "@/lib/gantt/phase-staffing";
import { barGeometry, type GanttZoom } from "@/lib/gantt/timeline";
import { cn } from "@/lib/utils";

export const GANTT_STAFFING_STRIP_HEIGHT = 18;

interface GanttPhaseStaffingStripProps {
  segments: PhaseStaffingSegment[];
  rangeStart: Date;
  zoom: GanttZoom;
  className?: string;
}

export function GanttPhaseStaffingStrip({
  segments,
  rangeStart,
  zoom,
  className,
}: GanttPhaseStaffingStripProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height: GANTT_STAFFING_STRIP_HEIGHT }}
    >
      {segments.map((segment, index) => {
        const geom = barGeometry(segment.startDate, segment.endDate, rangeStart, zoom);
        if (!geom) return null;

        const width = Math.max(geom.width, 18);
        const showInitials = width >= 16;

        return (
          <div
            key={segment.employeeId}
            className="absolute flex items-center overflow-hidden rounded-full border border-emerald-300/80 bg-emerald-50 px-1 shadow-sm"
            style={{
              left: geom.left,
              width,
              top: index % 2 === 1 ? 9 : 0,
              height: 14,
              zIndex: index + 1,
            }}
            title={`${segment.employeeName} · ${formatProjectHours(segment.totalHours)}h scheduled`}
          >
            {showInitials && (
              <span className="w-full truncate text-center text-[9px] font-semibold text-emerald-900">
                {segment.initials}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
