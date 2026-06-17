import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const GANTT_WEEK_WIDTH_PX = 56;
export const GANTT_MONTH_WIDTH_PX = 80;
/** Vertical space for one phase bar row (firm Gantt project rows). */
export const GANTT_PHASE_BAR_HEIGHT_PX = 30;
export const GANTT_PHASE_BAR_TRACK_HEIGHT_PX = 50;
export const GANTT_ROW_HEIGHT_PX = GANTT_PHASE_BAR_TRACK_HEIGHT_PX;
export const GANTT_MILESTONE_ROW_HEIGHT_PX = 36;
export const GANTT_PROJECT_COLUMN_WIDTH_PX = 240;

export function ganttPhaseBarTopPx(): number {
  return (GANTT_PHASE_BAR_TRACK_HEIGHT_PX - GANTT_PHASE_BAR_HEIGHT_PX) / 2;
}

export const GANTT_VISIBLE_WEEKS = 20;
export const GANTT_VISIBLE_MONTHS = 14;

export type GanttZoom = "weeks" | "months";

export interface GanttTimelineColumn {
  start: Date;
  label: string;
}

export function pixelsPerDay(zoom: GanttZoom): number {
  return zoom === "months" ? GANTT_MONTH_WIDTH_PX / 30 : GANTT_WEEK_WIDTH_PX / 7;
}

export function dayDeltaFromPixels(deltaPx: number, zoom: GanttZoom): number {
  return Math.round(deltaPx / pixelsPerDay(zoom));
}

export function buildTimelineColumns(
  rangeStart: Date,
  count: number,
  zoom: GanttZoom,
): GanttTimelineColumn[] {
  if (zoom === "months") {
    const start = startOfMonth(rangeStart);
    const end = addMonths(start, count);
    return eachMonthOfInterval({ start, end })
      .slice(0, count)
      .map((monthStart) => ({
        start: monthStart,
        label: format(monthStart, "MMM yyyy"),
      }));
  }
  const end = addWeeks(rangeStart, count);
  return eachWeekOfInterval({ start: rangeStart, end }, { weekStartsOn: 1 })
    .slice(0, count)
    .map((weekStart) => ({
      start: weekStart,
      label: format(weekStart, "MMM d"),
    }));
}

export function columnWidthPx(zoom: GanttZoom): number {
  return zoom === "months" ? GANTT_MONTH_WIDTH_PX : GANTT_WEEK_WIDTH_PX;
}

export function dateToOffsetPx(date: Date, rangeStart: Date, zoom: GanttZoom): number {
  const days = differenceInCalendarDays(date, rangeStart);
  return days * pixelsPerDay(zoom);
}

export function offsetPxToDate(offsetPx: number, rangeStart: Date, zoom: GanttZoom): Date {
  const days = Math.round(offsetPx / pixelsPerDay(zoom));
  return addDays(rangeStart, days);
}

export function snapToWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function timelineWidthPx(columnCount: number, zoom: GanttZoom): number {
  return columnCount * columnWidthPx(zoom);
}

export function visibleColumnCount(zoom: GanttZoom): number {
  return zoom === "months" ? GANTT_VISIBLE_MONTHS : GANTT_VISIBLE_WEEKS;
}

export function barGeometry(
  startDate: string | undefined,
  endDate: string | undefined,
  rangeStart: Date,
  zoom: GanttZoom,
): { left: number; width: number } | null {
  if (!startDate || !endDate) return null;
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const left = dateToOffsetPx(start, rangeStart, zoom);
  const right = dateToOffsetPx(addDays(end, 1), rangeStart, zoom);
  const width = Math.max(right - left, 8);
  return { left, width };
}

export function todayOffsetPx(rangeStart: Date, zoom: GanttZoom): number {
  return dateToOffsetPx(new Date(), rangeStart, zoom);
}

/** @deprecated Use buildTimelineColumns */
export function buildWeekColumns(rangeStart: Date, weekCount: number): GanttTimelineColumn[] {
  return buildTimelineColumns(rangeStart, weekCount, "weeks");
}

export type GanttWeekColumn = GanttTimelineColumn;
