"use client";

import { useReportsWeekStart } from "@/components/reports/use-reports-export-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import type { ReportsPeriod } from "@/lib/reports-export";
import {
  filterAllocationsForMonth,
  filterAllocationsForWeek,
  getEmployeeMonthStats,
  getEmployeeWeekStats,
  getTeamMonthSummary,
  getTeamSummary,
} from "@/lib/utilization";
import { getTeamMonthTimeSummary, getTeamTimeSummary } from "@/lib/time-tracking";
import { getMonthStart } from "@/lib/week";

interface ReportsSummaryCardsProps {
  period: ReportsPeriod;
}

export function ReportsSummaryCards({ period }: ReportsSummaryCardsProps) {
  const { employees, allocations, timeEntries, selectedWeekStart, settings } = useScheduling();
  const weekStart = useReportsWeekStart(period);
  const monthStart = getMonthStart(selectedWeekStart);

  const summary =
    period === "month"
      ? getTeamMonthSummary(allocations, employees, monthStart, settings)
      : getTeamSummary(allocations, employees, weekStart, settings);

  const periodAllocations =
    period === "month"
      ? filterAllocationsForMonth(allocations, monthStart, settings)
      : filterAllocationsForWeek(allocations, weekStart, settings);

  const timeSummary =
    period === "month"
      ? getTeamMonthTimeSummary(allocations, timeEntries, monthStart, settings)
      : getTeamTimeSummary(allocations, timeEntries, employees, weekStart, settings);

  const activeEmployees = employees.filter((e) => e.active);
  const overCount = activeEmployees.filter((e) => {
    const stats =
      period === "month"
        ? getEmployeeMonthStats(e, allocations, monthStart, settings)
        : getEmployeeWeekStats(e, allocations, weekStart, settings);
    return stats.status === "over";
  }).length;
  const underCount = activeEmployees.filter((e) => {
    const stats =
      period === "month"
        ? getEmployeeMonthStats(e, allocations, monthStart, settings)
        : getEmployeeWeekStats(e, allocations, weekStart, settings);
    return stats.status === "under";
  }).length;

  const billableHours = periodAllocations
    .filter((a) => a.is_billable)
    .reduce((s, a) => s + a.hours, 0);
  const totalScheduled = periodAllocations.reduce((s, a) => s + a.hours, 0);
  const periodWord = period === "month" ? "month" : "week";

  const items = [
    {
      label: "Team utilization",
      value: `${summary.totalUtilizationPercent}%`,
      sub: `${totalScheduled}h scheduled this ${periodWord}`,
    },
    {
      label: "Billable hours",
      value: `${billableHours}h`,
      sub: `${summary.billablePercent}% of team capacity`,
    },
    {
      label: "Schedule match",
      value: `${timeSummary.matchPercent}%`,
      sub: `${timeSummary.actualHours}h actual vs ${timeSummary.scheduledHours}h scheduled`,
    },
    {
      label: overCount > 0 ? "Overallocated" : "Underutilized",
      value: String(overCount > 0 ? overCount : underCount),
      sub:
        overCount > 0
          ? overCount === 1
            ? "team member over capacity"
            : "team members over capacity"
          : underCount === 1
            ? "team member under capacity"
            : "team members under capacity",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
