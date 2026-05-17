"use client";

import { Plus } from "lucide-react";

import { useScheduling } from "@/context/scheduling-context";
import { cn } from "@/lib/utils";
import { getEmployeeFullName } from "@/lib/week";
import type { Allocation } from "@/types";

interface ProjectDayCellProps {
  allocations: Allocation[];
  onAdd: () => void;
  onEdit: (allocation: Allocation) => void;
}

export function ProjectDayCell({ allocations, onAdd, onEdit }: ProjectDayCellProps) {
  const { getEmployeeById, getCategoryById } = useScheduling();

  const dayTotal = allocations.reduce((sum, a) => sum + a.hours, 0);

  return (
    <td className="border-r p-1.5 align-top last:border-r-0">
      <div className="flex min-h-[52px] flex-col gap-1">
        {dayTotal > 0 && (
          <p className="text-center text-[10px] font-medium text-muted-foreground">{dayTotal}h</p>
        )}
        {allocations.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-slate-200 text-slate-400 transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-600"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-[10px]">Add</span>
          </button>
        ) : (
          <>
            {allocations.map((alloc) => {
              const employee = getEmployeeById(alloc.employee_id);
              const category = getCategoryById(alloc.allocation_category_id);
              const name = employee ? getEmployeeFullName(employee) : "Unknown";

              return (
                <button
                  key={alloc.id}
                  type="button"
                  onClick={() => onEdit(alloc)}
                  className={cn(
                    "w-full rounded-md border border-slate-200/90 px-1.5 py-1 text-left text-[10px] shadow-sm transition-colors hover:ring-1 hover:ring-emerald-300",
                    !alloc.is_billable && "opacity-90",
                  )}
                  style={{ backgroundColor: category?.color ?? "#f1f5f9" }}
                  title={`${name} · ${alloc.hours}h · ${category?.name ?? ""}`}
                >
                  <p className="truncate font-semibold text-slate-900">{name}</p>
                  <p className="text-slate-600">{alloc.hours}h</p>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onAdd}
              className="flex h-5 w-full items-center justify-center rounded border border-dashed border-transparent text-slate-400 opacity-70 transition-all hover:border-emerald-300 hover:text-emerald-600"
              aria-label="Add team member"
            >
              <Plus className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
    </td>
  );
}
