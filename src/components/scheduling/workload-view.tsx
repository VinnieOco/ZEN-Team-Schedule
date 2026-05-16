"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import {
  dayWorkloadCellClass,
  filterAllocationsForWeek,
  getEmployeeDayHours,
  getEmployeeWeekStats,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import {
  formatDateKey,
  formatDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
  getWeekDays,
} from "@/lib/week";
import { cn } from "@/lib/utils";

export function WorkloadView() {
  const { employees, allocations, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const weekDays = getWeekDays(selectedWeekStart, settings);
  const weekAllocations = filterAllocationsForWeek(allocations, selectedWeekStart, settings);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((e) => e.active)
      .filter((e) => {
        if (!filters.search) return true;
        const q = filters.search.toLowerCase();
        const name = getEmployeeFullName(e).toLowerCase();
        return name.includes(q) || e.role.toLowerCase().includes(q);
      })
      .filter((e) => {
        if (!filters.projectId && !filters.categoryId) return true;
        return weekAllocations.some((a) => {
          if (a.employee_id !== e.id) return false;
          if (filters.projectId && a.project_id !== filters.projectId) return false;
          if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
      })
      .map((employee) => ({
        employee,
        stats: getEmployeeWeekStats(employee, allocations, selectedWeekStart, settings),
      }))
      .sort((a, b) => b.stats.utilizationPercent - a.stats.utilizationPercent);
  }, [employees, filters, weekAllocations, allocations, selectedWeekStart, settings]);

  if (filteredEmployees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description="Adjust filters on the Schedule tab, or clear them to see workload for everyone."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-slate-700">Daily load:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-slate-50 ring-1 ring-slate-200" /> Empty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-blue-50 ring-1 ring-blue-100" /> Light
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-emerald-50 ring-1 ring-emerald-100" /> Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-6 rounded bg-orange-100 ring-1 ring-orange-200" /> Near cap
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
                Week
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(({ employee, stats }) => (
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
                          "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          utilizationStatusBg(stats.status),
                          utilizationStatusColor(stats.status),
                        )}
                      >
                        {stats.utilizationPercent}%
                      </span>
                    </div>
                  </div>
                </td>
                {weekDays.map((day) => {
                  const scheduled = getEmployeeDayHours(allocations, employee.id, day);
                  const cap = employee.daily_capacity_hours;
                  return (
                    <td key={formatDateKey(day)} className="border-r p-1 last:border-r-0">
                      <div
                        className={cn(
                          "mx-auto flex h-10 w-full max-w-[64px] flex-col items-center justify-center rounded-md text-xs tabular-nums",
                          dayWorkloadCellClass(scheduled, cap),
                        )}
                        title={`${scheduled}h scheduled · ${cap}h daily capacity`}
                      >
                        <span>{scheduled > 0 ? `${scheduled}h` : "—"}</span>
                        {scheduled > 0 && (
                          <span className="text-[10px] opacity-80">/ {cap}h</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="bg-slate-50/50 px-3 py-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{stats.scheduledHours}h</span>
                      <span>{stats.weeklyCapacity}h</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          stats.status === "over" && "bg-red-500",
                          stats.status === "near" && "bg-orange-500",
                          stats.status === "healthy" && "bg-emerald-500",
                          stats.status === "under" && "bg-blue-500",
                        )}
                        style={{
                          width: `${Math.min(stats.utilizationPercent, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Use the <strong>Schedule</strong> tab to add or move allocations. Filters apply when the
        filter panel is open on the Schedule tab.
      </p>
    </div>
  );
}
