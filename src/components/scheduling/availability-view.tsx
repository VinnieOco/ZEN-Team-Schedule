"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { dayAvailabilityCellClass, getEmployeeDayHours } from "@/lib/utilization";
import {
  formatDateKey,
  formatDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export function AvailabilityView() {
  const { rows, weekDays, allocations, clearFilters } = useFilteredEmployeeRows();

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const remainA = a.stats.weeklyCapacity - a.stats.scheduledHours;
      const remainB = b.stats.weeklyCapacity - b.stats.scheduledHours;
      return remainB - remainA;
    });
  }, [rows]);

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

      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
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
              const weekRemaining =
                Math.round((stats.weeklyCapacity - stats.scheduledHours) * 10) / 10;
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
                    const scheduled = getEmployeeDayHours(allocations, employee.id, day);
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
                      <p className="text-[10px] text-muted-foreground">of {stats.weeklyCapacity}h</p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sorted by most open time this week. Use <strong>Schedule</strong> to assign work, or{" "}
        <strong>Workload</strong> to see hours already booked.
      </p>
    </div>
  );
}
