"use client";

import { AlertTriangle } from "lucide-react";

import type { ScheduleCalendarView } from "@/components/scheduling/scheduling-header";
import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { useScheduling } from "@/context/scheduling-context";
import { filterEmployeesByDepartment } from "@/lib/departments";
import { schedulingViewSettings } from "@/lib/scheduling-view";
import { getTeamMonthSummary, getTeamSummary } from "@/lib/utilization";
import { getMonthStart } from "@/lib/week";
import { cn } from "@/lib/utils";

interface TeamSummaryBarProps {
  calendarView?: ScheduleCalendarView;
}

export function TeamSummaryBar({ calendarView = "week" }: TeamSummaryBarProps) {
  const { allocations, employees, selectedWeekStart, settings, filters } = useScheduling();
  const viewSettings = schedulingViewSettings(settings, filters);
  const period = calendarView === "month" ? "month" : "week";
  const { rows } = useFilteredEmployeeRows({ period });
  const overCount = rows.filter((r) => r.stats.status === "over").length;

  const scopedEmployees = filterEmployeesByDepartment(
    employees.filter((e) => e.active),
    filters.department,
  );
  const summary =
    calendarView === "month"
      ? getTeamMonthSummary(
          allocations,
          scopedEmployees,
          getMonthStart(selectedWeekStart),
          viewSettings,
        )
      : getTeamSummary(allocations, scopedEmployees, selectedWeekStart, viewSettings);

  const items = [
    {
      label: "Total Utilization",
      value: `${summary.totalUtilizationPercent}%`,
      valueClass:
        summary.totalUtilizationPercent > 100
          ? "text-red-600"
          : summary.totalUtilizationPercent >= 90
            ? "text-orange-600"
            : "text-slate-900",
    },
    {
      label: "Billable",
      value: `${summary.billablePercent}%`,
      valueClass: "text-emerald-700",
    },
    {
      label: "Non-Billable",
      value: `${summary.nonBillablePercent}%`,
      valueClass: "text-slate-600",
    },
    {
      label: "Available",
      value: `${summary.availablePercent}%`,
      valueClass: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-2">
      {overCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {overCount} {overCount === 1 ? "person" : "people"} over{" "}
          {calendarView === "month" ? "monthly" : "weekly"} capacity
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-slate-100 bg-white/80 px-3 py-2 text-center sm:text-left"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>
            <p className={cn("mt-0.5 text-xl font-bold tabular-nums sm:text-2xl", item.valueClass)}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
