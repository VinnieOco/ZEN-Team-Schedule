import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
  type Day,
} from "date-fns";

import type { CompanySettings } from "@/types";

const DAY_MAP: Record<CompanySettings["workweek_start_day"], Day> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 0,
};

export function getWeekStart(date: Date, settings: CompanySettings): Date {
  return startOfWeek(date, { weekStartsOn: DAY_MAP[settings.workweek_start_day] });
}

export function getWeekDays(
  weekStart: Date,
  settings: CompanySettings,
): Date[] {
  const days: Date[] = [];
  const count = settings.include_weekends ? 7 : 5;
  for (let i = 0; i < count; i++) {
    days.push(addDays(weekStart, i));
  }
  return days;
}

export function formatDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatWeekRange(weekStart: Date, settings: CompanySettings): string {
  const days = getWeekDays(weekStart, settings);
  const start = days[0];
  const end = days[days.length - 1];
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export function getMonthStart(date: Date): Date {
  return startOfMonth(date);
}

export function getMonthDays(monthStart: Date, settings: CompanySettings): Date[] {
  const end = endOfMonth(monthStart);
  return eachDayOfInterval({ start: monthStart, end }).filter((day) => {
    if (settings.include_weekends) return true;
    return !isWeekend(day);
  });
}

export function formatMonthRange(monthStart: Date): string {
  return format(monthStart, "MMMM yyyy");
}

export function formatMonthDayHeader(date: Date): { weekday: string; day: string } {
  return { weekday: format(date, "EEE"), day: format(date, "d") };
}

export function isDateInMonth(
  dateStr: string,
  monthStart: Date,
  settings: CompanySettings,
): boolean {
  const date = parseISO(dateStr);
  const days = getMonthDays(monthStart, settings);
  return days.some((d) => isSameDay(d, date));
}

export function formatDayHeader(date: Date): string {
  return format(date, "EEE M/d");
}

/** Compact day label for timesheet columns, e.g. "5/18". */
export function formatTimesheetDayHeader(date: Date): string {
  return format(date, "M/d");
}

export function isDateInWeek(dateStr: string, weekStart: Date, settings: CompanySettings): boolean {
  const date = parseISO(dateStr);
  const days = getWeekDays(weekStart, settings);
  return days.some((d) => isSameDay(d, date));
}

export function getEmployeeInitials(employee: { first_name: string; last_name: string }): string {
  return `${employee.first_name[0] ?? ""}${employee.last_name[0] ?? ""}`.toUpperCase();
}

export function getEmployeeFullName(employee: { first_name: string; last_name: string }): string {
  return `${employee.first_name} ${employee.last_name}`;
}
