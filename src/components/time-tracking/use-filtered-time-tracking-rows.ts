"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import { employeeMatchesDepartmentFilter } from "@/lib/departments";
import { filterTimeEntriesForWeek, getEmployeeWeekTimeStats } from "@/lib/time-tracking";
import { filterAllocationsForWeek } from "@/lib/utilization";
import type { EmployeeWeekTimeStats } from "@/types";
import { getEmployeeFullName, getWeekDays } from "@/lib/week";
import type { Employee } from "@/types";

export interface TimeTrackingRow {
  employee: Employee;
  stats: EmployeeWeekTimeStats;
}

export function useFilteredTimeTrackingRows() {
  const {
    employees,
    allocations,
    timeEntries,
    settings,
    selectedWeekStart,
    filters,
    clearFilters,
  } = useScheduling();

  const weekDays = getWeekDays(selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);
  const weekTimeEntries = filterTimeEntriesForWeek(timeEntries, selectedWeekStart, settings);

  const rows: TimeTrackingRow[] = useMemo(() => {
    return employees
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
        const matchesAllocation = weekAllocations.some((a) => {
          if (a.employee_id !== e.id) return false;
          if (filters.projectId && a.project_id !== filters.projectId) return false;
          if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
        const matchesTime = weekTimeEntries.some((t) => {
          if (t.employee_id !== e.id) return false;
          if (filters.projectId && t.project_id !== filters.projectId) return false;
          if (filters.categoryId && t.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
        return matchesAllocation || matchesTime;
      })
      .map((employee) => ({
        employee,
        stats: getEmployeeWeekTimeStats(
          employee,
          allocations,
          timeEntries,
          selectedWeekStart,
          settings,
        ),
      }));
  }, [
    employees,
    filters,
    weekAllocations,
    weekTimeEntries,
    allocations,
    timeEntries,
    selectedWeekStart,
    settings,
  ]);

  const filteredWeekTimeEntries = useMemo(() => {
    const employeeIds = new Set(rows.map((r) => r.employee.id));
    return weekTimeEntries.filter((e) => {
      if (!employeeIds.has(e.employee_id)) return false;
      if (filters.projectId && e.project_id !== filters.projectId) return false;
      if (filters.categoryId && e.allocation_category_id !== filters.categoryId) return false;
      return true;
    });
  }, [rows, weekTimeEntries, filters.projectId, filters.categoryId]);

  return {
    rows,
    weekDays,
    weekAllocations,
    weekTimeEntries: filteredWeekTimeEntries,
    clearFilters,
  };
}
