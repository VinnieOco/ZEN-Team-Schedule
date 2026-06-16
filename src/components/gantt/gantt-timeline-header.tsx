"use client";

import {
  buildTimelineColumns,
  columnWidthPx,
  GANTT_PROJECT_COLUMN_WIDTH_PX,
  type GanttZoom,
} from "@/lib/gantt/timeline";

interface GanttTimelineHeaderProps {
  rangeStart: Date;
  columnCount: number;
  zoom: GanttZoom;
  /** When false, only render timeline columns (no Projects label). */
  showProjectColumn?: boolean;
  /** Left column label when showProjectColumn is false (e.g. Phase). */
  sideLabel?: string;
  sideLabelWidth?: number;
}

export function GanttTimelineHeader({
  rangeStart,
  columnCount,
  zoom,
  showProjectColumn = true,
  sideLabel,
  sideLabelWidth,
}: GanttTimelineHeaderProps) {
  const columns = buildTimelineColumns(rangeStart, columnCount, zoom);
  const colWidth = columnWidthPx(zoom);
  const sideWidth = sideLabelWidth ?? GANTT_PROJECT_COLUMN_WIDTH_PX;

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
      {!showProjectColumn && sideLabel && (
        <div
          className="shrink-0 border-r border-slate-200 px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ width: sideWidth }}
        >
          {sideLabel}
        </div>
      )}
      <div className="flex min-w-0">
        {columns.map((col) => (
          <div
            key={col.start.toISOString()}
            className="shrink-0 border-r border-slate-200 px-1 py-2 text-center text-[10px] font-medium text-muted-foreground"
            style={{ width: colWidth }}
          >
            {col.label}
          </div>
        ))}
      </div>
    </div>
  );
}
