"use client";

import Link from "next/link";

import { useReportsWeekStart } from "@/components/reports/use-reports-export-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useScheduling } from "@/context/scheduling-context";
import type { ReportsPeriod } from "@/lib/reports-export";
import {
  getEmployeeMonthTimeStats,
  getEmployeeWeekTimeStats,
  varianceColorClass,
  varianceLabel,
} from "@/lib/time-tracking";
import { getEmployeeFullName, getMonthStart } from "@/lib/week";
import { cn } from "@/lib/utils";

interface ScheduledVsActualReportProps {
  period: ReportsPeriod;
}

export function ScheduledVsActualReport({ period }: ScheduledVsActualReportProps) {
  const { employees, allocations, timeEntries, selectedWeekStart, settings } = useScheduling();
  const weekStart = useReportsWeekStart(period);
  const monthStart = getMonthStart(selectedWeekStart);

  const rows = employees
    .filter((e) => e.active)
    .map((employee) => {
      const stats =
        period === "month"
          ? getEmployeeMonthTimeStats(
              employee,
              allocations,
              timeEntries,
              monthStart,
              settings,
            )
          : getEmployeeWeekTimeStats(
              employee,
              allocations,
              timeEntries,
              weekStart,
              settings,
            );
      return { employee, stats };
    })
    .sort((a, b) => Math.abs(b.stats.varianceHours) - Math.abs(a.stats.varianceHours));

  const periodWord = period === "month" ? "month" : "week";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled vs actual</CardTitle>
        <CardDescription>
          Compare planned schedule to logged time for the selected {periodWord}.{" "}
          <Link href="/time-tracking" className="text-emerald-700 hover:underline">
            Log time
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
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, stats }) => (
              <TableRow key={employee.id}>
                <TableCell className="font-medium">{getEmployeeFullName(employee)}</TableCell>
                <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                  {employee.role}
                </TableCell>
                <TableCell className="text-right tabular-nums">{stats.scheduledHours}h</TableCell>
                <TableCell className="text-right tabular-nums">{stats.actualHours}h</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    varianceColorClass(stats.varianceHours),
                  )}
                >
                  {varianceLabel(stats.varianceHours)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
