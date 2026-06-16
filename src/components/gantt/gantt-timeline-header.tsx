"use client";

import {
  buildWeekColumns,
  GANTT_PROJECT_COLUMN_WIDTH_PX,
  GANTT_WEEK_WIDTH_PX,
  type GanttWeekColumn,
} from "@/lib/gantt/timeline";

interface GanttTimelineHeaderProps {
  rangeStart: Date;
  weekCount: number;
  /** When false, only render week columns (no Projects label). */
  showProjectColumn?: boolean;
}

export function GanttTimelineHeader({
  rangeStart,
  weekCount,
  showProjectColumn = true,
}: GanttTimelineHeaderProps) {
  const columns: GanttWeekColumn[] = buildWeekColumns(rangeStart, weekCount);

  return (
    <div className="flex border-b border-slate-200 bg-slate-50">
      {showProjectColumn && (
        <div
          className="shrink-0 border-r border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ width: GANTT_PROJECT_COLUMN_WIDTH_PX }}
        >
          Projects
        </div>
      )}
      <div className="flex min-w-0">
        {columns.map((col) => (
          <div
            key={col.weekStart.toISOString()}
            className="shrink-0 border-r border-slate-200 px-1 py-2 text-center text-[10px] font-medium text-muted-foreground"
            style={{ width: GANTT_WEEK_WIDTH_PX }}
          >
            {col.label}
          </div>
        ))}
      </div>
    </div>
  );
}
