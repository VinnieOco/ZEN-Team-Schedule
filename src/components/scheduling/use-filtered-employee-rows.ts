"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForWeek,
  getEmployeeWeekStats,
} from "@/lib/utilization";
import type { EmployeeWeekStats } from "@/types";
import { getEmployeeFullName, getWeekDays } from "@/lib/week";
import type { Employee } from "@/types";

export interface EmployeeWeekRow {
  employee: Employee;
  stats: EmployeeWeekStats;
}

export function useFilteredEmployeeRows() {
  const { employees, allocations, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const weekDays = getWeekDays(selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);

  const rows: EmployeeWeekRow[] = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .filter((e) => {
        if (!filters.search) return true;
        const q = filters.search.toLowerCase();
        const name = getEmployeeFullName(e).toLowerCase();
        return name.includes(q) || e.role.toLowerCase().includes(q);
      })
      .filter((e) => {
        if (!filters.projectId && !filters.categoryId) return true;
        return weekAllocations.some((a) => {
          if (a.employee_id !== e.id) return false;
          if (filters.projectId && a.project_id !== filters.projectId) return false;
          if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
      })
      .map((employee) => ({
        employee,
        stats: getEmployeeWeekStats(employee, allocations, selectedWeekStart, settings),
      }));
  }, [employees, filters, weekAllocations, allocations, selectedWeekStart, settings]);

  return {
    rows,
    weekDays,
    weekAllocations,
    allocations,
    clearFilters,
  };
}
