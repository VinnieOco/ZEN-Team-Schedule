import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";

export type PipelinePeriodMode = "week" | "month" | "year" | "custom";

export interface PipelinePeriod {
  mode: PipelinePeriodMode;
  /** Anchor day for week/month/year navigation. */
  anchor: Date;
  /** Custom range start (yyyy-mm-dd). */
  customStart?: string;
  /** Custom range end (yyyy-mm-dd). */
  customEnd?: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

function parseDateInput(value?: string): Date | null {
  if (!value?.trim()) return null;
  try {
    const parsed = startOfDay(parseISO(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export function createDefaultPipelinePeriod(now = new Date()): PipelinePeriod {
  const today = startOfDay(now);
  return {
    mode: "week",
    anchor: today,
    customStart: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    customEnd: format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"),
  };
}

export function resolvePipelinePeriodRange(period: PipelinePeriod): DateRange {
  if (period.mode === "custom") {
    const start = parseDateInput(period.customStart) ?? startOfDay(period.anchor);
    const end = parseDateInput(period.customEnd) ?? start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (period.mode === "year") {
    return {
      start: startOfYear(period.anchor),
      end: endOfYear(period.anchor),
    };
  }
  if (period.mode === "month") {
    return {
      start: startOfMonth(period.anchor),
      end: endOfMonth(period.anchor),
    };
  }
  return {
    start: startOfWeek(period.anchor, { weekStartsOn: 1 }),
    end: endOfWeek(period.anchor, { weekStartsOn: 1 }),
  };
}

export function formatPipelinePeriodLabel(period: PipelinePeriod): string {
  const { start, end } = resolvePipelinePeriodRange(period);
  if (period.mode === "year") return format(start, "yyyy");
  if (period.mode === "month") return format(start, "MMMM yyyy");
  if (isSameCalendarDay(start, end)) return format(start, "MMM d, yyyy");
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function shiftPipelinePeriod(
  period: PipelinePeriod,
  direction: -1 | 1,
): PipelinePeriod {
  if (period.mode === "year") {
    return { ...period, anchor: addYears(period.anchor, direction) };
  }
  if (period.mode === "month") {
    return { ...period, anchor: addMonths(period.anchor, direction) };
  }
  if (period.mode === "week") {
    return { ...period, anchor: addWeeks(period.anchor, direction) };
  }

  const { start, end } = resolvePipelinePeriodRange(period);
  const spanDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const nextStart = addDays(start, direction * spanDays);
  const nextEnd = addDays(end, direction * spanDays);
  return {
    ...period,
    anchor: nextStart,
    customStart: format(nextStart, "yyyy-MM-dd"),
    customEnd: format(nextEnd, "yyyy-MM-dd"),
  };
}

export function goToTodayPipelinePeriod(period: PipelinePeriod, now = new Date()): PipelinePeriod {
  const today = startOfDay(now);
  if (period.mode === "custom") {
    const { start, end } = resolvePipelinePeriodRange(period);
    const spanDays = Math.max(1, differenceInCalendarDays(end, start));
    return {
      ...period,
      anchor: today,
      customStart: format(today, "yyyy-MM-dd"),
      customEnd: format(addDays(today, spanDays), "yyyy-MM-dd"),
    };
  }
  return { ...period, anchor: today };
}

export function pipelinePeriodDueLabel(mode: PipelinePeriodMode): string {
  if (mode === "year") return "Due This Year";
  if (mode === "month") return "Due This Month";
  if (mode === "custom") return "Due in Range";
  return "Due This Week";
}

export function pipelinePeriodSubmittedLabel(mode: PipelinePeriodMode): string {
  if (mode === "year") return "Submitted This Year";
  if (mode === "month") return "Submitted This Month";
  if (mode === "custom") return "Submitted in Range";
  return "Submitted This Week";
}

export function pipelinePeriodWonLabel(mode: PipelinePeriodMode): string {
  if (mode === "year") return "Won This Year";
  if (mode === "month") return "Won This Month";
  if (mode === "custom") return "Won in Range";
  return "Won This Week";
}

export function pipelinePeriodTotalLabel(mode: PipelinePeriodMode): string {
  if (mode === "year") return "Yearly Total";
  if (mode === "month") return "Monthly Total";
  if (mode === "custom") return "Period Total";
  return "Weekly Total";
}
