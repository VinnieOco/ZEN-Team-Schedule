"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForMonth,
  filterAllocationsForWeek,
} from "@/lib/utilization";
import { getEmployeeFullName, getMonthDays, getMonthStart, getWeekDays } from "@/lib/week";
import type { Project } from "@/types";

export function useFilteredProjectRows(period: "week" | "month" = "week") {
  const { projects, allocations, employees, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const monthStart = getMonthStart(selectedWeekStart);
  const weekDays = getWeekDays(selectedWeekStart, settings);
  const monthDays = getMonthDays(monthStart, settings);
  const periodDays = period === "month" ? monthDays : weekDays;

  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, settings);
  const periodAllocations = period === "month" ? monthAllocations : weekAllocations;

  const rows: Project[] = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return projects
      .filter((p) => p.active)
      .filter((p) => !filters.projectId || p.id === filters.projectId)
      .filter((p) => {
        if (!q) return true;
        const projectHaystack = [p.project_name, p.client_name, p.project_number]
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
      .sort((a, b) => a.project_name.localeCompare(b.project_name));
  }, [projects, filters, periodAllocations, employees]);

  return {
    rows,
    periodDays,
    weekDays,
    monthDays,
    periodAllocations,
    clearFilters,
  };
}
