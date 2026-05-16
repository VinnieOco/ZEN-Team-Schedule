"use client";

import { isToday } from "date-fns";
import { Plus } from "lucide-react";

import { useScheduling } from "@/context/scheduling-context";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

const MAX_VISIBLE = 2;

interface ScheduleMonthCellProps {
  date: Date;
  allocations: Allocation[];
  dayHours: number;
  dailyCapacity: number;
  showHours: boolean;
  isOverDay: boolean;
  onAdd: () => void;
  onEdit: (allocation: Allocation) => void;
}

export function ScheduleMonthCell({
  date,
  allocations,
  dayHours,
  dailyCapacity,
  showHours,
  isOverDay,
  onAdd,
  onEdit,
}: ScheduleMonthCellProps) {
  const { getCategoryById, getProjectById } = useScheduling();
  const today = isToday(date);
  const overflow = allocations.length - MAX_VISIBLE;

  return (
    <td
      className={cn(
        "border-r p-1 align-top last:border-r-0",
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
      <div className="flex min-h-[52px] flex-col gap-0.5">
        {allocations.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-[48px] w-full items-center justify-center rounded border border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600"
            aria-label="Add allocation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <>
            {allocations.slice(0, MAX_VISIBLE).map((alloc) => {
              const project = alloc.project_id ? getProjectById(alloc.project_id) : null;
              const category = getCategoryById(alloc.allocation_category_id);
              const title = project?.project_name ?? alloc.task_name ?? "Task";
              return (
                <button
                  key={alloc.id}
                  type="button"
                  onClick={() => onEdit(alloc)}
                  className="w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-slate-800 ring-1 ring-slate-200/80 hover:ring-emerald-300"
                  style={{ backgroundColor: category?.color ?? "#f1f5f9" }}
                  title={`${title} · ${alloc.hours}h`}
                >
                  <span className="block truncate">{title}</span>
                  <span className="text-[8px] opacity-80">{alloc.hours}h</span>
                </button>
              );
            })}
            {overflow > 0 && (
              <button
                type="button"
                onClick={onAdd}
                className="text-center text-[9px] font-medium text-muted-foreground hover:text-emerald-700"
              >
                +{overflow} more
              </button>
            )}
            <button
              type="button"
              onClick={onAdd}
              className="flex h-4 w-full items-center justify-center text-slate-400 hover:text-emerald-600"
              aria-label="Add allocation"
            >
              <Plus className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </td>
  );
}
