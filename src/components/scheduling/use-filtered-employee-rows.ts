"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import { schedulingViewSettings } from "@/lib/scheduling-view";
import {
  filterAllocationsForMonth,
  filterAllocationsForThreeWeeks,
  filterAllocationsForWeek,
  getEmployeeMonthStats,
  getEmployeeThreeWeekStats,
  getEmployeeWeekStats,
} from "@/lib/utilization";
import type { EmployeeWeekStats } from "@/types";
import type { EmployeeMonthStats } from "@/lib/utilization";
import { employeeMatchesDepartmentFilter } from "@/lib/departments";
import {
  getEmployeeFullName,
  getMonthDays,
  getMonthStart,
  getThreeWeekDays,
  getWeekDays,
} from "@/lib/week";
import type { Allocation, Employee } from "@/types";

export type FilteredRowsPeriod = "week" | "three_weeks" | "month";

export interface EmployeeWeekRow {
  employee: Employee;
  stats: EmployeeWeekStats | EmployeeMonthStats;
}

interface UseFilteredEmployeeRowsOptions {
  period?: FilteredRowsPeriod;
  sortByUtilization?: boolean;
  /** When true, apply filters.onlyWithAllocations for Schedule tab grids. */
  applyOnlyWithAllocations?: boolean;
}

function employeeHasPeriodAllocation(
  employeeId: string,
  periodAllocations: Allocation[],
  filters: { projectId: string | null; categoryId: string | null },
): boolean {
  return periodAllocations.some((a) => {
    if (a.employee_id !== employeeId) return false;
    if (filters.projectId && a.project_id !== filters.projectId) return false;
    if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
    return true;
  });
}

export function useFilteredEmployeeRows(options: UseFilteredEmployeeRowsOptions = {}) {
  const { period = "week", sortByUtilization = false, applyOnlyWithAllocations = false } =
    options;
  const { employees, allocations, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const viewSettings = schedulingViewSettings(settings, filters);
  const monthStart = getMonthStart(selectedWeekStart);
  const weekDays = getWeekDays(selectedWeekStart, viewSettings);
  const threeWeekDays = getThreeWeekDays(selectedWeekStart, viewSettings);
  const monthDays = getMonthDays(monthStart, viewSettings);
  const periodDays =
    period === "month" ? monthDays : period === "three_weeks" ? threeWeekDays : weekDays;

  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, viewSettings);
  const threeWeekAllocations = filterAllocationsForThreeWeeks(
    allocations,
    selectedWeekStart,
    viewSettings,
  );
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, viewSettings);
  const periodAllocations =
    period === "month"
      ? monthAllocations
      : period === "three_weeks"
        ? threeWeekAllocations
        : weekAllocations;

  const rows: EmployeeWeekRow[] = useMemo(() => {
    const mapped = employees
      .filter((e) => e.active)
      .filter((e) => employeeMatchesDepartmentFilter(e, filters.department))
      .filter((e) => {
        if (!filters.search) return true;
        const q = filters.search.toLowerCase();
        const name = getEmployeeFullName(e).toLowerCase();
        return name.includes(q) || e.role.toLowerCase().includes(q);
      })
      .filter((e) => {
        if (!filters.projectId && !filters.categoryId) return true;
        return employeeHasPeriodAllocation(e.id, periodAllocations, filters);
      })
      .filter((e) => {
        if (!applyOnlyWithAllocations || !filters.onlyWithAllocations) return true;
        return employeeHasPeriodAllocation(e.id, periodAllocations, filters);
      })
      .map((employee) => ({
        employee,
        stats:
          period === "month"
            ? getEmployeeMonthStats(employee, allocations, monthStart, viewSettings)
            : period === "three_weeks"
              ? getEmployeeThreeWeekStats(
                  employee,
                  allocations,
                  selectedWeekStart,
                  viewSettings,
                )
              : getEmployeeWeekStats(
                  employee,
                  allocations,
                  selectedWeekStart,
                  viewSettings,
                ),
      }));

    if (sortByUtilization) {
      return [...mapped].sort((a, b) => b.stats.utilizationPercent - a.stats.utilizationPercent);
    }
    return mapped;
  }, [
    employees,
    filters,
    periodAllocations,
    allocations,
    selectedWeekStart,
    viewSettings,
    period,
    monthStart,
    sortByUtilization,
    applyOnlyWithAllocations,
  ]);

  return {
    rows,
    weekDays,
    threeWeekDays,
    monthDays,
    periodDays,
    weekAllocations,
    threeWeekAllocations,
    monthAllocations,
    periodAllocations,
    allocations,
    clearFilters,
  };
}
