"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CalendarOff, Users } from "lucide-react";

import { AllocationCard } from "@/components/scheduling/allocation-card";
import { AllocationFormDialog } from "@/components/scheduling/allocation-form-dialog";
import { parseCellDropId } from "@/components/scheduling/schedule-drop-cell";
import { ScheduleMonthCell } from "@/components/scheduling/schedule-month-cell";
import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatProjectHours } from "@/lib/project-format";
import {
  filterAllocationsForMonth,
  getDayScheduleTotals,
  getEmployeeDayHours,
  getPeriodScheduleTotals,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import {
  formatDateKey,
  formatMonthDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
  getMonthStart,
} from "@/lib/week";
import type { Allocation } from "@/types";
import type { EmployeeMonthStats } from "@/lib/utilization";
import { departmentFilterLabel } from "@/lib/departments";
import { cn } from "@/lib/utils";

export function SchedulingMonthGrid() {
  const { allocations, settings, selectedWeekStart, filters, moveAllocation } = useScheduling();
  const { canEditAllocationFor, canEditSchedule } = usePermissions();
  const { rows, monthDays, clearFilters } = useFilteredEmployeeRows({ period: "month" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>();
  const [defaultDate, setDefaultDate] = useState<string>();
  const [activeAllocation, setActiveAllocation] = useState<Allocation | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const monthStart = getMonthStart(selectedWeekStart);
  const monthAllocations = filterAllocationsForMonth(allocations, monthStart, settings);

  const openAdd = (employeeId: string, date: string) => {
    if (!canEditAllocationFor(employeeId)) return;
    setEditingAllocation(null);
    setDefaultEmployeeId(employeeId);
    setDefaultDate(date);
    setDialogOpen(true);
  };

  const openEdit = (allocation: Allocation) => {
    if (!canEditAllocationFor(allocation.employee_id)) return;
    setEditingAllocation(allocation);
    setDefaultEmployeeId(undefined);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const alloc = allocations.find((a) => a.id === event.active.id);
    if (alloc) setActiveAllocation(alloc);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveAllocation(null);
    const { active, over } = event;
    if (!over) return;
    const target = parseCellDropId(String(over.id));
    if (!target) return;

    const alloc = allocations.find((a) => a.id === active.id);
    if (!alloc) return;
    if (!canEditAllocationFor(alloc.employee_id)) return;
    if (!canEditAllocationFor(target.employeeId)) return;

    moveAllocation(String(active.id), target.employeeId, target.dateKey);
  };

  const visibleEmployeeIds = useMemo(() => rows.map((r) => r.employee.id), [rows]);

  const dayTotals = useMemo(
    () =>
      monthDays.map((day) => {
        const dateKey = formatDateKey(day);
        return {
          dateKey,
          ...getDayScheduleTotals(visibleEmployeeIds, monthAllocations, dateKey),
        };
      }),
    [monthDays, monthAllocations, visibleEmployeeIds],
  );

  const monthTotals = useMemo(
    () => getPeriodScheduleTotals(visibleEmployeeIds, monthAllocations),
    [visibleEmployeeIds, monthAllocations],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description={
          filters.department
            ? `No one in ${departmentFilterLabel(filters.department)} matches your filters.`
            : "Try adjusting search, project, department, or category filters to see more of the schedule."
        }
        actionLabel="Clear filters"
        onAction={clearFilters}
      />
    );
  }

  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground print:hidden">
        {canEditSchedule && "Drag chips by the grip to move work between days. "}
        Click a chip to {canEditSchedule ? "edit" : "view"}.
        <span className="lg:hidden"> Swipe horizontally to see all days →</span>
      </p>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="schedule-scroll relative overflow-x-auto rounded-lg border bg-white shadow-sm print:overflow-visible print:border-slate-300 print:shadow-none">
          <table className="w-full min-w-[1100px] border-collapse text-sm print:min-w-0 print:text-xs">
            <thead>
              <tr className="border-b bg-slate-50 print:bg-white">
                <th className="sticky left-0 z-20 min-w-[200px] border-r bg-slate-50 px-4 py-2 text-left text-xs font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] print:static print:shadow-none">
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
                <th className="min-w-[64px] bg-slate-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground print:bg-white">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, stats }) => {
                const monthStats = stats as EmployeeMonthStats;
                const dayAllocs = (dateKey: string) =>
                  monthAllocations.filter(
                    (a) => a.employee_id === employee.id && a.allocation_date === dateKey,
                  );

                return (
                  <tr key={employee.id} className="border-b align-top hover:bg-slate-50/40 print:hover:bg-transparent">
                    <td className="sticky left-0 z-10 border-r bg-white px-3 py-2 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] print:static print:shadow-none">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-8 w-8 shrink-0 print:hidden">
                          <AvatarFallback className="bg-emerald-100 text-[10px] font-medium text-emerald-800">
                            {getEmployeeInitials(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {getEmployeeFullName(employee)}
                          </p>
                          {!filters.department && employee.department && (
                            <p className="truncate text-[10px] text-slate-500">{employee.department}</p>
                          )}
                          <span
                            className={cn(
                              "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                              utilizationStatusBg(monthStats.status),
                              utilizationStatusColor(monthStats.status),
                            )}
                          >
                            {monthStats.utilizationPercent}%
                          </span>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            {monthStats.scheduledHours}/{monthStats.monthlyCapacity}h
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
                          employeeId={employee.id}
                          dateKey={dateKey}
                          date={day}
                          allocations={dayAllocs(dateKey)}
                          dayHours={dayHours}
                          dailyCapacity={employee.daily_capacity_hours}
                          showHours={filters.showHours}
                          isOverDay={dayHours > employee.daily_capacity_hours}
                          canEdit={canEditAllocationFor(employee.id)}
                          onAdd={() => openAdd(employee.id, dateKey)}
                          onEdit={openEdit}
                        />
                      );
                    })}
                    <td className="bg-slate-50/30 px-2 py-2 text-center print:bg-white">
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          monthStats.status === "over" ? "text-red-600" : "text-slate-700",
                        )}
                      >
                        {monthStats.scheduledHours}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 bg-slate-100 print:bg-slate-50">
                <td className="sticky left-0 z-20 border-r bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] print:static print:shadow-none">
                  Daily totals
                </td>
                {dayTotals.map(({ dateKey, employeeCount, totalHours }) => (
                  <td
                    key={dateKey}
                    className="border-r px-0.5 py-2 text-center text-[10px] last:border-r-0"
                  >
                    <p className="font-semibold leading-tight text-slate-800">{employeeCount}</p>
                    <p className="mt-0.5 tabular-nums leading-tight text-muted-foreground">
                      {formatProjectHours(totalHours)}h
                    </p>
                  </td>
                ))}
                <td className="bg-slate-100 px-2 py-2 text-center text-[10px] print:bg-slate-50">
                  <p className="font-semibold leading-tight text-slate-800">
                    {monthTotals.employeeCount}
                  </p>
                  <p className="mt-0.5 tabular-nums leading-tight text-muted-foreground">
                    {formatProjectHours(monthTotals.totalHours)}h
                  </p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeAllocation ? (
            <div className="w-[120px] rotate-1 shadow-lg print:hidden">
              <AllocationCard allocation={activeAllocation} onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {monthAllocations.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
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
