"use client";

import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useScheduling } from "@/context/scheduling-context";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

interface AllocationCardProps {
  allocation: Allocation;
  onEdit: (allocation: Allocation) => void;
}

export function AllocationCard({ allocation, onEdit }: AllocationCardProps) {
  const { getCategoryById, getProjectById, deleteAllocation, duplicateAllocation } =
    useScheduling();
  const category = getCategoryById(allocation.allocation_category_id);
  const project = allocation.project_id ? getProjectById(allocation.project_id) : null;
  const title = project?.project_name ?? allocation.task_name ?? "Unassigned";

  const handleDelete = () => {
    if (window.confirm(`Delete allocation for "${title}" (${allocation.hours}h)?`)) {
      deleteAllocation(allocation.id);
    }
  };

  return (
    <div
      className={cn(
        "group/card relative rounded-md border border-slate-200/90 p-2 text-xs shadow-sm transition-all hover:shadow-md hover:ring-1 hover:ring-emerald-200/60",
        !allocation.is_billable && "allocation-card-nonbillable",
      )}
      style={{ backgroundColor: category?.color ?? "#f1f5f9" }}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onEdit(allocation)}
        >
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold leading-tight text-slate-900">{title}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
              {allocation.hours}h
            </span>
            <span
              className={cn(
                "rounded px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide",
                allocation.is_billable
                  ? "bg-emerald-600/15 text-emerald-800"
                  : "bg-slate-500/15 text-slate-600",
              )}
            >
              {allocation.is_billable ? "Billable" : "Non-bill"}
            </span>
          </div>
          <p className="mt-1 truncate text-slate-600">{category?.name}</p>
          {allocation.phase && (
            <p className="mt-0.5 truncate text-slate-500">{allocation.phase}</p>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-100 sm:opacity-0 sm:group-hover/card:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(allocation)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => duplicateAllocation(allocation.id)}>
              <Copy className="mr-2 h-3.5 w-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
