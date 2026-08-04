"use client";

import { useMemo } from "react";

import { useScheduling } from "@/context/scheduling-context";
import type { ReportsExportContext, ReportsPeriod } from "@/lib/reports-export";
import {
  getEmployeeFullName,
  getMonthStart,
  getTimesheetSettings,
  getWeekStart,
} from "@/lib/week";
import type { CompanySettings } from "@/types";

/** Reports always include Sat/Sun, matching timesheets (independent of schedule weekend toggle). */
export function useReportsSettings(): CompanySettings {
  const { settings } = useScheduling();
  return useMemo(() => getTimesheetSettings(settings), [settings]);
}

export function useReportsExportContext(period: ReportsPeriod): ReportsExportContext {
  const {
    employees,
    projects,
    categories,
    allocations,
    timeEntries,
    projectNotes,
    selectedWeekStart,
    getEmployeeById,
    getProjectById,
    getCategoryById,
  } = useScheduling();
  const settings = useReportsSettings();

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
      projectNotes,
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
      projectNotes,
      getEmployeeById,
      getProjectById,
      getCategoryById,
    ],
  );
}

export function useReportsWeekStart(period: ReportsPeriod): Date {
  const { selectedWeekStart } = useScheduling();
  const settings = useReportsSettings();
  return period === "month"
    ? getMonthStart(selectedWeekStart)
    : getWeekStart(selectedWeekStart, settings);
}
