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
import {
  parseCellDropId,
  ScheduleDropCell,
} from "@/components/scheduling/schedule-drop-cell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useFilteredEmployeeRows } from "@/components/scheduling/use-filtered-employee-rows";
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import { usePermissions } from "@/hooks/use-permissions";
import { formatProjectHours } from "@/lib/project-format";
import {
  getDayScheduleTotals,
  getEmployeeDayHours,
  getPeriodScheduleTotals,
  utilizationStatusBg,
  utilizationStatusColor,
} from "@/lib/utilization";
import { departmentFilterLabel } from "@/lib/departments";
import {
  formatDateKey,
  formatDayHeader,
  getEmployeeFullName,
  getEmployeeInitials,
} from "@/lib/week";
import type { Allocation } from "@/types";
import { cn } from "@/lib/utils";

interface SchedulingGridProps {
  onAddAllocation?: () => void;
}

export function SchedulingGrid({ onAddAllocation }: SchedulingGridProps = {}) {
  const { allocations, filters, moveAllocation, settings } = useScheduling();
  const { canEditAllocationFor, canEditSchedule } = usePermissions();
  const { rows, weekDays, weekAllocations, clearFilters } = useFilteredEmployeeRows({
    period: "week",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>();
  const [defaultDate, setDefaultDate] = useState<string>();
  const [activeAllocation, setActiveAllocation] = useState<Allocation | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
      weekDays.map((day) => {
        const dateKey = formatDateKey(day);
        return {
          dateKey,
          ...getDayScheduleTotals(visibleEmployeeIds, weekAllocations, dateKey),
        };
      }),
    [weekDays, weekAllocations, visibleEmployeeIds],
  );

  const weekTotals = useMemo(
    () => getPeriodScheduleTotals(visibleEmployeeIds, weekAllocations),
    [visibleEmployeeIds, weekAllocations],
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No team members match your filters"
        description={
          filters.department
            ? `No one in ${departmentFilterLabel(filters.department)} matches your filters. Try another department or clear filters.`
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
        {canEditSchedule && (
          <span className="hidden sm:inline">
            Drag cards by the grip handle to move work between days or team members.{" "}
          </span>
        )}
        <span className="lg:hidden">Swipe horizontally to view the full week →</span>
      </p>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="schedule-scroll schedule-scroll-fade relative overflow-x-auto rounded-lg border bg-white shadow-sm print:overflow-visible print:border-slate-300 print:shadow-none">
          <table className="w-full min-w-[680px] border-collapse text-sm sm:min-w-[880px] lg:min-w-[960px] print:min-w-0 print:text-xs">
            <thead>
              <tr className="border-b bg-slate-50 print:bg-white">
                <th className="sticky left-0 z-20 min-w-[220px] border-r bg-slate-50 px-4 py-3 text-left font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] print:static print:shadow-none">
                  Team Member
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="min-w-[148px] border-r px-2 py-3 text-center font-medium last:border-r-0"
                  >
                    <div>{formatDayHeader(day)}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {settings.default_daily_capacity}h cap
                    </div>
                  </th>
                ))}
                <th className="min-w-[72px] bg-slate-50 px-3 py-3 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, stats }) => {
                const dayAllocs = (dateKey: string) =>
                  weekAllocations.filter(
                    (a) => a.employee_id === employee.id && a.allocation_date === dateKey,
                  );

                return (
                  <tr key={employee.id} className="group border-b align-top hover:bg-slate-50/40 print:hover:bg-transparent">
                    <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/40 print:static print:shadow-none">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0 print:hidden">
                          <AvatarFallback className="bg-emerald-100 text-xs font-medium text-emerald-800">
                            {getEmployeeInitials(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {getEmployeeFullName(employee)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{employee.role}</p>
                          {!filters.department && employee.department && (
                            <p className="truncate text-[10px] text-slate-500">{employee.department}</p>
                          )}
                          <span
                            className={cn(
                              "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              utilizationStatusBg(stats.status),
                              utilizationStatusColor(stats.status),
                            )}
                          >
                            {stats.utilizationPercent}% utilized
                          </span>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stats.scheduledHours} /{" "}
                            {"weeklyCapacity" in stats ? stats.weeklyCapacity : stats.monthlyCapacity}{" "}
                            hrs
                          </p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const dateKey = formatDateKey(day);
                      const dayHours = getEmployeeDayHours(allocations, employee.id, day);

                      return (
                        <ScheduleDropCell
                          key={dateKey}
                          employeeId={employee.id}
                          dateKey={dateKey}
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
                    <td className="bg-slate-50/30 px-3 py-3 text-center">
                      <span
                        className={cn(
                          "text-sm font-semibold",
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
            <tfoot>
              <tr className="border-t-2 bg-slate-100 print:bg-slate-50">
                <td className="sticky left-0 z-20 border-r bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] print:static print:shadow-none">
                  Daily totals
                </td>
                {dayTotals.map(({ dateKey, employeeCount, totalHours }) => (
                  <td
                    key={dateKey}
                    className="border-r px-2 py-2.5 text-center text-xs last:border-r-0"
                  >
                    <p className="font-semibold text-slate-800">
                      {employeeCount}{" "}
                      {employeeCount === 1 ? "employee" : "employees"}
                    </p>
                    <p className="mt-0.5 tabular-nums text-muted-foreground">
                      {formatProjectHours(totalHours)}h scheduled
                    </p>
                  </td>
                ))}
                <td className="bg-slate-100 px-3 py-2.5 text-center text-xs print:bg-slate-50">
                  <p className="font-semibold text-slate-800">
                    {weekTotals.employeeCount}{" "}
                    {weekTotals.employeeCount === 1 ? "employee" : "employees"}
                  </p>
                  <p className="mt-0.5 tabular-nums text-muted-foreground">
                    {formatProjectHours(weekTotals.totalHours)}h scheduled
                  </p>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeAllocation ? (
            <div className="w-[140px] rotate-1 shadow-lg print:hidden">
              <AllocationCard allocation={activeAllocation} onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {weekAllocations.length === 0 && (
        <div className="mt-4 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-start gap-2">
            <CalendarOff className="mt-0.5 h-4 w-4 shrink-0" />
            <p>No allocations scheduled for this week yet. Tap a cell or add your first assignment.</p>
          </div>
          {canEditSchedule && onAddAllocation && (
            <Button type="button" size="sm" variant="outline" className="shrink-0 border-amber-300 bg-white" onClick={onAddAllocation}>
              Add allocation
            </Button>
          )}
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
