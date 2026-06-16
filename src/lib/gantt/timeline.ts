import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachWeekOfInterval,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";

export const GANTT_WEEK_WIDTH_PX = 56;
export const GANTT_ROW_HEIGHT_PX = 52;
export const GANTT_PROJECT_COLUMN_WIDTH_PX = 240;

export type GanttZoom = "weeks" | "months";

export interface GanttWeekColumn {
  weekStart: Date;
  label: string;
}

export function buildWeekColumns(rangeStart: Date, weekCount: number): GanttWeekColumn[] {
  const end = addWeeks(rangeStart, weekCount);
  const weeks = eachWeekOfInterval({ start: rangeStart, end }, { weekStartsOn: 1 });
  return weeks.slice(0, weekCount).map((weekStart) => ({
    weekStart,
    label: format(weekStart, "MMM d"),
  }));
}

export function dateToOffsetPx(
  date: Date,
  rangeStart: Date,
  zoom: GanttZoom,
): number {
  const days = differenceInCalendarDays(date, rangeStart);
  if (zoom === "months") {
    return (days / 30) * GANTT_WEEK_WIDTH_PX * 4;
  }
  return (days / 7) * GANTT_WEEK_WIDTH_PX;
}

export function offsetPxToDate(
  offsetPx: number,
  rangeStart: Date,
  zoom: GanttZoom,
): Date {
  if (zoom === "months") {
    const days = Math.round((offsetPx / (GANTT_WEEK_WIDTH_PX * 4)) * 30);
    return addDays(rangeStart, days);
  }
  const weeks = offsetPx / GANTT_WEEK_WIDTH_PX;
  return addDays(rangeStart, Math.round(weeks * 7));
}

export function snapToWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function timelineWidthPx(weekCount: number, zoom: GanttZoom): number {
  if (zoom === "months") return weekCount * GANTT_WEEK_WIDTH_PX;
  return weekCount * GANTT_WEEK_WIDTH_PX;
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
