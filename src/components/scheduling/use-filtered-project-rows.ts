"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import { schedulingViewSettings } from "@/lib/scheduling-view";
import { getProjectDesignAmount, getProjectEstimateValue } from "@/lib/project-format";
import { projectMatchesDepartmentFilter } from "@/lib/departments";
import {
  filterAllocationsForMonth,
  filterAllocationsForWeek,
} from "@/lib/utilization";
import { getEmployeeFullName, getMonthDays, getMonthStart, getWeekDays } from "@/lib/week";
import type { Project } from "@/types";

interface UseFilteredProjectRowsOptions {
  period?: "week" | "month";
  /** When true, apply filters.onlyWithAllocations for By Project tab. */
  applyOnlyWithAllocations?: boolean;
}

export function useFilteredProjectRows({
  period = "week",
  applyOnlyWithAllocations = false,
}: UseFilteredProjectRowsOptions = {}) {
  const { projects, allocations, employees, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const viewSettings = schedulingViewSettings(settings, filters);
  const monthStart = getMonthStart(selectedWeekStart);
  const weekDays = getWeekDays(selectedWeekStart, viewSettings);
  const monthDays = getMonthDays(monthStart, viewSettings);
  const periodDays = period === "month" ? monthDays : weekDays;

  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, viewSettings);
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, viewSettings);
  const periodAllocations = period === "month" ? monthAllocations : weekAllocations;

  const rows: Project[] = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return projects
      .filter((p) => p.active)
      .filter((p) => projectMatchesDepartmentFilter(p, filters.department))
      .filter((p) => !filters.projectId || p.id === filters.projectId)
      .filter((p) => {
        if (!q) return true;
        const projectHaystack = [
          p.project_name,
          p.client_name,
          getProjectDesignAmount(p) != null ? String(getProjectDesignAmount(p)) : "",
          getProjectEstimateValue(p) != null ? String(getProjectEstimateValue(p)) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (projectHaystack.includes(q)) return true;

        const projectAllocs = periodAllocations.filter((a) => a.project_id === p.id);
        return projectAllocs.some((a) => {
          const employee = employees.find((e) => e.id === a.employee_id);
          if (!employee) return false;
          const name = getEmployeeFullName(employee).toLowerCase();
          return name.includes(q) || employee.role.toLowerCase().includes(q);
        });
      })
      .filter((p) => {
        if (!applyOnlyWithAllocations || !filters.onlyWithAllocations) return true;
        return periodAllocations.some((a) => {
          if (a.project_id !== p.id) return false;
          if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
      })
      .sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [projects, filters, periodAllocations, employees, applyOnlyWithAllocations]);

  return {
    rows,
    periodDays,
    weekDays,
    monthDays,
    periodAllocations,
    clearFilters,
  };
}
