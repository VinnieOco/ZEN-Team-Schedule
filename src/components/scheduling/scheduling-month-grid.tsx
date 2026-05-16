"use client";

import { useMemo, useState } from "react";
import { CalendarOff, Users } from "lucide-react";

import { AllocationFormDialog } from "@/components/scheduling/allocation-form-dialog";
import { ScheduleMonthCell } from "@/components/scheduling/schedule-month-cell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import {
  filterAllocationsForMonth,
  getEmployeeDayHours,
  getEmployeeMonthStats,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import {
  formatDateKey,
  formatMonthDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
  getMonthDays,
  getMonthStart,
} from "@/lib/week";
import type { Allocation } from "@/types";
import { cn } from "@/lib/utils";

export function SchedulingMonthGrid() {
  const { employees, allocations, settings, selectedWeekStart, filters, clearFilters } =
    useScheduling();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>();
  const [defaultDate, setDefaultDate] = useState<string>();

  const monthStart = getMonthStart(selectedWeekStart);
  const monthDays = getMonthDays(monthStart, settings);
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, settings);

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
        return monthAllocations.some((a) => {
          if (a.employee_id !== e.id) return false;
          if (filters.projectId && a.project_id !== filters.projectId) return false;
          if (filters.categoryId && a.allocation_category_id !== filters.categoryId) return false;
          return true;
        });
      });
  }, [employees, filters, monthAllocations]);

  const openAdd = (employeeId: string, date: string) => {
    setEditingAllocation(null);
    setDefaultEmployeeId(employeeId);
    setDefaultDate(date);
    setDialogOpen(true);
  };

  const openEdit = (allocation: Allocation) => {
    setEditingAllocation(allocation);
    setDefaultEmployeeId(undefined);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  if (filteredEmployees.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description="Try adjusting search, project, or category filters to see more of the schedule."
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Month overview — click a project chip to edit. Switch to <strong>Week</strong> for drag-and-drop.
        <span className="lg:hidden"> Swipe horizontally to see all days →</span>
      </p>
      <div className="schedule-scroll relative overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[200px] border-r bg-slate-50 px-4 py-2 text-left text-xs font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                Team member
              </th>
              {monthDays.map((day) => {
                const { weekday, day: dayNum } = formatMonthDayHeader(day);
                return (
                  <th
                    key={day.toISOString()}
                    className="min-w-[64px] border-r px-0.5 py-2 text-center text-[10px] font-medium last:border-r-0"
                  >
                    <div className="text-muted-foreground">{weekday}</div>
                    <div>{dayNum}</div>
                  </th>
                );
              })}
              <th className="min-w-[64px] bg-slate-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => {
              const stats = getEmployeeMonthStats(
                employee,
                allocations,
                monthStart,
                settings,
              );
              const dayAllocs = (dateKey: string) =>
                monthAllocations.filter(
                  (a) => a.employee_id === employee.id && a.allocation_date === dateKey,
                );

              return (
                <tr key={employee.id} className="border-b align-top hover:bg-slate-50/40">
                  <td className="sticky left-0 z-10 border-r bg-white px-3 py-2 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex items-start gap-2">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-[10px] font-medium text-emerald-800">
                          {getEmployeeInitials(employee)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {getEmployeeFullName(employee)}
                        </p>
                        <span
                          className={cn(
                            "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            utilizationStatusBg(stats.status),
                            utilizationStatusColor(stats.status),
                          )}
                        >
                          {stats.utilizationPercent}%
                        </span>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          {stats.scheduledHours}/{stats.monthlyCapacity}h
                        </p>
                      </div>
                    </div>
                  </td>
                  {monthDays.map((day) => {
                    const dateKey = formatDateKey(day);
                    const dayHours = getEmployeeDayHours(allocations, employee.id, day);
                    return (
                      <ScheduleMonthCell
                        key={dateKey}
                        date={day}
                        allocations={dayAllocs(dateKey)}
                        dayHours={dayHours}
                        dailyCapacity={employee.daily_capacity_hours}
                        showHours={filters.showHours}
                        isOverDay={dayHours > employee.daily_capacity_hours}
                        onAdd={() => openAdd(employee.id, dateKey)}
                        onEdit={openEdit}
                      />
                    );
                  })}
                  <td className="bg-slate-50/30 px-2 py-2 text-center">
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        stats.status === "over" ? "text-red-600" : "text-slate-700",
                      )}
                    >
                      {stats.scheduledHours}h
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {monthAllocations.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <CalendarOff className="h-4 w-4 shrink-0" />
          No allocations scheduled for this month yet. Click a day or Add Allocation to get started.
        </div>
      )}

      <AllocationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        allocation={editingAllocation}
        defaultEmployeeId={defaultEmployeeId}
        defaultDate={defaultDate}
      />
    </>
  );
}
