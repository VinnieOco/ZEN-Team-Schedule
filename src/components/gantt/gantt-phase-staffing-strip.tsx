"use client";

import { formatProjectHours } from "@/lib/project-format";
import type { PhaseStaffingSegment } from "@/lib/gantt/phase-staffing";
import { barGeometry, type GanttZoom } from "@/lib/gantt/timeline";
import { cn } from "@/lib/utils";

export const STAFFING_LANE_HEIGHT = 20;
export const STAFFING_TRACK_GAP = 4;

export function staffingTrackHeight(segments: PhaseStaffingSegment[]): number {
  if (segments.length === 0) return 0;
  return segments.length * STAFFING_LANE_HEIGHT;
}

/** @deprecated Use staffingTrackHeight */
export function staffingStripHeight(segments: PhaseStaffingSegment[]): number {
  return staffingTrackHeight(segments);
}

function staffingBarLabel(segment: PhaseStaffingSegment, width: number): string | null {
  const hours = `${formatProjectHours(segment.totalHours)}h`;
  if (width >= 56) return hours;
  if (width >= 28) return hours.replace("h", "");
  return null;
}

interface GanttPhaseStaffingLabelsProps {
  segments: PhaseStaffingSegment[];
  className?: string;
}

/** Person names in the phase label column, one row per staffing lane. */
export function GanttPhaseStaffingLabels({
  segments,
  className,
}: GanttPhaseStaffingLabelsProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col border-t border-slate-200/80 bg-slate-50/40",
        className,
      )}
    >
      {segments.map((segment) => (
        <div
          key={segment.employeeId}
          className="flex items-center border-b border-slate-100/90 px-2 last:border-b-0"
          style={{ height: STAFFING_LANE_HEIGHT }}
          title={segment.employeeName}
        >
          <span className="truncate text-[9px] font-medium text-slate-600">
            {segment.firstName}
          </span>
        </div>
      ))}
    </div>
  );
}

interface GanttPhaseStaffingTrackProps {
  segments: PhaseStaffingSegment[];
  rangeStart: Date;
  zoom: GanttZoom;
  className?: string;
}

/** Dedicated staffing sub-row — one timeline lane per person. */
export function GanttPhaseStaffingTrack({
  segments,
  rangeStart,
  zoom,
  className,
}: GanttPhaseStaffingTrackProps) {
  if (segments.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-col border-t border-slate-200/80 bg-slate-50/50",
        className,
      )}
    >
      {segments.map((segment) => {
        const geom = barGeometry(segment.startDate, segment.endDate, rangeStart, zoom);
        const width = geom ? Math.max(geom.width, 16) : 0;
        const label = geom ? staffingBarLabel(segment, width) : null;

        return (
          <div
            key={segment.employeeId}
            className="relative border-b border-slate-100/90 last:border-b-0"
            style={{ height: STAFFING_LANE_HEIGHT }}
          >
            {geom && (
              <div
                className="absolute top-1/2 flex -translate-y-1/2 items-center overflow-hidden rounded border border-emerald-300/70 bg-emerald-50 px-1 shadow-sm"
                style={{
                  left: geom.left,
                  width,
                  height: STAFFING_LANE_HEIGHT - 6,
                }}
                title={`${segment.employeeName} · ${formatProjectHours(segment.totalHours)}h scheduled`}
              >
                {label && (
                  <span className="truncate text-[9px] font-medium leading-none text-emerald-900">
                    {label}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** @deprecated Use GanttPhaseStaffingTrack */
export function GanttPhaseStaffingStrip(props: GanttPhaseStaffingTrackProps) {
  return <GanttPhaseStaffingTrack {...props} />;
}
