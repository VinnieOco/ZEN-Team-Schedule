"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { AllocationCard } from "@/components/scheduling/allocation-card";
import { cn } from "@/lib/utils";
import type { Allocation } from "@/types";

interface DraggableAllocationCardProps {
  allocation: Allocation;
  onEdit: (allocation: Allocation) => void;
}

export function DraggableAllocationCard({ allocation, onEdit }: DraggableAllocationCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: allocation.id,
    data: { type: "allocation", allocation },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative flex gap-0.5", isDragging && "opacity-60")}
    >
      <button
        type="button"
        className="mt-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        aria-label="Drag to reschedule"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1">
        <AllocationCard allocation={allocation} onEdit={onEdit} />
      </div>
    </div>
  );
}
