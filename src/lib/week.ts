import {
  addDays,
  format,
  isSameDay,
  parseISO,
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

export function formatDayHeader(date: Date): string {
  return format(date, "EEE M/d");
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
