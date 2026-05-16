import { parseISO } from "date-fns";

import {
  formatDateKey,
  getMonthDays,
  getWeekDays,
  isDateInMonth,
  isDateInWeek,
} from "@/lib/week";
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

export function filterAllocationsForMonth(
  allocations: Allocation[],
  monthStart: Date,
  settings: CompanySettings,
): Allocation[] {
  return allocations.filter((a) => isDateInMonth(a.allocation_date, monthStart, settings));
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

/** Cell styling for daily workload heatmap (scheduled vs daily capacity). */
export function dayWorkloadCellClass(scheduled: number, dailyCapacity: number): string {
  if (scheduled <= 0) return "bg-slate-50 text-slate-400";
  if (scheduled > dailyCapacity) return "bg-red-100 text-red-800 font-semibold";
  const pct = dailyCapacity > 0 ? (scheduled / dailyCapacity) * 100 : 0;
  if (pct >= 90) return "bg-orange-100 text-orange-800 font-medium";
  if (pct >= 50) return "bg-emerald-50 text-emerald-800";
  return "bg-blue-50 text-blue-700";
}

/** Cell styling for daily availability (remaining hours = capacity − scheduled). */
export function dayAvailabilityCellClass(remaining: number, dailyCapacity: number): string {
  if (remaining < 0) return "bg-red-100 text-red-800 font-semibold";
  if (dailyCapacity <= 0) return "bg-slate-50 text-slate-400";
  if (remaining <= 0) return "bg-orange-50 text-orange-800 font-medium";
  const pctAvailable = (remaining / dailyCapacity) * 100;
  if (pctAvailable >= 50) return "bg-emerald-100 text-emerald-800 font-medium";
  if (pctAvailable >= 25) return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

export interface EmployeeMonthStats {
  employeeId: string;
  scheduledHours: number;
  monthlyCapacity: number;
  utilizationPercent: number;
  status: UtilizationStatus;
}

export function getEmployeeMonthStats(
  employee: Employee,
  allocations: Allocation[],
  monthStart: Date,
  settings: CompanySettings,
): EmployeeMonthStats {
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, settings).filter(
    (a) => a.employee_id === employee.id,
  );
  const scheduledHours = monthAllocations.reduce((sum, a) => sum + a.hours, 0);
  const workDays = getMonthDays(monthStart, settings).length;
  const workDaysPerWeek = settings.include_weekends ? 7 : 5;
  const monthlyCapacity =
    workDaysPerWeek > 0
      ? Math.round((employee.weekly_capacity_hours / workDaysPerWeek) * workDays * 10) / 10
      : 0;
  const utilizationPercent =
    monthlyCapacity > 0 ? Math.round((scheduledHours / monthlyCapacity) * 100) : 0;

  return {
    employeeId: employee.id,
    scheduledHours: Math.round(scheduledHours * 10) / 10,
    monthlyCapacity,
    utilizationPercent,
    status: getUtilizationStatus(utilizationPercent),
  };
}

export function getTeamMonthSummary(
  allocations: Allocation[],
  employees: Employee[],
  monthStart: Date,
  settings: CompanySettings,
): TeamSummaryStats {
  const activeEmployees = employees.filter((e) => e.active);
  const workDays = getMonthDays(monthStart, settings).length;
  const workDaysPerWeek = settings.include_weekends ? 7 : 5;
  const totalCapacity = activeEmployees.reduce((sum, e) => {
    const monthly =
      workDaysPerWeek > 0 ? (e.weekly_capacity_hours / workDaysPerWeek) * workDays : 0;
    return sum + monthly;
  }, 0);
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, settings);
  const totalScheduled = monthAllocations.reduce((sum, a) => sum + a.hours, 0);
  const billableScheduled = monthAllocations
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

export function getProjectWeekScheduledHours(
  allocations: Allocation[],
  projectId: string,
  weekStart: Date,
  settings: CompanySettings,
): number {
  return filterAllocationsForWeek(allocations, weekStart, settings)
    .filter((a) => a.project_id === projectId)
    .reduce((sum, a) => sum + a.hours, 0);
}

export type ProjectBudgetStatus = "no-budget" | "under" | "on-track" | "near" | "over";

export interface ProjectBudgetStats {
  scheduledAllTime: number;
  scheduledThisWeek: number;
  remaining: number;
  percentUsed: number;
  status: ProjectBudgetStatus;
}

export function getProjectBudgetStats(
  allocations: Allocation[],
  projectId: string,
  budgetedHours: number,
  weekStart: Date,
  settings: CompanySettings,
): ProjectBudgetStats {
  const scheduledAllTime = getProjectScheduledHours(allocations, projectId);
  const scheduledThisWeek = getProjectWeekScheduledHours(
    allocations,
    projectId,
    weekStart,
    settings,
  );
  const remaining = budgetedHours - scheduledAllTime;
  const percentUsed =
    budgetedHours > 0 ? Math.round((scheduledAllTime / budgetedHours) * 100) : 0;

  let status: ProjectBudgetStatus = "no-budget";
  if (budgetedHours > 0) {
    if (remaining < 0) status = "over";
    else if (percentUsed >= 90) status = "near";
    else if (percentUsed >= 60) status = "on-track";
    else status = "under";
  }

  return {
    scheduledAllTime,
    scheduledThisWeek,
    remaining,
    percentUsed,
    status,
  };
}

export function projectBudgetStatusColor(status: ProjectBudgetStatus): string {
  switch (status) {
    case "over":
      return "text-red-600";
    case "near":
      return "text-orange-600";
    case "on-track":
      return "text-emerald-600";
    case "under":
      return "text-blue-600";
    default:
      return "text-muted-foreground";
  }
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
