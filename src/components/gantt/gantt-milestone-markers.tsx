"use client";

import { milestoneKindColors, milestoneKindLabel } from "@/lib/gantt/milestones";
import { dateToOffsetPx, type GanttZoom } from "@/lib/gantt/timeline";
import type { ProjectMilestone } from "@/types";

interface GanttMilestoneMarkersProps {
  milestones: ProjectMilestone[];
  rangeStart: Date;
  zoom: GanttZoom;
  /** Firm overview uses smaller markers along the phase row. */
  compact?: boolean;
}

export function GanttMilestoneMarkers({
  milestones,
  rangeStart,
  zoom,
  compact = false,
}: GanttMilestoneMarkersProps) {
  if (milestones.length === 0) return null;

  const size = compact ? 8 : 10;

  return (
    <>
      {milestones.map((milestone) => {
        const left = dateToOffsetPx(new Date(milestone.milestone_date + "T12:00:00"), rangeStart, zoom);
        const colors = milestoneKindColors(milestone.kind);
        const label = milestone.title || milestoneKindLabel(milestone.kind);

        return (
          <div
            key={milestone.id}
            className="pointer-events-none absolute z-20"
            style={{
              left: left - size / 2,
              top: compact ? 4 : 6,
            }}
            title={`${label} · ${milestone.milestone_date}${milestone.notes ? ` — ${milestone.notes}` : ""}`}
          >
            <div
              className="rotate-45 border shadow-sm"
              style={{
                width: size,
                height: size,
                backgroundColor: colors.fill,
                borderColor: colors.stroke,
              }}
            />
            {!compact && (
              <span
                className="absolute left-1/2 top-full mt-1 max-w-[72px] -translate-x-1/2 truncate text-center text-[9px] font-medium text-slate-600"
                style={{ pointerEvents: "none" }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
