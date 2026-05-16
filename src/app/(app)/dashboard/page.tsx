"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForWeek,
  getEmployeeWeekStats,
  getTeamSummary,
  utilizationStatusColor,
} from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";

export default function DashboardPage() {
  const { employees, projects, allocations, selectedWeekStart, settings } = useScheduling();
  const summary = getTeamSummary(allocations, employees, selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);

  const employeeStats = employees
    .filter((e) => e.active)
    .map((e) => getEmployeeWeekStats(e, allocations, selectedWeekStart, settings));

  const overallocated = employeeStats.filter((s) => s.status === "over");
  const underutilized = employeeStats.filter((s) => s.status === "under");
  const activeProjects = projects.filter((p) => p.active && p.status !== "Completed");

  const billableHours = weekAllocations.filter((a) => a.is_billable).reduce((s, a) => s + a.hours, 0);
  const nonBillableHours = weekAllocations.filter((a) => !a.is_billable).reduce((s, a) => s + a.hours, 0);

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design department overview for the current week.
          </p>
        </div>
        <Button asChild>
          <Link href="/scheduling">Open Team Scheduling</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalUtilizationPercent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Billable / Non-Billable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {summary.billablePercent}% / {summary.nonBillablePercent}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {billableHours}h billable · {nonBillableHours}h non-billable
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.availablePercent}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-600">Overallocated</CardTitle>
          </CardHeader>
          <CardContent>
            {overallocated.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overallocated team members.</p>
            ) : (
              <ul className="space-y-2">
                {overallocated.map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId)!;
                  return (
                    <li key={s.employeeId} className="flex justify-between text-sm">
                      <span>{getEmployeeFullName(emp)}</span>
                      <span className={utilizationStatusColor(s.status)}>
                        {s.utilizationPercent}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-blue-600">Underutilized</CardTitle>
          </CardHeader>
          <CardContent>
            {underutilized.length === 0 ? (
              <p className="text-sm text-muted-foreground">No underutilized team members.</p>
            ) : (
              <ul className="space-y-2">
                {underutilized.map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId)!;
                  return (
                    <li key={s.employeeId} className="flex justify-between text-sm">
                      <span>{getEmployeeFullName(emp)}</span>
                      <span className={utilizationStatusColor(s.status)}>
                        {s.utilizationPercent}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
