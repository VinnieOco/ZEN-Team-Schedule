import {
  addMonths,
  addWeeks,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  endOfWeek,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type { GanttZoom } from "@/lib/gantt/timeline";
import { formatDateKey } from "@/lib/week";

export const GANTT_PRINT_MAX_WEEKS = 52;
export const GANTT_PRINT_MAX_MONTHS = 36;

export interface GanttPrintLayout {
  rangeStart: Date;
  columnCount: number;
  zoom: GanttZoom;
  rangeLabel: string;
}

export function ganttColumnCountForRange(from: Date, to: Date, zoom: GanttZoom): number {
  if (zoom === "months") {
    const start = startOfMonth(from <= to ? from : to);
    const end = startOfMonth(from <= to ? to : from);
    return differenceInCalendarMonths(end, start) + 1;
  }

  const start = startOfWeek(from <= to ? from : to, { weekStartsOn: 1 });
  const end = startOfWeek(from <= to ? to : from, { weekStartsOn: 1 });
  return differenceInCalendarWeeks(end, start) + 1;
}

export function ganttRangeStartForPrint(from: Date, to: Date, zoom: GanttZoom): Date {
  const earlier = from <= to ? from : to;
  return zoom === "months"
    ? startOfMonth(earlier)
    : startOfWeek(earlier, { weekStartsOn: 1 });
}

export function formatGanttPrintRangeLabel(from: Date, to: Date, zoom: GanttZoom): string {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;

  if (zoom === "months") {
    const monthStart = startOfMonth(start);
    const monthEnd = startOfMonth(end);
    if (format(monthStart, "yyyy") === format(monthEnd, "yyyy")) {
      if (format(monthStart, "MMM") === format(monthEnd, "MMM")) {
        return format(monthStart, "MMMM yyyy");
      }
      return `${format(monthStart, "MMM")} – ${format(monthEnd, "MMM yyyy")}`;
    }
    return `${format(monthStart, "MMM yyyy")} – ${format(monthEnd, "MMM yyyy")}`;
  }

  const weekStart = startOfWeek(start, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(end, { weekStartsOn: 1 });
  if (format(weekStart, "yyyy") === format(weekEnd, "yyyy")) {
    return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
  }
  return `${format(weekStart, "MMM d, yyyy")} – ${format(weekEnd, "MMM d, yyyy")}`;
}

export function buildGanttPrintLayout(
  from: string,
  to: string,
  zoom: GanttZoom,
): GanttPrintLayout | { ok: false; message: string } {
  const fromTrimmed = from.trim();
  const toTrimmed = to.trim();
  if (!fromTrimmed || !toTrimmed) {
    return { ok: false, message: "Start and end dates are required." };
  }

  let fromDate: Date;
  let toDate: Date;
  try {
    fromDate = parseISO(fromTrimmed);
    toDate = parseISO(toTrimmed);
  } catch {
    return { ok: false, message: "Enter valid dates." };
  }

  if (isAfter(fromDate, toDate)) {
    return { ok: false, message: "Start date must be on or before end date." };
  }

  const columnCount = ganttColumnCountForRange(fromDate, toDate, zoom);
  if (columnCount <= 0) {
    return { ok: false, message: "Select a valid date range." };
  }

  const maxColumns = zoom === "months" ? GANTT_PRINT_MAX_MONTHS : GANTT_PRINT_MAX_WEEKS;
  if (columnCount > maxColumns) {
    return {
      ok: false,
      message: `Range is too large (${columnCount} ${zoom}). Maximum is ${maxColumns}.`,
    };
  }

  return {
    rangeStart: ganttRangeStartForPrint(fromDate, toDate, zoom),
    columnCount,
    zoom,
    rangeLabel: formatGanttPrintRangeLabel(fromDate, toDate, zoom),
  };
}

export function defaultGanttPrintDates(
  rangeStart: Date,
  columnCount: number,
  zoom: GanttZoom,
): { from: string; to: string } {
  if (zoom === "months") {
    const from = startOfMonth(rangeStart);
    const endMonth = addMonths(from, Math.max(columnCount - 1, 0));
    return { from: formatDateKey(from), to: formatDateKey(endMonth) };
  }

  const from = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const to = addWeeks(from, Math.max(columnCount - 1, 0));
  return { from: formatDateKey(from), to: formatDateKey(to) };
}
