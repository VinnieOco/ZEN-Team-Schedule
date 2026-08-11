import {
  addDays,
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";

/**
 * Shared list-focus for Pipeline tab metrics / due widgets.
 * Synced via `?focus=` so Overview can deep-link into a filtered table.
 */
export type PipelineListFocus =
  | "all"
  | "due_week"
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week"
  | "unassigned"
  | "follow_ups"
  | "new_week"
  | "in_review"
  | "recent_won";

const FOCUS_VALUES = new Set<string>([
  "all",
  "due_week",
  "overdue",
  "today",
  "tomorrow",
  "this_week",
  "next_week",
  "unassigned",
  "follow_ups",
  "new_week",
  "in_review",
  "recent_won",
]);

export function parsePipelineFocus(raw: string | null | undefined): PipelineListFocus {
  if (raw && FOCUS_VALUES.has(raw)) return raw as PipelineListFocus;
  return "all";
}

export function pipelineFocusLabel(focus: PipelineListFocus): string {
  switch (focus) {
    case "all":
      return "all";
    case "due_week":
      return "due this week";
    case "overdue":
      return "overdue";
    case "today":
      return "due today";
    case "tomorrow":
      return "due tomorrow";
    case "this_week":
      return "due later this week";
    case "next_week":
      return "due next week";
    case "unassigned":
      return "unassigned";
    case "follow_ups":
      return "follow-ups due";
    case "new_week":
      return "new this week";
    case "in_review":
      return "in review";
    case "recent_won":
      return "projects won";
  }
}

export function parsePipelineDueDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  try {
    const parsed = startOfDay(parseISO(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

export type DueBucketFocus =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_week";

/** Classify a due date into the same buckets used by the Upcoming Due widgets. */
export function classifyDueBucket(due: Date, now = new Date()): DueBucketFocus | null {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = addDays(weekEnd, 1);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  if (due < today) return "overdue";
  if (isSameDay(due, today)) return "today";
  if (isSameDay(due, tomorrow)) return "tomorrow";
  if (isWithinInterval(due, { start: weekStart, end: weekEnd })) return "this_week";
  if (isWithinInterval(due, { start: nextWeekStart, end: nextWeekEnd })) return "next_week";
  return null;
}

/**
 * Match a due date against list focus.
 * Returns `null` when the focus is not date-based (caller handles owner/status focuses).
 */
export function matchesDueFocus(
  due: Date | null,
  focus: PipelineListFocus,
  now = new Date(),
  periodRange?: { start: Date; end: Date },
): boolean | null {
  switch (focus) {
    case "due_week": {
      if (!due) return false;
      const start = startOfDay(periodRange?.start ?? startOfWeek(now, { weekStartsOn: 1 }));
      const end = periodRange?.end
        ? periodRange.end
        : endOfWeek(now, { weekStartsOn: 1 });
      return isWithinInterval(due, { start, end });
    }
    case "overdue":
      return Boolean(due && due < startOfDay(now));
    case "today":
    case "tomorrow":
    case "this_week":
    case "next_week":
      return due ? classifyDueBucket(due, now) === focus : false;
    default:
      return null;
  }
}

export function togglePipelineFocus(
  current: PipelineListFocus,
  next: PipelineListFocus,
): PipelineListFocus {
  return current === next ? "all" : next;
}
