import { parseISO } from "date-fns";

import { formatDateKey, getWeekDays, isDateInWeek } from "@/lib/week";
import type {
  Allocation,
  CompanySettings,
  Employee,
  EmployeeWeekStats,
  TeamSummaryStats,
  UtilizationStatus,
} from "@/types";

export function getUtilizationStatus(percent: number): UtilizationStatus {
  if (percent > 100) return "over";
  if (percent >= 90) return "near";
  if (percent >= 60) return "healthy";
  return "under";
}

export function utilizationStatusColor(status: UtilizationStatus): string {
  switch (status) {
    case "over":
      return "text-red-600";
    case "near":
      return "text-orange-600";
    case "healthy":
      return "text-emerald-600";
    case "under":
      return "text-blue-600";
  }
}

export function utilizationStatusBg(status: UtilizationStatus): string {
  switch (status) {
    case "over":
      return "bg-red-50";
    case "near":
      return "bg-orange-50";
    case "healthy":
      return "bg-emerald-50";
    case "under":
      return "bg-blue-50";
  }
}

export function filterAllocationsForWeek(
  allocations: Allocation[],
  weekStart: Date,
  settings: CompanySettings,
): Allocation[] {
  return allocations.filter((a) => isDateInWeek(a.allocation_date, weekStart, settings));
}

export function getEmployeeDayHours(
  allocations: Allocation[],
  employeeId: string,
  date: Date,
): number {
  const key = formatDateKey(date);
  return allocations
    .filter((a) => a.employee_id === employeeId && a.allocation_date === key)
    .reduce((sum, a) => sum + a.hours, 0);
}

export function getEmployeeWeekStats(
  employee: Employee,
  allocations: Allocation[],
  weekStart: Date,
  settings: CompanySettings,
): EmployeeWeekStats {
  const weekAllocations = filterAllocationsForWeek(allocations, weekStart, settings).filter(
    (a) => a.employee_id === employee.id,
  );

  const scheduledHours = weekAllocations.reduce((sum, a) => sum + a.hours, 0);
  const billableHours = weekAllocations
    .filter((a) => a.is_billable)
    .reduce((sum, a) => sum + a.hours, 0);
  const nonBillableHours = scheduledHours - billableHours;
  const weeklyCapacity = employee.weekly_capacity_hours;
  const utilizationPercent =
    weeklyCapacity > 0 ? Math.round((scheduledHours / weeklyCapacity) * 100) : 0;

  return {
    employeeId: employee.id,
    scheduledHours,
    weeklyCapacity,
    utilizationPercent,
    billableHours,
    nonBillableHours,
    billablePercent:
      weeklyCapacity > 0 ? Math.round((billableHours / weeklyCapacity) * 100) : 0,
    nonBillablePercent:
      weeklyCapacity > 0 ? Math.round((nonBillableHours / weeklyCapacity) * 100) : 0,
    status: getUtilizationStatus(utilizationPercent),
  };
}

/** Team summary: billable/non-billable as % of total team weekly capacity */
export function getTeamSummary(
  allocations: Allocation[],
  employees: Employee[],
  weekStart: Date,
  settings: CompanySettings,
): TeamSummaryStats {
  const activeEmployees = employees.filter((e) => e.active);
  const totalCapacity = activeEmployees.reduce((sum, e) => sum + e.weekly_capacity_hours, 0);
  const weekAllocations = filterAllocationsForWeek(allocations, weekStart, settings);

  const totalScheduled = weekAllocations.reduce((sum, a) => sum + a.hours, 0);
  const billableScheduled = weekAllocations
    .filter((a) => a.is_billable)
    .reduce((sum, a) => sum + a.hours, 0);
  const nonBillableScheduled = totalScheduled - billableScheduled;

  const totalUtilizationPercent =
    totalCapacity > 0 ? Math.round((totalScheduled / totalCapacity) * 100) : 0;
  const billablePercent =
    totalCapacity > 0 ? Math.round((billableScheduled / totalCapacity) * 100) : 0;
  const nonBillablePercent =
    totalCapacity > 0 ? Math.round((nonBillableScheduled / totalCapacity) * 100) : 0;
  const availablePercent = Math.max(0, 100 - totalUtilizationPercent);

  return {
    totalUtilizationPercent,
    billablePercent,
    nonBillablePercent,
    availablePercent,
  };
}

export function getProjectScheduledHours(
  allocations: Allocation[],
  projectId: string,
): number {
  return allocations
    .filter((a) => a.project_id === projectId)
    .reduce((sum, a) => sum + a.hours, 0);
}

export interface AllocationValidationResult {
  warnings: string[];
}

export function validateAllocationHours(
  hours: number,
  employee: Employee,
  allocations: Allocation[],
  allocationDate: string,
  weekStart: Date,
  settings: CompanySettings,
  excludeAllocationId?: string,
): AllocationValidationResult {
  const warnings: string[] = [];
  const others = allocations.filter((a) => a.id !== excludeAllocationId);

  const date = parseISO(allocationDate);
  const dayTotal =
    getEmployeeDayHours(others, employee.id, date) +
    hours;
  const weekStats = getEmployeeWeekStats(employee, others, weekStart, settings);
  const weekTotal = weekStats.scheduledHours + hours;

  if (dayTotal > employee.daily_capacity_hours) {
    warnings.push(
      `Daily total (${dayTotal}h) exceeds capacity (${employee.daily_capacity_hours}h).`,
    );
  }
  if (weekTotal > employee.weekly_capacity_hours) {
    warnings.push(
      `Weekly total (${weekTotal}h) exceeds capacity (${employee.weekly_capacity_hours}h).`,
    );
  }

  return { warnings };
}

export function getWeekDaysForSettings(weekStart: Date, settings: CompanySettings): Date[] {
  return getWeekDays(weekStart, settings);
}
