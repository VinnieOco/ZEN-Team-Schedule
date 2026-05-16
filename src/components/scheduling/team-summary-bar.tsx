"use client";

import type { ScheduleCalendarView } from "@/components/scheduling/scheduling-header";
import { useScheduling } from "@/context/scheduling-context";
import { getTeamMonthSummary, getTeamSummary } from "@/lib/utilization";
import { getMonthStart } from "@/lib/week";
import { cn } from "@/lib/utils";

interface TeamSummaryBarProps {
  calendarView?: ScheduleCalendarView;
}

export function TeamSummaryBar({ calendarView = "week" }: TeamSummaryBarProps) {
  const { allocations, employees, selectedWeekStart, settings } = useScheduling();
  const summary =
    calendarView === "month"
      ? getTeamMonthSummary(
          allocations,
          employees,
          getMonthStart(selectedWeekStart),
          settings,
        )
      : getTeamSummary(allocations, employees, selectedWeekStart, settings);

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
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-slate-100 bg-white/80 px-3 py-2 text-center sm:text-left"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", item.valueClass)}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
