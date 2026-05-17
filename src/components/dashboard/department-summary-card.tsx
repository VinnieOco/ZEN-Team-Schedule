"use client";

import { AlertTriangle, TrendingDown } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentDashboardSummary } from "@/lib/dashboard";
import { varianceColorClass, varianceLabel } from "@/lib/time-tracking";
import { utilizationStatusBg, utilizationStatusColor } from "@/lib/utilization";
import { getEmployeeFullName } from "@/lib/week";
import { cn } from "@/lib/utils";

interface DepartmentSummaryCardProps {
  summary: DepartmentDashboardSummary;
  compact?: boolean;
}

export function DepartmentSummaryCard({ summary, compact = false }: DepartmentSummaryCardProps) {
  const { utilization, time, overallocated, underutilized } = summary;

  return (
    <Card className={overallocated.length > 0 ? "border-red-200/80" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{summary.departmentLabel}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {summary.memberCount} team {summary.memberCount === 1 ? "member" : "members"} ·{" "}
              {summary.activeProjectCount} active project
              {summary.activeProjectCount === 1 ? "" : "s"} this week
            </p>
          </div>
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              utilization.totalUtilizationPercent > 100
                ? "text-red-600"
                : utilization.totalUtilizationPercent >= 90
                  ? "text-orange-600"
                  : "text-slate-900",
            )}
          >
            {utilization.totalUtilizationPercent}%
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Billable</p>
            <p className="font-semibold tabular-nums">{utilization.billablePercent}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-semibold tabular-nums text-blue-600">
              {utilization.availablePercent}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
            <p className="font-semibold tabular-nums">{time.scheduledHours}h</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Logged</p>
            <p className={cn("font-semibold tabular-nums", varianceColorClass(time.varianceHours))}>
              {time.actualHours}h ({varianceLabel(time.varianceHours)})
            </p>
          </div>
        </div>

        {!compact && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Overallocated
              </p>
              {overallocated.length === 0 ? (
                <p className="text-xs text-muted-foreground">None this week</p>
              ) : (
                <ul className="space-y-1">
                  {overallocated.slice(0, 4).map(({ employee, stats }) => (
                    <li
                      key={employee.id}
                      className="flex justify-between gap-2 rounded bg-red-50/80 px-2 py-1 text-xs"
                    >
                      <span className="truncate font-medium">{getEmployeeFullName(employee)}</span>
                      <span className={cn("shrink-0 font-semibold", utilizationStatusColor(stats.status))}>
                        {stats.utilizationPercent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-blue-600">
                <TrendingDown className="h-3.5 w-3.5" />
                Underutilized
              </p>
              {underutilized.length === 0 ? (
                <p className="text-xs text-muted-foreground">None this week</p>
              ) : (
                <ul className="space-y-1">
                  {underutilized.slice(0, 4).map(({ employee, stats }) => (
                    <li key={employee.id} className="flex justify-between gap-2 text-xs">
                      <span className="truncate">{getEmployeeFullName(employee)}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 font-semibold",
                          utilizationStatusBg(stats.status),
                          utilizationStatusColor(stats.status),
                        )}
                      >
                        {stats.utilizationPercent}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
