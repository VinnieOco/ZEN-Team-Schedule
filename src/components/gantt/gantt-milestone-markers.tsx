"use client";

import { format, parseISO } from "date-fns";

import { GanttTooltip } from "@/components/gantt/gantt-chart-tooltip";
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

function formatMilestoneDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function GanttMilestoneMarkers({
  milestones,
  rangeStart,
  zoom,
  compact = false,
}: GanttMilestoneMarkersProps) {
  if (milestones.length === 0) return null;

  const size = compact ? 8 : 10;
  const hitSize = compact ? 20 : 24;

  return (
    <>
      {milestones.map((milestone) => {
        const left = dateToOffsetPx(
          new Date(milestone.milestone_date + "T12:00:00"),
          rangeStart,
          zoom,
        );
        const colors = milestoneKindColors(milestone.kind);
        const kindLabel = milestoneKindLabel(milestone.kind);
        const title = milestone.title || kindLabel;
        const dateLabel = formatMilestoneDate(milestone.milestone_date);

        return (
          <div
            key={milestone.id}
            className="absolute z-20 flex items-center justify-center"
            style={{
              left: left - hitSize / 2,
              top: 0,
              width: hitSize,
              height: "100%",
            }}
          >
            <GanttTooltip
              content={
                <>
                  <p className="font-semibold text-slate-900">{title}</p>
                  <p className="text-muted-foreground">
                    {kindLabel} · {dateLabel}
                  </p>
                  {milestone.notes?.trim() && (
                    <p className="mt-1 leading-snug text-slate-600">{milestone.notes.trim()}</p>
                  )}
                </>
              }
            >
              <button
                type="button"
                className="flex h-full w-full cursor-default items-center justify-center border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1"
                style={{ height: hitSize }}
                aria-label={`${title} · ${dateLabel}`}
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
              </button>
            </GanttTooltip>
            {!compact && (
              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+2px)] max-w-[88px] -translate-x-1/2 truncate text-center text-[9px] font-medium leading-tight text-slate-600">
                {title}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
