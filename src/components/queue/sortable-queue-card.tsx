"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { QueueCardContent } from "@/components/queue/queue-card-content";
import type { DesignQueueItem, EstimatingQueueItem } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

interface SortableQueueCardProps {
  item: DesignQueueItem | EstimatingQueueItem;
  canDrag?: boolean;
  canRemove?: boolean;
  onRemove?: () => void;
}

export function SortableQueueCard({
  item,
  canDrag = true,
  canRemove,
  onRemove,
}: SortableQueueCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.project.id,
    disabled: !canDrag,
    data: { type: "queue-item", item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative flex gap-0.5", isDragging && "opacity-60")}
    >
      {canDrag && (
        <button
          type="button"
          className="mt-1 flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 active:cursor-grabbing"
          aria-label="Drag to reorder or change stage"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <QueueCardContent item={item} canRemove={canRemove} onRemove={onRemove} />
      </div>
    </div>
  );
}
