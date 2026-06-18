"use client";

import { useDroppable } from "@dnd-kit/core";
import { isToday } from "date-fns";
import { Plus } from "lucide-react";

import { DraggableMonthAllocationChip } from "@/components/scheduling/draggable-month-allocation-chip";
import { cellDropId } from "@/components/scheduling/schedule-drop-cell";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

const MAX_VISIBLE = 2;

interface ScheduleMonthCellProps {
  employeeId: string;
  dateKey: string;
  date: Date;
  allocations: Allocation[];
  dayHours: number;
  dailyCapacity: number;
  showHours: boolean;
  isOverDay: boolean;
  canEdit?: boolean;
  onAdd: () => void;
  onEdit: (allocation: Allocation) => void;
}

export function ScheduleMonthCell({
  employeeId,
  dateKey,
  date,
  allocations,
  dayHours,
  dailyCapacity,
  showHours,
  isOverDay,
  canEdit = true,
  onAdd,
  onEdit,
}: ScheduleMonthCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellDropId(employeeId, dateKey),
    disabled: !canEdit,
    data: { type: "cell", employeeId, dateKey },
  });

  const today = isToday(date);
  const overflow = allocations.length - MAX_VISIBLE;

  return (
    <td
      className={cn(
        "schedule-grid-scroll-cell border-r p-1 align-top last:border-r-0",
        isOverDay && "bg-red-50/50",
        today && "bg-emerald-50/40",
      )}
    >
      {showHours && (
        <p
          className={cn(
            "mb-0.5 text-center text-[9px] font-medium tabular-nums",
            isOverDay ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {dayHours}/{dailyCapacity}
        </p>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[52px] flex-col gap-0.5 rounded-md transition-colors",
          isOver && canEdit && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
        )}
      >
        {allocations.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={onAdd}
              className="flex min-h-[48px] w-full items-center justify-center rounded border border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600 print:border-slate-300"
              aria-label="Add allocation"
            >
              <Plus className="h-3.5 w-3.5 print:hidden" />
            </button>
          ) : (
            <div className="min-h-[48px] rounded border border-dashed border-slate-100 bg-slate-50/30" aria-hidden />
          )
        ) : (
          <>
            {allocations.slice(0, MAX_VISIBLE).map((alloc) => (
              <DraggableMonthAllocationChip
                key={alloc.id}
                allocation={alloc}
                canEdit={canEdit}
                onEdit={onEdit}
              />
            ))}
            {overflow > 0 && canEdit && (
              <button
                type="button"
                onClick={onAdd}
                className="text-center text-[9px] font-medium text-muted-foreground hover:text-emerald-700 print:text-slate-600"
              >
                +{overflow} more
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={onAdd}
                className="flex h-4 w-full items-center justify-center text-slate-400 hover:text-emerald-600 print:hidden"
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
