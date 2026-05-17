"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { useScheduling } from "@/context/scheduling-context";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

interface DraggableMonthAllocationChipProps {
  allocation: Allocation;
  canEdit?: boolean;
  onEdit: (allocation: Allocation) => void;
}

export function DraggableMonthAllocationChip({
  allocation,
  canEdit = true,
  onEdit,
}: DraggableMonthAllocationChipProps) {
  const { getCategoryById, getProjectById } = useScheduling();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: allocation.id,
    disabled: !canEdit,
    data: { type: "allocation", allocation },
  });

  const project = allocation.project_id ? getProjectById(allocation.project_id) : null;
  const category = getCategoryById(allocation.allocation_category_id);
  const title = project?.project_name ?? allocation.task_name ?? "Task";

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={cn("flex gap-0.5", isDragging && "opacity-60")}>
      {canEdit && (
        <button
          type="button"
          className="flex shrink-0 cursor-grab touch-none items-center justify-center text-slate-400 hover:text-slate-600 active:cursor-grabbing print:hidden"
          aria-label="Drag to reschedule"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}
      <button
        type="button"
        onClick={() => canEdit && onEdit(allocation)}
        disabled={!canEdit}
        className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-[9px] font-medium leading-tight text-slate-800 ring-1 ring-slate-200/80 hover:ring-emerald-300"
        style={{ backgroundColor: category?.color ?? "#f1f5f9" }}
        title={`${title} · ${allocation.hours}h`}
      >
        <span className="block truncate">{title}</span>
        <span className="text-[8px] opacity-80">{allocation.hours}h</span>
      </button>
    </div>
  );
}
