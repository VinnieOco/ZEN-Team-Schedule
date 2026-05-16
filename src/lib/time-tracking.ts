import { formatDateKey, isDateInMonth, isDateInWeek } from "@/lib/week";
import {
  filterAllocationsForMonth,
  filterAllocationsForWeek,
  getEmployeeDayHours,
  getEmployeeMonthStats,
  getEmployeeWeekStats,
} from "@/lib/utilization";
import type {
  Allocation,
  CompanySettings,
  Employee,
  EmployeeWeekTimeStats,
  TeamTimeSummary,
  TimeEntry,
} from "@/types";

export function filterTimeEntriesForWeek(
  entries: TimeEntry[],
  weekStart: Date,
  settings: CompanySettings,
): TimeEntry[] {
  return entries.filter((e) => isDateInWeek(e.entry_date, weekStart, settings));
}

export function filterTimeEntriesForMonth(
  entries: TimeEntry[],
  monthStart: Date,
  settings: CompanySettings,
): TimeEntry[] {
  return entries.filter((e) => isDateInMonth(e.entry_date, monthStart, settings));
}

export function getEmployeeDayActualHours(
  entries: TimeEntry[],
  employeeId: string,
  date: Date,
): number {
  const key = formatDateKey(date);
  return entries
    .filter((e) => e.employee_id === employeeId && e.entry_date === key)
    .reduce((sum, e) => sum + e.hours, 0);
}

export function getEmployeeWeekTimeStats(
  employee: Employee,
  allocations: Allocation[],
  entries: TimeEntry[],
  weekStart: Date,
  settings: CompanySettings,
): EmployeeWeekTimeStats {
  const scheduledHours = getEmployeeWeekStats(employee, allocations, weekStart, settings)
    .scheduledHours;
  const weekEntries = filterTimeEntriesForWeek(entries, weekStart, settings).filter(
    (e) => e.employee_id === employee.id,
  );
  const actualHours = weekEntries.reduce((sum, e) => sum + e.hours, 0);
  const varianceHours = Math.round((actualHours - scheduledHours) * 10) / 10;

  return {
    employeeId: employee.id,
    scheduledHours,
    actualHours,
    varianceHours,
  };
}

export function getEmployeeMonthTimeStats(
  employee: Employee,
  allocations: Allocation[],
  entries: TimeEntry[],
  monthStart: Date,
  settings: CompanySettings,
): EmployeeWeekTimeStats {
  const scheduledHours = getEmployeeMonthStats(employee, allocations, monthStart, settings)
    .scheduledHours;
  const monthEntries = filterTimeEntriesForMonth(entries, monthStart, settings).filter(
    (e) => e.employee_id === employee.id,
  );
  const actualHours = monthEntries.reduce((sum, e) => sum + e.hours, 0);
  const varianceHours = Math.round((actualHours - scheduledHours) * 10) / 10;

  return {
    employeeId: employee.id,
    scheduledHours,
    actualHours,
    varianceHours,
  };
}

export function getTeamTimeSummary(
  allocations: Allocation[],
  entries: TimeEntry[],
  employees: Employee[],
  weekStart: Date,
  settings: CompanySettings,
): TeamTimeSummary {
  const scheduledHours = filterAllocationsForWeek(allocations, weekStart, settings).reduce(
    (sum, a) => sum + a.hours,
    0,
  );
  const actualHours = filterTimeEntriesForWeek(entries, weekStart, settings).reduce(
    (sum, e) => sum + e.hours,
    0,
  );
  const varianceHours = Math.round((actualHours - scheduledHours) * 10) / 10;
  const matchPercent =
    scheduledHours > 0
      ? Math.round((1 - Math.abs(varianceHours) / scheduledHours) * 100)
      : actualHours > 0
        ? 0
        : 100;

  return {
    scheduledHours: Math.round(scheduledHours * 10) / 10,
    actualHours: Math.round(actualHours * 10) / 10,
    varianceHours,
    matchPercent: Math.max(0, Math.min(100, matchPercent)),
  };
}

export function getTeamMonthTimeSummary(
  allocations: Allocation[],
  entries: TimeEntry[],
  monthStart: Date,
  settings: CompanySettings,
): TeamTimeSummary {
  const scheduledHours = filterAllocationsForMonth(allocations, monthStart, settings).reduce(
    (sum, a) => sum + a.hours,
    0,
  );
  const actualHours = filterTimeEntriesForMonth(entries, monthStart, settings).reduce(
    (sum, e) => sum + e.hours,
    0,
  );
  const varianceHours = Math.round((actualHours - scheduledHours) * 10) / 10;
  const matchPercent =
    scheduledHours > 0
      ? Math.round((1 - Math.abs(varianceHours) / scheduledHours) * 100)
      : actualHours > 0
        ? 0
        : 100;

  return {
    scheduledHours: Math.round(scheduledHours * 10) / 10,
    actualHours: Math.round(actualHours * 10) / 10,
    varianceHours,
    matchPercent: Math.max(0, Math.min(100, matchPercent)),
  };
}

/** Heatmap cell for scheduled vs actual variance on a day. */
export function dayTimeVarianceCellClass(
  scheduled: number,
  actual: number,
): string {
  if (scheduled <= 0 && actual <= 0) return "bg-slate-50 text-slate-400";
  const variance = actual - scheduled;
  if (variance > 1) return "bg-red-100 text-red-800 font-semibold";
  if (variance > 0.25) return "bg-orange-50 text-orange-800 font-medium";
  if (variance < -1) return "bg-blue-100 text-blue-800 font-medium";
  if (variance < -0.25) return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-800";
}

export function varianceLabel(variance: number): string {
  if (variance > 0) return `+${variance}h`;
  if (variance < 0) return `${variance}h`;
  return "0h";
}

export function varianceColorClass(variance: number): string {
  if (variance > 0.25) return "text-red-600";
  if (variance < -0.25) return "text-blue-600";
  return "text-emerald-600";
}

export { getEmployeeDayHours };
