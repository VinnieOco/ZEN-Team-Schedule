"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { useFilteredTimeTrackingRows } from "@/components/time-tracking/use-filtered-time-tracking-rows";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import {
  dayTimeVarianceCellClass,
  getEmployeeDayActualHours,
  getEmployeeDayHours,
  varianceColorClass,
  varianceLabel,
} from "@/lib/time-tracking";
import {
  formatDateKey,
  formatDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export function TimeComparisonView() {
  const { allocations, timeEntries } = useScheduling();
  const { rows, weekDays, clearFilters } = useFilteredTimeTrackingRows();

  const sortedRows = useMemo(() => {
    return [...rows].sort(
      (a, b) => Math.abs(b.stats.varianceHours) - Math.abs(a.stats.varianceHours),
    );
  }, [rows]);

  if (sortedRows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description="Adjust filters or clear them to compare scheduled vs actual hours."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-slate-700">Daily cells show scheduled / actual:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-emerald-50 ring-1 ring-emerald-200" /> On track
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-blue-50 ring-1 ring-blue-100" /> Under
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-orange-50 ring-1 ring-orange-200" /> Over
        </span>
      </div>

      <p className="text-xs text-muted-foreground lg:hidden">
        Swipe horizontally to view the full week →
      </p>

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[200px] border-r bg-slate-50 px-4 py-3 text-left font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                Team member
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[80px] border-r px-1 py-3 text-center text-xs font-medium last:border-r-0"
                >
                  {formatDayHeader(day)}
                </th>
              ))}
              <th className="min-w-[120px] bg-slate-50 px-3 py-3 text-center text-xs font-medium text-muted-foreground">
                Week
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ employee, stats }) => (
              <tr key={employee.id} className="border-b align-middle hover:bg-slate-50/40">
                <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-slate-100 text-xs font-medium text-slate-700">
                        {getEmployeeInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {getEmployeeFullName(employee)}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] font-semibold tabular-nums",
                          varianceColorClass(stats.varianceHours),
                        )}
                      >
                        {stats.actualHours}h actual · {varianceLabel(stats.varianceHours)}
                      </p>
                    </div>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const scheduled = getEmployeeDayHours(allocations, employee.id, day);
                  const actual = getEmployeeDayActualHours(timeEntries, employee.id, day);
                  const variance = Math.round((actual - scheduled) * 10) / 10;
                  return (
                    <td key={formatDateKey(day)} className="border-r p-1 last:border-r-0">
                      <div
                        className={cn(
                          "mx-auto flex h-12 w-full max-w-[72px] flex-col items-center justify-center rounded-md px-1 text-[10px] tabular-nums leading-tight",
                          dayTimeVarianceCellClass(scheduled, actual),
                        )}
                        title={`Scheduled ${scheduled}h · Actual ${actual}h · Δ ${varianceLabel(variance)}`}
                      >
                        <span>
                          {scheduled}h / {actual}h
                        </span>
                        <span className={cn("font-medium", varianceColorClass(variance))}>
                          {varianceLabel(variance)}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="bg-slate-50/50 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    {stats.scheduledHours}h → {stats.actualHours}h
                  </p>
                  <p
                    className={cn("text-sm font-bold tabular-nums", varianceColorClass(stats.varianceHours))}
                  >
                    {varianceLabel(stats.varianceHours)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sorted by largest week variance. Log time on the <strong>Entries</strong> tab or use{" "}
        <strong>Log time</strong> above.
      </p>
    </div>
  );
}
