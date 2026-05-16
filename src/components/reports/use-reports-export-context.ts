"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import type { ReportsExportContext, ReportsPeriod } from "@/lib/reports-export";
import { getEmployeeFullName, getMonthStart, getWeekStart } from "@/lib/week";

export function useReportsExportContext(period: ReportsPeriod): ReportsExportContext {
  const {
    employees,
    projects,
    categories,
    allocations,
    timeEntries,
    settings,
    selectedWeekStart,
    getEmployeeById,
    getProjectById,
    getCategoryById,
  } = useScheduling();

  return useMemo(
    () => ({
      period,
      periodStart:
        period === "month" ? getMonthStart(selectedWeekStart) : selectedWeekStart,
      settings,
      employees,
      projects,
      categories,
      allocations,
      timeEntries,
      getEmployeeById,
      getProjectById,
      getCategoryById,
      getEmployeeFullName,
    }),
    [
      period,
      selectedWeekStart,
      settings,
      employees,
      projects,
      categories,
      allocations,
      timeEntries,
      getEmployeeById,
      getProjectById,
      getCategoryById,
    ],
  );
}

export function useReportsWeekStart(period: ReportsPeriod): Date {
  const { selectedWeekStart, settings } = useScheduling();
  return period === "month"
    ? getMonthStart(selectedWeekStart)
    : getWeekStart(selectedWeekStart, settings);
}
