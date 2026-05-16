"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForWeek,
  getEmployeeWeekStats,
  getTeamSummary,
} from "@/lib/utilization";

export function ReportsSummaryCards() {
  const { employees, allocations, selectedWeekStart, settings } = useScheduling();
  const summary = getTeamSummary(allocations, employees, selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);

  const activeEmployees = employees.filter((e) => e.active);
  const overCount = activeEmployees.filter(
    (e) =>
      getEmployeeWeekStats(e, allocations, selectedWeekStart, settings).status === "over",
  ).length;
  const underCount = activeEmployees.filter(
    (e) =>
      getEmployeeWeekStats(e, allocations, selectedWeekStart, settings).status === "under",
  ).length;

  const billableHours = weekAllocations
    .filter((a) => a.is_billable)
    .reduce((s, a) => s + a.hours, 0);
  const totalScheduled = weekAllocations.reduce((s, a) => s + a.hours, 0);

  const items = [
    {
      label: "Team utilization",
      value: `${summary.totalUtilizationPercent}%`,
      sub: `${totalScheduled}h scheduled this week`,
    },
    {
      label: "Billable hours",
      value: `${billableHours}h`,
      sub: `${summary.billablePercent}% of team capacity`,
    },
    {
      label: "Overallocated",
      value: String(overCount),
      sub: overCount === 1 ? "team member" : "team members",
    },
    {
      label: "Underutilized",
      value: String(underCount),
      sub: underCount === 1 ? "team member" : "team members",
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
