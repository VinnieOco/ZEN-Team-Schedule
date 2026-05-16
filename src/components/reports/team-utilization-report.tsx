"use client";

import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportsWeekStart } from "@/components/reports/use-reports-export-context";
import { useScheduling } from "@/context/scheduling-context";
import type { ReportsPeriod } from "@/lib/reports-export";
import {
  getEmployeeMonthStats,
  getEmployeeWeekStats,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import { getMonthStart } from "@/lib/week";
import type { UtilizationStatus } from "@/types";
import { getEmployeeFullName } from "@/lib/week";
import { cn } from "@/lib/utils";

function UtilizationBar({ percent, status }: { percent: number; status: UtilizationStatus }) {
  const width = Math.min(percent, 100);
  const barColor =
    status === "over"
      ? "bg-red-500"
      : status === "near"
        ? "bg-orange-500"
        : status === "healthy"
          ? "bg-emerald-500"
          : "bg-blue-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${width}%` }}
        />
      </div>
      <span
        className={cn("w-10 text-right text-sm font-medium tabular-nums", utilizationStatusColor(status))}
      >
        {percent}%
      </span>
    </div>
  );
}

interface TeamUtilizationReportProps {
  period: ReportsPeriod;
}

export function TeamUtilizationReport({ period }: TeamUtilizationReportProps) {
  const { employees, allocations, selectedWeekStart, settings } = useScheduling();
  const weekStart = useReportsWeekStart(period);
  const monthStart = getMonthStart(selectedWeekStart);

  const rows = employees
    .filter((e) => e.active)
    .map((employee) => ({
      employee,
      stats:
        period === "month"
          ? getEmployeeMonthStats(employee, allocations, monthStart, settings)
          : getEmployeeWeekStats(employee, allocations, weekStart, settings),
    }))
    .sort((a, b) => b.stats.utilizationPercent - a.stats.utilizationPercent);

  const capacityLabel = period === "month" ? "Monthly capacity" : "Weekly capacity";
  const periodWord = period === "month" ? "month" : "week";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team utilization</CardTitle>
        <CardDescription>
          Scheduled hours vs {capacityLabel.toLowerCase()} for the selected {periodWord}.{" "}
          <Link href="/scheduling" className="text-emerald-700 hover:underline">
            Edit schedule
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Scheduled</TableHead>
              <TableHead className="text-right">{capacityLabel}</TableHead>
              <TableHead className="text-right">Billable</TableHead>
              <TableHead className="min-w-[180px]">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, stats }) => (
              <TableRow key={employee.id} className={utilizationStatusBg(stats.status)}>
                <TableCell className="font-medium">{getEmployeeFullName(employee)}</TableCell>
                <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                  {employee.role}
                </TableCell>
                <TableCell className="text-right tabular-nums">{stats.scheduledHours}h</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {"monthlyCapacity" in stats ? stats.monthlyCapacity : stats.weeklyCapacity}h
                </TableCell>
                <TableCell className="text-right tabular-nums">{stats.billableHours}h</TableCell>
                <TableCell>
                  <UtilizationBar percent={stats.utilizationPercent} status={stats.status} />
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No active team members.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
