"use client";

import { formatProjectHours } from "@/lib/project-format";
import type { PhaseStaffingSegment } from "@/lib/gantt/phase-staffing";
import { barGeometry, type GanttZoom } from "@/lib/gantt/timeline";
import { cn } from "@/lib/utils";

const LANE_HEIGHT = 16;
const LANE_GAP = 2;

export function assignStaffingLanes(
  segments: PhaseStaffingSegment[],
): Map<string, number> {
  const sorted = [...segments].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate),
  );
  const laneEnds: string[] = [];
  const lanes = new Map<string, number>();

  for (const segment of sorted) {
    let lane = laneEnds.findIndex((end) => end < segment.startDate);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(segment.endDate);
    } else {
      laneEnds[lane] = segment.endDate;
    }
    lanes.set(segment.employeeId, lane);
  }

  return lanes;
}

export function staffingStripHeight(segments: PhaseStaffingSegment[]): number {
  if (segments.length === 0) return 0;
  const laneCount =
    Math.max(...Array.from(assignStaffingLanes(segments).values())) + 1;
  return laneCount * LANE_HEIGHT + (laneCount - 1) * LANE_GAP;
}

function staffingBarLabel(
  segment: PhaseStaffingSegment,
  width: number,
): string | null {
  const hours = `${formatProjectHours(segment.totalHours)}h`;
  if (width >= 88) return `${segment.firstName} · ${hours}`;
  if (width >= 52) return segment.firstName;
  if (width >= 28) return segment.initials;
  return null;
}

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

  const lanes = assignStaffingLanes(segments);
  const height = staffingStripHeight(segments);

  return (
    <div
      className={cn("relative w-full", className)}
      style={{ height }}
    >
      {segments.map((segment) => {
        const geom = barGeometry(segment.startDate, segment.endDate, rangeStart, zoom);
        if (!geom) return null;

        const lane = lanes.get(segment.employeeId) ?? 0;
        const width = Math.max(geom.width, 20);
        const label = staffingBarLabel(segment, width);
        const top = lane * (LANE_HEIGHT + LANE_GAP);

        return (
          <div
            key={segment.employeeId}
            className="absolute flex items-center overflow-hidden rounded border border-emerald-300/70 bg-emerald-50 px-1.5 shadow-sm"
            style={{
              left: geom.left,
              width,
              top,
              height: LANE_HEIGHT,
              zIndex: lane + 1,
            }}
            title={`${segment.employeeName} · ${formatProjectHours(segment.totalHours)}h scheduled`}
          >
            {label && (
              <span className="truncate text-[10px] font-medium leading-none text-emerald-900">
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
