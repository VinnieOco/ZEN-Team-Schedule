"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForWeek,
  getEmployeeWeekStats,
  getTeamSummary,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import { formatWeekRange, getEmployeeFullName } from "@/lib/week";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { employees, projects, allocations, selectedWeekStart, settings } = useScheduling();
  const summary = getTeamSummary(allocations, employees, selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);
  const weekLabel = formatWeekRange(selectedWeekStart, settings);

  const employeeStats = employees
    .filter((e) => e.active)
    .map((e) => getEmployeeWeekStats(e, allocations, selectedWeekStart, settings));

  const overallocated = employeeStats
    .filter((s) => s.status === "over")
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  const underutilized = employeeStats
    .filter((s) => s.status === "under")
    .sort((a, b) => a.utilizationPercent - b.utilizationPercent);

  const activeProjects = projects.filter((p) => p.active && p.status !== "Completed");

  const billableHours = weekAllocations.filter((a) => a.is_billable).reduce((s, a) => s + a.hours, 0);
  const nonBillableHours = weekAllocations.filter((a) => !a.is_billable).reduce((s, a) => s + a.hours, 0);

  return (
    <div className="space-y-5 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Design department overview · {weekLabel}
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/scheduling">
            Open Team Scheduling
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {overallocated.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {overallocated.length} team {overallocated.length === 1 ? "member" : "members"} over capacity
            </p>
            <p className="mt-0.5 text-red-800/90">
              Review the schedule to rebalance hours before the week fills up.
            </p>
            <Button variant="outline" size="sm" className="mt-2 h-8 border-red-200 bg-white" asChild>
              <Link href="/scheduling">View schedule</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={cn(
                "text-3xl font-bold tabular-nums",
                summary.totalUtilizationPercent > 100
                  ? "text-red-600"
                  : summary.totalUtilizationPercent >= 90
                    ? "text-orange-600"
                    : "text-slate-900",
              )}
            >
              {summary.totalUtilizationPercent}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Billable / Non-Billable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold tabular-nums">
              {summary.billablePercent}% / {summary.nonBillablePercent}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
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
            <p className="text-3xl font-bold tabular-nums">{activeProjects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-blue-600">{summary.availablePercent}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={overallocated.length > 0 ? "border-red-200" : undefined}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Overallocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallocated.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No one is over weekly capacity.
              </div>
            ) : (
              <ul className="space-y-2">
                {overallocated.map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId)!;
                  const overBy = s.scheduledHours - s.weeklyCapacity;
                  return (
                    <li
                      key={s.employeeId}
                      className="flex items-center justify-between gap-2 rounded-md bg-red-50/80 px-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">{getEmployeeFullName(emp)}</span>
                      <span className="shrink-0 text-right">
                        <span className={cn("font-semibold", utilizationStatusColor(s.status))}>
                          {s.utilizationPercent}%
                        </span>
                        <span className="block text-xs text-red-700">+{overBy}h</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-blue-600">
              <TrendingDown className="h-4 w-4" />
              Underutilized
            </CardTitle>
          </CardHeader>
          <CardContent>
            {underutilized.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Team capacity looks well used.
              </div>
            ) : (
              <ul className="space-y-2">
                {underutilized.slice(0, 6).map((s) => {
                  const emp = employees.find((e) => e.id === s.employeeId)!;
                  return (
                    <li key={s.employeeId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{getEmployeeFullName(emp)}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                          utilizationStatusBg(s.status),
                          utilizationStatusColor(s.status),
                        )}
                      >
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
