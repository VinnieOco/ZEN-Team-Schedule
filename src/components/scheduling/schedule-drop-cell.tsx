"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

import { AllocationCard } from "@/components/scheduling/allocation-card";
import { DraggableAllocationCard } from "@/components/scheduling/draggable-allocation-card";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

export function cellDropId(employeeId: string, dateKey: string) {
  return `${employeeId}::${dateKey}`;
}

export function parseCellDropId(id: string): { employeeId: string; dateKey: string } | null {
  const parts = id.split("::");
  if (parts.length !== 2) return null;
  return { employeeId: parts[0], dateKey: parts[1] };
}

interface ScheduleDropCellProps {
  employeeId: string;
  dateKey: string;
  allocations: Allocation[];
  dayHours: number;
  dailyCapacity: number;
  showHours: boolean;
  isOverDay: boolean;
  canEdit?: boolean;
  onAdd: () => void;
  onEdit: (allocation: Allocation) => void;
}

export function ScheduleDropCell({
  employeeId,
  dateKey,
  allocations,
  dayHours,
  dailyCapacity,
  showHours,
  isOverDay,
  canEdit = true,
  onAdd,
  onEdit,
}: ScheduleDropCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellDropId(employeeId, dateKey),
    disabled: !canEdit,
    data: { type: "cell", employeeId, dateKey },
  });

  return (
    <td
      className={cn(
        "schedule-grid-scroll-cell border-r p-1.5 align-top last:border-r-0",
        isOverDay && "bg-red-50/60",
        isOver && canEdit && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
      )}
    >
      {showHours && (
        <p
          className={cn(
            "mb-1 text-center text-[10px] font-medium",
            isOverDay ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {dayHours}/{dailyCapacity}h
        </p>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[64px] flex-col gap-1 rounded-md transition-colors",
          isOver && canEdit && "min-h-[72px]",
        )}
      >
        {allocations.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex min-h-[56px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-200 text-slate-400 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px]">Add</span>
            </button>
          ) : (
            <div className="min-h-[56px] rounded-md border border-dashed border-slate-100 bg-slate-50/30" />
          )
        ) : (
          <>
            {allocations.map((alloc) =>
              canEdit ? (
                <DraggableAllocationCard
                  key={alloc.id}
                  allocation={alloc}
                  canEdit
                  onEdit={onEdit}
                />
              ) : (
                <AllocationCard
                  key={alloc.id}
                  allocation={alloc}
                  canEdit={false}
                  onEdit={onEdit}
                />
              ),
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-6 w-full items-center justify-center rounded border border-dashed border-transparent text-slate-400 opacity-60 transition-all hover:border-emerald-300 hover:text-emerald-600 group-hover:opacity-100"
                aria-label="Add allocation"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </>
        )}
      </div>
    </td>
  );
}
