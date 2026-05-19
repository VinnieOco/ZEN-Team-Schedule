"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatProjectHours } from "@/lib/project-format";
import { dayAvailabilityCellClass, getEmployeeDayHours } from "@/lib/utilization";
import {
  formatDateKey,
  formatDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
} from "@/lib/week";
import { cn } from "@/lib/utils";

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

export function AvailabilityView() {
  const { rows, weekDays, weekAllocations, clearFilters } = useFilteredEmployeeRows({
    period: "week",
  });

  const sortedRows = useMemo(() => {
    const remainingHours = (stats: (typeof rows)[number]["stats"]) =>
      ("weeklyCapacity" in stats ? stats.weeklyCapacity : stats.monthlyCapacity) -
      stats.scheduledHours;
    return [...rows].sort((a, b) => remainingHours(b.stats) - remainingHours(a.stats));
  }, [rows]);

  const dayOpenTotals = useMemo(
    () =>
      weekDays.map((day) => {
        const dateKey = formatDateKey(day);
        const openHours = sortedRows.reduce((sum, { employee }) => {
          const scheduled = getEmployeeDayHours(weekAllocations, employee.id, day);
          return sum + (employee.daily_capacity_hours - scheduled);
        }, 0);
        return { dateKey, openHours: roundHours(openHours) };
      }),
    [weekDays, weekAllocations, sortedRows],
  );

  const weekOpenTotal = useMemo(
    () =>
      roundHours(
        sortedRows.reduce((sum, { stats }) => {
          const capacity =
            "weeklyCapacity" in stats ? stats.weeklyCapacity : stats.monthlyCapacity;
          return sum + (capacity - stats.scheduledHours);
        }, 0),
      ),
    [sortedRows],
  );

  if (sortedRows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description="Adjust filters on the Schedule tab, or clear them to see availability for everyone."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-slate-700">Open hours (capacity − scheduled):</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-emerald-100 ring-1 ring-emerald-200" /> Lots open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-blue-50 ring-1 ring-blue-100" /> Some open
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-orange-50 ring-1 ring-orange-200" /> Full
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-red-100 ring-1 ring-red-200" /> Over cap
        </span>
      </div>

      <p className="text-xs text-muted-foreground lg:hidden">
        Swipe horizontally to view the full week →
      </p>

      <div className="schedule-scroll relative max-w-full overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[200px] border-r bg-slate-50 px-4 py-3 text-left font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                Team member
              </th>
              {weekDays.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[72px] border-r px-1 py-3 text-center text-xs font-medium last:border-r-0"
                >
                  {formatDayHeader(day)}
                </th>
              ))}
              <th className="min-w-[100px] bg-slate-50 px-3 py-3 text-center text-xs font-medium text-muted-foreground">
                Week open
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ employee, stats }) => {
              const capacity =
                "weeklyCapacity" in stats ? stats.weeklyCapacity : stats.monthlyCapacity;
              const weekRemaining =
                Math.round((capacity - stats.scheduledHours) * 10) / 10;
              return (
                <tr key={employee.id} className="border-b align-middle hover:bg-slate-50/40">
                  <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-xs font-medium text-emerald-800">
                          {getEmployeeInitials(employee)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {getEmployeeFullName(employee)}
                        </p>
                        <span
                          className={cn(
                            "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                            weekRemaining < 0
                              ? "bg-red-50 text-red-600"
                              : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {weekRemaining}h week open
                        </span>
                      </div>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const scheduled = getEmployeeDayHours(weekAllocations, employee.id, day);
                    const cap = employee.daily_capacity_hours;
                    const remaining = Math.round((cap - scheduled) * 10) / 10;
                    return (
                      <td key={formatDateKey(day)} className="border-r p-1 last:border-r-0">
                        <div
                          className={cn(
                            "mx-auto flex h-10 w-full max-w-[64px] flex-col items-center justify-center rounded-md text-xs tabular-nums",
                            dayAvailabilityCellClass(remaining, cap),
                          )}
                          title={`${remaining}h open · ${scheduled}h scheduled · ${cap}h capacity`}
                        >
                          <span>{remaining}h</span>
                          <span className="text-[10px] opacity-80">open</span>
                        </div>
                      </td>
                    );
                  })}
                  <td className="bg-slate-50/50 px-3 py-2">
                    <div className="space-y-1 text-center">
                      <p
                        className={cn(
                          "text-lg font-bold tabular-nums",
                          weekRemaining < 0 ? "text-red-600" : "text-emerald-700",
                        )}
                      >
                        {weekRemaining}h
                      </p>
                      <p className="text-[10px] text-muted-foreground">of {capacity}h</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-slate-100">
              <td className="sticky left-0 z-20 border-r bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                Totals
              </td>
              {dayOpenTotals.map(({ dateKey, openHours }) => (
                <td
                  key={dateKey}
                  className={cn(
                    "border-r px-2 py-2.5 text-center text-xs font-semibold tabular-nums last:border-r-0",
                    openHours < 0 ? "text-red-600" : "text-slate-800",
                  )}
                >
                  {openHours !== 0 ? `${formatProjectHours(openHours)}h open` : "—"}
                </td>
              ))}
              <td
                className={cn(
                  "bg-slate-100 px-3 py-2.5 text-center text-xs font-semibold tabular-nums",
                  weekOpenTotal < 0 ? "text-red-600" : "text-slate-800",
                )}
              >
                {weekOpenTotal !== 0 ? `${formatProjectHours(weekOpenTotal)}h open` : "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sorted by most open time this week. Use <strong>Schedule</strong> to assign work, or{" "}
        <strong>Workload</strong> to see hours already booked.
      </p>
    </div>
  );
}
