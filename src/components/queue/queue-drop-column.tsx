"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { QueueCardContent } from "@/components/queue/queue-card-content";
import { queueDropId } from "@/components/queue/queue-drop-utils";
import { SortableQueueCard } from "@/components/queue/sortable-queue-card";
import { formatProjectAmount, getProjectEstimateValue } from "@/lib/project-format";
import type { DesignQueueItem, EstimatingQueueItem, QueueKind } from "@/lib/queue/types";
import { cn } from "@/lib/utils";

interface QueueDropColumnProps {
  kind: QueueKind;
  stageId: string;
  title: string;
  items: (DesignQueueItem | EstimatingQueueItem)[];
  canDrag?: boolean;
  canRemove?: boolean;
  onRemoveProject?: (projectId: string) => void;
}

export function QueueDropColumn({
  kind,
  stageId,
  title,
  items,
  canDrag = true,
  canRemove,
  onRemoveProject,
}: QueueDropColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: queueDropId(kind, stageId),
    disabled: !canDrag,
    data: { type: "queue-column", kind, stage: stageId },
  });

  const itemIds = items.map((item) => item.project.id);

  const totalEstimateAmount = useMemo(() => {
    if (kind !== "estimating") return 0;
    return items.reduce(
      (sum, item) => sum + (getProjectEstimateValue(item.project) ?? 0),
      0,
    );
  }, [kind, items]);

  return (
    <div className="flex w-[min(78vw,220px)] shrink-0 snap-start flex-col border-r border-slate-200 last:border-r-0 sm:w-[248px]">
      <div className="flex items-center justify-between border-b bg-slate-50 px-2.5 py-2.5 sm:px-3">
        <h3 className="truncate text-xs font-semibold text-slate-900 sm:text-sm">{title}</h3>
        <span className="ml-1 shrink-0 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-1.5 p-1.5 transition-colors sm:gap-2 sm:p-2",
          isOver && canDrag && "bg-emerald-50 ring-2 ring-inset ring-emerald-400",
        )}
      >
        {items.length === 0 ? (
          <div
            className={cn(
              "flex min-h-[80px] flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 px-2 text-center text-[10px] text-slate-400",
              isOver && canDrag && "border-emerald-300 bg-emerald-50/50 text-emerald-600",
            )}
          >
            Drop here
          </div>
        ) : (
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {items.map((item) =>
              canDrag ? (
                <SortableQueueCard
                  key={item.project.id}
                  item={item}
                  canDrag
                  canRemove={canRemove}
                  onRemove={onRemoveProject ? () => onRemoveProject(item.project.id) : undefined}
                />
              ) : (
                <QueueCardContent key={item.project.id} item={item} />
              ),
            )}
          </SortableContext>
        )}
      </div>
      {kind === "estimating" && (
        <div className="border-t bg-slate-100/80 px-2.5 py-2 sm:px-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Total estimate amount
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {formatProjectAmount(totalEstimateAmount)}
          </p>
        </div>
      )}
    </div>
  );
}
