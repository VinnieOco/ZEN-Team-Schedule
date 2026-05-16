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
import { EmptyState } from "@/components/ui/empty-state";
import { useScheduling } from "@/context/scheduling-context";
import {
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
import type { Allocation } from "@/types";
import { cn } from "@/lib/utils";

export function SchedulingGrid() {
  const {
    employees,
    allocations,
    settings,
    selectedWeekStart,
    filters,
    clearFilters,
    moveAllocation,
  } = useScheduling();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<string>();
  const [defaultDate, setDefaultDate] = useState<string>();
  const [activeAllocation, setActiveAllocation] = useState<Allocation | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

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
      });
  }, [employees, filters, weekAllocations]);

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

    moveAllocation(String(active.id), target.employeeId, target.dateKey);
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
        <span className="hidden sm:inline">Drag cards by the grip handle to move work between days or team members. </span>
        <span className="lg:hidden">Swipe horizontally to view the full week →</span>
      </p>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="schedule-scroll relative overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="sticky left-0 z-20 min-w-[220px] border-r bg-slate-50 px-4 py-3 text-left font-medium text-muted-foreground shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                  Team Member
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="min-w-[148px] border-r px-2 py-3 text-center font-medium last:border-r-0"
                  >
                    <div>{formatDayHeader(day)}</div>
                    <div className="text-xs font-normal text-muted-foreground">8 hrs cap</div>
                  </th>
                ))}
                <th className="min-w-[72px] bg-slate-50 px-3 py-3 text-center font-medium text-muted-foreground">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => {
                const stats = getEmployeeWeekStats(
                  employee,
                  allocations,
                  selectedWeekStart,
                  settings,
                );
                const dayAllocs = (dateKey: string) =>
                  weekAllocations.filter(
                    (a) => a.employee_id === employee.id && a.allocation_date === dateKey,
                  );

                return (
                  <tr key={employee.id} className="group border-b align-top hover:bg-slate-50/40">
                    <td className="sticky left-0 z-10 border-r bg-white px-4 py-3 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-slate-50/40">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-xs font-medium text-emerald-800">
                            {getEmployeeInitials(employee)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">
                            {getEmployeeFullName(employee)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{employee.role}</p>
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
                            {stats.scheduledHours} / {stats.weeklyCapacity} hrs
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
          </table>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeAllocation ? (
            <div className="w-[140px] rotate-1 shadow-lg">
              <AllocationCard allocation={activeAllocation} onEdit={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {weekAllocations.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <CalendarOff className="h-4 w-4 shrink-0" />
          No allocations scheduled for this week yet. Click a cell or Add Allocation to get started.
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
